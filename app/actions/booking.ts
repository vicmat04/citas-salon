"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

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
import { requireOperationalPublicSalon } from "@/lib/salons/lifecycle";
import { timeStringToDate } from "@/lib/salons/schedules";

function stringValue(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

export async function getAvailableSlotsAction(
	slug: string,
	dateStr: string,
	serviceIds: string[],
	specialistId?: string,
) {
	const salon = await requireOperationalPublicSalon(slug);
	if (!dateStr || serviceIds.length === 0) return { success: true, slots: [] };

	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return { error: "Fecha no válida" };

	const result = await getAvailableSlots(
		salon.id,
		date,
		serviceIds,
		specialistId,
	);
	return { success: true, slots: result.slots };
}

export async function createPublicAppointment(
	formData: FormData,
	slug: string,
) {
	const salon = await requireOperationalPublicSalon(slug);
	const customerName = stringValue(formData, "customerName");
	if (!customerName || customerName.length < 2) {
		return { error: "El nombre del cliente es obligatorio" };
	}

	const suppliedEmail = stringValue(formData, "customerEmail");
	const emailValidation = suppliedEmail ? validateEmail(suppliedEmail) : null;
	if (emailValidation && !emailValidation.valid) {
		return { error: "Por favor ingresa un correo electrónico válido" };
	}
	const customerEmail = emailValidation?.valid
		? emailValidation.normalized
		: null;

	const customerPhone = stringValue(formData, "customerPhone");
	if (!customerPhone || customerPhone.length < 7) {
		return {
			error: "Por favor ingresa un número de teléfono válido (WhatsApp)",
		};
	}

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
	if (serviceIds.length === 0) {
		return { error: "Debes seleccionar al menos un servicio" };
	}
	const requestedSpecialistId = stringValue(formData, "specialistId") || "any";
	const customerNotes = stringValue(formData, "customerNotes") || null;

	const availability = await getAvailableSlots(
		salon.id,
		date,
		serviceIds,
		requestedSpecialistId,
	);
	if (!availability.slots.includes(startTimeStr)) {
		return {
			error:
				"El horario seleccionado ya no se encuentra disponible. Por favor elige otro.",
		};
	}

	const candidates = await getCandidateSpecialists(
		salon.id,
		serviceIds,
		requestedSpecialistId,
	);
	const assignedSpecialist = candidates[0];
	if (!assignedSpecialist) {
		return {
			error: "No hay especialista disponible para los servicios seleccionados.",
		};
	}

	const { totalDurationMinutes, totalPrice, services } =
		await calculateServicesTotalDuration(serviceIds);
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
					source: "public_form",
					appointmentDate: date,
					startTime: startTimeDate,
					endTime: endTimeDate,
					totalPriceSnapshot: totalPrice,
					totalDurationMinutes,
					customerNotes,
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
		revalidatePath(`/book/${slug}`);
		revalidatePath(`/${slug}`);
		return {
			success: true,
			appointmentId: committed.appointmentId,
			notification: { state: "queued" as const },
		};
	} catch {
		return {
			error:
				"Ocurrió un error al registrar tu cita. Por favor intenta de nuevo.",
		};
	}
}
