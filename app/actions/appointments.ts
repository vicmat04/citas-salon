"use server";

import { revalidatePath } from "next/cache";

import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";
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

export async function updateAppointmentStatus(
	appointmentId: string,
	status: string,
	internalNotes?: string,
	cancellationReason?: string,
	slug: string = "",
) {
	const { salon } = await requireSalonOwner(slug);

	const allowedStatuses = [
		"pending",
		"confirmed",
		"completed",
		"cancelled",
		"no_show",
	];
	if (!allowedStatuses.includes(status)) {
		return { error: "Estado de cita no válido" };
	}

	const existing = await prisma.appointment.findFirst({
		where: { id: appointmentId, salonId: salon.id },
	});

	if (!existing) {
		return { error: "Cita no encontrada o no pertenece a este salón." };
	}

	let finalNotes =
		internalNotes !== undefined ? internalNotes : existing.internalNotes || "";

	if (status === "cancelled" && cancellationReason) {
		const reasonPrefix = `[Motivo Cancelación]: ${cancellationReason}`;
		finalNotes = finalNotes ? `${finalNotes}\n${reasonPrefix}` : reasonPrefix;
	}

	try {
		await prisma.appointment.update({
			where: { id: appointmentId },
			data: {
				status,
				internalNotes: finalNotes || null,
			},
		});

		revalidatePath(`/s/${slug}/appointments`);
		revalidatePath(`/s/${slug}/dashboard`);
		revalidatePath(`/book/${slug}`);
		return { success: true };
	} catch {
		return { error: "Error al actualizar el estado de la cita." };
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

	const customerEmail = stringValue(formData, "customerEmail") || null;
	if (customerEmail && !customerEmail.includes("@")) {
		return { error: "El correo electrónico no es válido" };
	}

	const dateStr = stringValue(formData, "date");
	const startTimeStr = stringValue(formData, "startTime");
	if (!dateStr || !startTimeStr) {
		return { error: "La fecha y hora de la cita son obligatorias" };
	}

	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return { error: "Fecha no válida" };

	const serviceIdsRaw = stringValue(formData, "serviceIds");
	const serviceIds = serviceIdsRaw
		? serviceIdsRaw.split(",").filter(Boolean)
		: [];
	if (serviceIds.length === 0) {
		return { error: "Debes seleccionar al menos un servicio" };
	}

	const requestedSpecialistId = stringValue(formData, "specialistId") || "any";
	const customerNotes = stringValue(formData, "customerNotes") || null;
	const internalNotes = stringValue(formData, "internalNotes") || null;
	const allowOverlap = formData.get("allowOverlap") === "true";

	// Check availability
	const availability = await getAvailableSlots(
		salon.id,
		date,
		serviceIds,
		requestedSpecialistId,
	);
	const isSlotFree = availability.slots.includes(startTimeStr);

	if (!isSlotFree && !allowOverlap) {
		return {
			warning: true,
			message:
				"El horario seleccionado solapa con otra cita activa del especialista o está fuera de horario. Marca la casilla de confirmación para forzar el agendamiento.",
		};
	}

	// Resolve specialist
	const candidates = await getCandidateSpecialists(
		salon.id,
		serviceIds,
		requestedSpecialistId,
	);
	const assignedSpecialist = candidates[0];
	if (!assignedSpecialist && !allowOverlap) {
		return {
			error: "No hay especialista disponible para los servicios seleccionados.",
		};
	}

	// Fallback specialist if forced overlap and no candidate found
	let finalSpecialistId = assignedSpecialist?.id;
	if (!finalSpecialistId) {
		const firstSpec = await prisma.specialist.findFirst({
			where: { salonId: salon.id, isActive: true },
		});
		if (!firstSpec)
			return { error: "El salón debe tener al menos un especialista activo." };
		finalSpecialistId = firstSpec.id;
	}

	// Compute duration & price
	const { totalDurationMinutes, totalPrice, services } =
		await calculateServicesTotalDuration(serviceIds);

	const startTimeDate = timeStringToDate(startTimeStr);
	const [startHours, startMinutes] = startTimeStr.split(":").map(Number);
	const totalEndMinutes = startHours * 60 + startMinutes + totalDurationMinutes;
	const endHours = Math.floor(totalEndMinutes / 60);
	const endMinutes = totalEndMinutes % 60;
	const endTimeStr = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
	const endTimeDate = timeStringToDate(endTimeStr);

	try {
		// 1. Find or create Customer record for salon
		let customer = await prisma.customer.findFirst({
			where: {
				salonId: salon.id,
				OR: [
					{ phone: customerPhone },
					...(customerEmail ? [{ email: customerEmail }] : []),
				],
			},
		});

		if (customer) {
			customer = await prisma.customer.update({
				where: { id: customer.id },
				data: {
					fullName: customerName,
					phone: customerPhone,
					...(customerEmail ? { email: customerEmail } : {}),
				},
			});
		} else {
			customer = await prisma.customer.create({
				data: {
					salonId: salon.id,
					fullName: customerName,
					email: customerEmail,
					phone: customerPhone,
				},
			});
		}

		// 2. Create Appointment
		const appointment = await prisma.appointment.create({
			data: {
				salonId: salon.id,
				customerId: customer.id,
				specialistId: finalSpecialistId,
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
					create: services.map((s) => ({
						serviceId: s.id,
						priceSnapshot: s.price,
						durationSnapshot: s.durationMinutes,
					})),
				},
			},
		});

		revalidatePath(`/s/${slug}/appointments`);
		revalidatePath(`/s/${slug}/dashboard`);
		revalidatePath(`/book/${slug}`);
		return { success: true, appointmentId: appointment.id };
	} catch {
		return { error: "Error al registrar la cita manual." };
	}
}
