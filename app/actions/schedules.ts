"use server";

import { revalidatePath } from "next/cache";

import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";
import { timeStringToDate } from "@/lib/salons/schedules";

function stringValue(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

export interface BusinessHoursItem {
	dayOfWeek: number;
	openTime: string;
	closeTime: string;
	isOpen: boolean;
}

export async function updateBusinessHours(
	hoursList: BusinessHoursItem[],
	slug: string,
) {
	const { salon } = await requireSalonOwner(slug);

	// Validate time ordering for open days
	for (const item of hoursList) {
		if (item.isOpen) {
			if (!item.openTime || !item.closeTime) {
				return { error: "Las horas de apertura y cierre son obligatorias" };
			}
			if (item.openTime >= item.closeTime) {
				return {
					error:
						"La hora de apertura debe ser estrictamente anterior a la hora de cierre",
				};
			}
		}
	}

	try {
		for (const item of hoursList) {
			const openTimeDate = timeStringToDate(item.openTime || "09:00");
			const closeTimeDate = timeStringToDate(item.closeTime || "18:00");

			await prisma.businessHours.upsert({
				where: {
					salonId_dayOfWeek: {
						salonId: salon.id,
						dayOfWeek: item.dayOfWeek,
					},
				},
				create: {
					salonId: salon.id,
					dayOfWeek: item.dayOfWeek,
					openTime: openTimeDate,
					closeTime: closeTimeDate,
					isOpen: item.isOpen,
				},
				update: {
					openTime: openTimeDate,
					closeTime: closeTimeDate,
					isOpen: item.isOpen,
				},
			});
		}

		revalidatePath(`/s/${slug}/schedules`);
		revalidatePath(`/s/${slug}/settings`);
		return { success: true };
	} catch {
		return { error: "Error al actualizar los horarios del salón." };
	}
}

export interface SpecialistHoursItem {
	dayOfWeek: number;
	openTime: string;
	closeTime: string;
	isAvailable: boolean;
}

export async function updateSpecialistHours(
	specialistId: string,
	hoursList: SpecialistHoursItem[],
	slug: string,
) {
	const { salon } = await requireSalonOwner(slug);

	// Verify specialist belongs to salon
	const specialist = await prisma.specialist.findFirst({
		where: { id: specialistId, salonId: salon.id },
	});
	if (!specialist) return { error: "Especialista no encontrado." };

	for (const item of hoursList) {
		if (item.isAvailable) {
			if (!item.openTime || !item.closeTime) {
				return { error: "Las horas de apertura y cierre son obligatorias" };
			}
			if (item.openTime >= item.closeTime) {
				return {
					error:
						"La hora de apertura debe ser estrictamente anterior a la hora de cierre",
				};
			}
		}
	}

	try {
		for (const item of hoursList) {
			const openTimeDate = timeStringToDate(item.openTime || "09:00");
			const closeTimeDate = timeStringToDate(item.closeTime || "18:00");

			await prisma.specialistHours.upsert({
				where: {
					specialistId_dayOfWeek: {
						specialistId,
						dayOfWeek: item.dayOfWeek,
					},
				},
				create: {
					salonId: salon.id,
					specialistId,
					dayOfWeek: item.dayOfWeek,
					openTime: openTimeDate,
					closeTime: closeTimeDate,
					isAvailable: item.isAvailable,
				},
				update: {
					openTime: openTimeDate,
					closeTime: closeTimeDate,
					isAvailable: item.isAvailable,
				},
			});
		}

		revalidatePath(`/s/${slug}/schedules`);
		revalidatePath(`/s/${slug}/specialists`);
		return { success: true };
	} catch {
		return { error: "Error al actualizar los horarios del especialista." };
	}
}

export async function addBlockedDate(formData: FormData, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	const dateStr = stringValue(formData, "date");
	if (!dateStr) return { error: "La fecha es obligatoria" };

	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return { error: "Fecha no válida" };

	const specialistId = stringValue(formData, "specialistId") || null;
	const reason = stringValue(formData, "reason") || null;

	if (specialistId) {
		const validSpec = await prisma.specialist.findFirst({
			where: { id: specialistId, salonId: salon.id },
		});
		if (!validSpec) return { error: "Especialista no válido." };
	}

	try {
		const blockedDate = await prisma.blockedDate.create({
			data: {
				salonId: salon.id,
				specialistId,
				date,
				reason,
			},
		});

		revalidatePath(`/s/${slug}/schedules`);
		return { success: true, blockedDate };
	} catch {
		return { error: "Error al registrar el bloqueo de fecha." };
	}
}

export async function deleteBlockedDate(blockedDateId: string, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	try {
		const deleted = await prisma.blockedDate.deleteMany({
			where: { id: blockedDateId, salonId: salon.id },
		});

		if (deleted.count === 0)
			return { error: "Bloqueo de fecha no encontrado." };

		revalidatePath(`/s/${slug}/schedules`);
		return { success: true };
	} catch {
		return { error: "Error al eliminar el bloqueo de fecha." };
	}
}

export async function addBlockedSlot(formData: FormData, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	const dateStr = stringValue(formData, "date");
	if (!dateStr) return { error: "La fecha es obligatoria" };

	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return { error: "Fecha no válida" };

	const startTimeStr = stringValue(formData, "startTime");
	const endTimeStr = stringValue(formData, "endTime");

	if (!startTimeStr || !endTimeStr) {
		return { error: "Las horas de inicio y fin son obligatorias" };
	}

	if (startTimeStr >= endTimeStr) {
		return { error: "La hora de inicio debe ser anterior a la hora de fin" };
	}

	const specialistId = stringValue(formData, "specialistId") || null;
	const reason = stringValue(formData, "reason") || null;

	if (specialistId) {
		const validSpec = await prisma.specialist.findFirst({
			where: { id: specialistId, salonId: salon.id },
		});
		if (!validSpec) return { error: "Especialista no válido." };
	}

	try {
		const blockedSlot = await prisma.blockedSlot.create({
			data: {
				salonId: salon.id,
				specialistId,
				date,
				startTime: timeStringToDate(startTimeStr),
				endTime: timeStringToDate(endTimeStr),
				reason,
			},
		});

		revalidatePath(`/s/${slug}/schedules`);
		return { success: true, blockedSlot };
	} catch {
		return { error: "Error al registrar el bloqueo de horario." };
	}
}

export async function deleteBlockedSlot(blockedSlotId: string, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	try {
		const deleted = await prisma.blockedSlot.deleteMany({
			where: { id: blockedSlotId, salonId: salon.id },
		});

		if (deleted.count === 0)
			return { error: "Bloqueo de horario no encontrado." };

		revalidatePath(`/s/${slug}/schedules`);
		return { success: true };
	} catch {
		return { error: "Error al eliminar el bloqueo de horario." };
	}
}
