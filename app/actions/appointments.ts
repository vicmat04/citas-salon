"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";
import { buildAppointmentSnapshot } from "@/lib/notifications/appointment-snapshot";
import { dispatchEvent } from "@/lib/notifications/dispatcher";
import { validateEmail } from "@/lib/notifications/email-validation";
import { enqueueAppointmentNotification } from "@/lib/notifications/enqueue";
import {
	calculateServicesTotalDuration,
	getAvailableSlots,
	getCandidateSpecialists,
} from "@/lib/salons/availability";
import { timeStringToDate } from "@/lib/salons/schedules";

function stringValue(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

function revalidateAppointmentPaths(slug: string) {
	revalidatePath(`/s/${slug}/appointments`);
	revalidatePath(`/s/${slug}/dashboard`);
	revalidatePath(`/book/${slug}`);
}

export async function updateAppointmentStatus(
	appointmentId: string,
	status: string,
	internalNotes?: string,
	cancellationReason?: string,
	slug: string = "",
) {
	const { salon } = await requireSalonOwner(slug);
	if (
		!["pending", "confirmed", "completed", "cancelled", "no_show"].includes(
			status,
		)
	) {
		return { error: "Estado de cita no válido" };
	}

	try {
		const result = await prisma.$transaction(async (tx) => {
			const existing = await tx.appointment.findFirst({
				where: { id: appointmentId, salonId: salon.id },
			});
			if (!existing) {
				return {
					error: "Cita no encontrada o no pertenece a este salón.",
				} as const;
			}

			const finalNotesBase =
				internalNotes !== undefined
					? internalNotes
					: existing.internalNotes || "";
			if (status !== "cancelled") {
				await tx.appointment.update({
					where: { id: appointmentId },
					data: { status, internalNotes: finalNotesBase || null },
				});
				return { success: true } as const;
			}
			if (existing.status !== "pending" && existing.status !== "confirmed") {
				return { error: "Solo una cita activa puede cancelarse." } as const;
			}

			const publicReason = cancellationReason?.trim() || null;
			const reasonLine = publicReason
				? `[Motivo Cancelación]: ${publicReason}`
				: "";
			const finalNotes = reasonLine
				? finalNotesBase
					? `${finalNotesBase}\n${reasonLine}`
					: reasonLine
				: finalNotesBase;
			const changed = await tx.appointment.updateMany({
				where: {
					id: appointmentId,
					salonId: salon.id,
					status: { in: ["pending", "confirmed"] },
				},
				data: {
					status: "cancelled",
					internalNotes: finalNotes || null,
					notificationRevision: { increment: 1 },
				},
			});
			if (changed.count !== 1) {
				return { error: "Solo una cita activa puede cancelarse." } as const;
			}

			const appointment = await tx.appointment.findUniqueOrThrow({
				where: { id: appointmentId },
				include: {
					customer: { select: { fullName: true, email: true } },
					specialist: { select: { name: true, email: true } },
					appointmentServices: {
						include: { service: { select: { name: true } } },
					},
					salon: {
						select: {
							name: true,
							timezone: true,
							ownerEmailNotificationsEnabled: true,
							owner: { select: { email: true } },
						},
					},
				},
			});
			const event = await enqueueAppointmentNotification(tx, {
				salonId: salon.id,
				appointmentId,
				type: "cancelled",
				notificationRevision: appointment.notificationRevision,
				payload: buildAppointmentSnapshot({
					salonName: appointment.salon.name,
					timezone: appointment.salon.timezone,
					customerName: appointment.customer?.fullName || "Cliente",
					appointmentDate: appointment.appointmentDate,
					startTime: appointment.startTime,
					endTime: appointment.endTime,
					services: appointment.appointmentServices.map((item) => ({
						name: item.service?.name || "Servicio",
						price: item.priceSnapshot,
					})),
					specialistName: appointment.specialist?.name,
					total: appointment.totalPriceSnapshot,
					cancellationReason: publicReason,
				}),
				clientEmail: appointment.customer?.email,
				ownerEmail: appointment.salon.owner.email,
				ownerEmailNotificationsEnabled:
					appointment.salon.ownerEmailNotificationsEnabled,
				specialistEmail: appointment.specialist?.email,
				hasSpecialist: Boolean(appointment.specialist),
			});
			return { success: true, eventId: event.id } as const;
		});

		if ("error" in result) return result;
		if ("eventId" in result && result.eventId) {
			const eventId = result.eventId;
			after(() =>
				dispatchEvent(eventId)
					.then(() => undefined)
					.catch(() => undefined),
			);
		}
		revalidateAppointmentPaths(slug);
		return "eventId" in result
			? { success: true, notification: { state: "queued" as const } }
			: { success: true };
	} catch {
		return { error: "Error al actualizar el estado de la cita." };
	}
}

export async function rescheduleAppointment(
	appointmentId: string,
	formData: FormData,
	slug: string,
) {
	const { salon } = await requireSalonOwner(slug);
	const dateValue = stringValue(formData, "date");
	const startTimeValue = stringValue(formData, "startTime");
	const serviceIds = Array.from(
		new Set(stringValue(formData, "serviceIds").split(",").filter(Boolean)),
	);
	const requestedSpecialistId = stringValue(formData, "specialistId");
	const allowOverlap = formData.get("allowOverlap") === "true";
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
		return { error: "Fecha no válida" };
	}
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTimeValue)) {
		return { error: "Hora no válida" };
	}
	if (serviceIds.length === 0) {
		return { error: "Debes seleccionar al menos un servicio" };
	}
	if (!requestedSpecialistId || requestedSpecialistId === "any") {
		return { error: "Debes seleccionar un especialista" };
	}
	const date = new Date(`${dateValue}T00:00:00`);
	if (Number.isNaN(date.getTime())) return { error: "Fecha no válida" };

	const existing = await prisma.appointment.findFirst({
		where: { id: appointmentId, salonId: salon.id },
		include: {
			customer: { select: { fullName: true, email: true } },
			salon: {
				select: {
					name: true,
					timezone: true,
					ownerEmailNotificationsEnabled: true,
					owner: { select: { email: true } },
				},
			},
		},
	});
	if (!existing) {
		return { error: "Cita no encontrada o no pertenece a este salón." };
	}
	if (existing.status !== "pending" && existing.status !== "confirmed") {
		return { error: "Solo una cita activa puede reprogramarse." };
	}

	const availability = await getAvailableSlots(
		salon.id,
		date,
		serviceIds,
		requestedSpecialistId,
		appointmentId,
	);
	if (!availability.slots.includes(startTimeValue) && !allowOverlap) {
		return {
			warning: true,
			message:
				"El horario seleccionado solapa con otra cita activa del especialista o está fuera de horario. Confirma para forzar la reprogramación.",
		};
	}
	const candidates = await getCandidateSpecialists(
		salon.id,
		serviceIds,
		requestedSpecialistId,
	);
	const specialist = candidates[0];
	if (!specialist) {
		return { error: "El especialista seleccionado no está disponible." };
	}
	const calculated = await calculateServicesTotalDuration(serviceIds, salon.id);
	if (calculated.services.length !== serviceIds.length) {
		return { error: "Uno o más servicios no pertenecen a este salón." };
	}
	const startTime = timeStringToDate(startTimeValue);
	const [hours, minutes] = startTimeValue.split(":").map(Number);
	const endMinutes = hours * 60 + minutes + calculated.totalDurationMinutes;
	if (endMinutes >= 24 * 60)
		return { error: "La cita excede el día seleccionado." };
	const endTime = timeStringToDate(
		`${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`,
	);
	const snapshotStartTime = new Date(Date.UTC(1970, 0, 1, hours, minutes));
	const snapshotEndTime = new Date(
		Date.UTC(1970, 0, 1, Math.floor(endMinutes / 60), endMinutes % 60),
	);
	const nextRevision = existing.scheduleRevision + 1;

	try {
		const committed = await prisma.$transaction(async (tx) => {
			const changed = await tx.appointment.updateMany({
				where: {
					id: appointmentId,
					salonId: salon.id,
					status: { in: ["pending", "confirmed"] },
					scheduleRevision: existing.scheduleRevision,
				},
				data: {
					appointmentDate: date,
					startTime,
					endTime,
					specialistId: specialist.id,
					totalPriceSnapshot: calculated.totalPrice,
					totalDurationMinutes: calculated.totalDurationMinutes,
					scheduleRevision: { increment: 1 },
				},
			});
			if (changed.count !== 1) {
				return {
					error: "La cita cambió; actualiza la agenda e inténtalo de nuevo.",
				} as const;
			}
			await tx.appointmentService.deleteMany({ where: { appointmentId } });
			await tx.appointmentService.createMany({
				data: calculated.services.map((service) => ({
					appointmentId,
					serviceId: service.id,
					priceSnapshot: service.price,
					durationSnapshot: service.durationMinutes,
				})),
			});
			await tx.appointmentNotificationDelivery.updateMany({
				where: {
					status: "pending",
					event: {
						appointmentId,
						type: "reminder_24h",
						scheduleRevision: { not: nextRevision },
					},
				},
				data: {
					status: "skipped",
					resultCode: "appointment_rescheduled",
					recipientEmail: null,
				},
			});
			await tx.appointmentNotificationEvent.updateMany({
				where: {
					appointmentId,
					type: "reminder_24h",
					scheduleRevision: { not: nextRevision },
					status: { in: ["pending", "processing"] },
					deliveries: {
						none: { status: { in: ["pending", "sending"] } },
					},
				},
				data: { status: "completed", completedAt: new Date() },
			});
			const event = await enqueueAppointmentNotification(tx, {
				salonId: salon.id,
				appointmentId,
				type: "rescheduled",
				scheduleRevision: nextRevision,
				payload: buildAppointmentSnapshot({
					salonName: existing.salon.name,
					timezone: existing.salon.timezone,
					customerName: existing.customer?.fullName || "Cliente",
					appointmentDate: date,
					startTime: snapshotStartTime,
					endTime: snapshotEndTime,
					services: calculated.services.map((service) => ({
						name: service.name,
						price: service.price,
					})),
					specialistName: specialist.name,
					total: calculated.totalPrice,
				}),
				clientEmail: existing.customer?.email,
				ownerEmail: existing.salon.owner.email,
				ownerEmailNotificationsEnabled:
					existing.salon.ownerEmailNotificationsEnabled,
				specialistEmail: specialist.email,
				hasSpecialist: true,
			});
			return { eventId: event.id } as const;
		});
		if ("error" in committed) return committed;
		after(() =>
			dispatchEvent(committed.eventId)
				.then(() => undefined)
				.catch(() => undefined),
		);
		revalidateAppointmentPaths(slug);
		return { success: true, notification: { state: "queued" as const } };
	} catch {
		return { error: "Error al reprogramar la cita." };
	}
}

export async function createManualAppointment(
	formData: FormData,
	slug: string,
) {
	const { salon } = await requireSalonOwner(slug);
	const customerName = stringValue(formData, "customerName");
	if (!customerName || customerName.length < 2) {
		return { error: "El nombre del cliente es obligatorio" };
	}
	const customerPhone = stringValue(formData, "customerPhone");
	if (!customerPhone || customerPhone.length < 7) {
		return {
			error: "El teléfono del cliente es obligatorio (mínimo 7 caracteres)",
		};
	}
	const suppliedEmail = stringValue(formData, "customerEmail");
	const emailValidation = suppliedEmail ? validateEmail(suppliedEmail) : null;
	if (emailValidation && !emailValidation.valid) {
		return { error: "El correo electrónico no es válido" };
	}
	const customerEmail = emailValidation?.valid
		? emailValidation.normalized
		: null;

	const dateStr = stringValue(formData, "date");
	const startTimeStr = stringValue(formData, "startTime");
	if (!dateStr || !startTimeStr) {
		return { error: "La fecha y hora de la cita son obligatorias" };
	}
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return { error: "Fecha no válida" };
	const serviceIds = stringValue(formData, "serviceIds")
		.split(",")
		.filter(Boolean);
	if (serviceIds.length === 0)
		return { error: "Debes seleccionar al menos un servicio" };

	const requestedSpecialistId = stringValue(formData, "specialistId") || "any";
	const customerNotes = stringValue(formData, "customerNotes") || null;
	const internalNotes = stringValue(formData, "internalNotes") || null;
	const allowOverlap = formData.get("allowOverlap") === "true";
	const availability = await getAvailableSlots(
		salon.id,
		date,
		serviceIds,
		requestedSpecialistId,
	);
	if (!availability.slots.includes(startTimeStr) && !allowOverlap) {
		return {
			warning: true,
			message:
				"El horario seleccionado solapa con otra cita activa del especialista o está fuera de horario. Marca la casilla de confirmación para forzar el agendamiento.",
		};
	}

	const candidates = await getCandidateSpecialists(
		salon.id,
		serviceIds,
		requestedSpecialistId,
	);
	let assignedSpecialist = candidates[0];
	if (!assignedSpecialist && !allowOverlap) {
		return {
			error: "No hay especialista disponible para los servicios seleccionados.",
		};
	}
	if (!assignedSpecialist) {
		const fallbackSpecialist = await prisma.specialist.findFirst({
			where: { salonId: salon.id, isActive: true },
		});
		if (!fallbackSpecialist) {
			return { error: "El salón debe tener al menos un especialista activo." };
		}
		assignedSpecialist = fallbackSpecialist;
	}

	const { totalDurationMinutes, totalPrice, services } =
		await calculateServicesTotalDuration(serviceIds, salon.id);
	const startTimeDate = timeStringToDate(startTimeStr);
	const [startHours, startMinutes] = startTimeStr.split(":").map(Number);
	const totalEndMinutes = startHours * 60 + startMinutes + totalDurationMinutes;
	const endTimeDate = timeStringToDate(
		`${String(Math.floor(totalEndMinutes / 60)).padStart(2, "0")}:${String(totalEndMinutes % 60).padStart(2, "0")}`,
	);

	try {
		const committed = await prisma.$transaction(async (tx) => {
			const notificationSalon = await tx.salon.findUnique({
				where: { id: salon.id },
				select: {
					name: true,
					timezone: true,
					ownerEmailNotificationsEnabled: true,
					owner: { select: { email: true } },
				},
			});
			if (!notificationSalon) throw new Error("Salon not found");
			let customer = await tx.customer.findFirst({
				where: {
					salonId: salon.id,
					OR: [
						{ phone: customerPhone },
						...(customerEmail ? [{ email: customerEmail }] : []),
					],
				},
			});
			if (customer) {
				customer = await tx.customer.update({
					where: { id: customer.id },
					data: {
						fullName: customerName,
						phone: customerPhone,
						...(customerEmail ? { email: customerEmail } : {}),
					},
				});
			} else {
				customer = await tx.customer.create({
					data: {
						salonId: salon.id,
						fullName: customerName,
						email: customerEmail,
						phone: customerPhone,
					},
				});
			}
			const appointment = await tx.appointment.create({
				data: {
					salonId: salon.id,
					customerId: customer.id,
					specialistId: assignedSpecialist.id,
					status: "confirmed",
					source: "owner_panel",
					appointmentDate: date,
					startTime: startTimeDate,
					endTime: endTimeDate,
					totalPriceSnapshot: totalPrice,
					totalDurationMinutes,
					customerNotes,
					internalNotes,
					appointmentServices: {
						create: services.map((service) => ({
							serviceId: service.id,
							priceSnapshot: service.price,
							durationSnapshot: service.durationMinutes,
						})),
					},
				},
			});
			const event = await enqueueAppointmentNotification(tx, {
				salonId: salon.id,
				appointmentId: appointment.id,
				type: "created",
				payload: buildAppointmentSnapshot({
					salonName: notificationSalon.name,
					timezone: notificationSalon.timezone,
					customerName,
					appointmentDate: date,
					startTime: startTimeDate,
					endTime: endTimeDate,
					services: services.map((service) => ({
						name: service.name,
						price: service.price,
					})),
					specialistName: assignedSpecialist.name,
					total: totalPrice,
				}),
				clientEmail: customer.email,
				ownerEmail: notificationSalon.owner.email,
				ownerEmailNotificationsEnabled:
					notificationSalon.ownerEmailNotificationsEnabled,
				specialistEmail: assignedSpecialist.email,
				hasSpecialist: true,
			});
			return { appointmentId: appointment.id, eventId: event.id };
		});

		after(() =>
			dispatchEvent(committed.eventId)
				.then(() => undefined)
				.catch(() => undefined),
		);
		revalidateAppointmentPaths(slug);
		return {
			success: true,
			appointmentId: committed.appointmentId,
			notification: { state: "queued" as const },
		};
	} catch {
		return { error: "Error al registrar la cita manual." };
	}
}
