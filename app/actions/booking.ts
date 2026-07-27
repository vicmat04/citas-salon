"use server";

import { revalidatePath } from "next/cache";

import {
	calculateServicesTotalDuration,
	getAvailableSlots,
	getCandidateSpecialists,
} from "@/lib/salons/availability";
import { requireOperationalPublicSalon } from "@/lib/salons/lifecycle";
import prisma from "@/lib/db";
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

	const customerEmail = stringValue(formData, "customerEmail");
	if (!customerEmail || !customerEmail.includes("@")) {
		return { error: "Por favor ingresa un correo electrónico válido" };
	}

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

	const serviceIdsRaw = stringValue(formData, "serviceIds");
	const serviceIds = serviceIdsRaw
		? serviceIdsRaw.split(",").filter(Boolean)
		: [];
	if (serviceIds.length === 0) {
		return { error: "Debes seleccionar al menos un servicio" };
	}

	const requestedSpecialistId = stringValue(formData, "specialistId") || "any";
	const customerNotes = stringValue(formData, "customerNotes") || null;

	// Re-verify availability for slot
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

	// Resolve assigned specialist
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

	// Compute total duration & price
	const { totalDurationMinutes, totalPrice, services } =
		await calculateServicesTotalDuration(serviceIds);

	// Construct startTime Date objects
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
				OR: [{ email: customerEmail }, { phone: customerPhone }],
			},
		});

		if (customer) {
			customer = await prisma.customer.update({
				where: { id: customer.id },
				data: {
					fullName: customerName,
					phone: customerPhone,
					email: customerEmail,
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

		// 2. Create Appointment in status 'confirmed'
		const appointment = await prisma.appointment.create({
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
					create: services.map((s) => ({
						serviceId: s.id,
						priceSnapshot: s.price,
						durationSnapshot: s.durationMinutes,
					})),
				},
			},
		});

		revalidatePath(`/book/${slug}`);
		revalidatePath(`/${slug}`);
		return { success: true, appointmentId: appointment.id };
	} catch {
		return {
			error:
				"Ocurrió un error al registrar tu cita. Por favor intenta de nuevo.",
		};
	}
}
