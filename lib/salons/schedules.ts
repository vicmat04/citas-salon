import prisma from "@/lib/db";

export interface BusinessHoursInput {
	dayOfWeek: number; // 0 (Domingo) - 6 (Sábado)
	openTime: string; // "09:00"
	closeTime: string; // "18:00"
	isOpen: boolean;
}

export interface SpecialistHoursInput {
	dayOfWeek: number;
	openTime: string;
	closeTime: string;
	isAvailable: boolean;
}

/**
 * Converts a time string "HH:mm" to a Date object set to epoch 1970-01-01 for DB Time columns.
 */
export function timeStringToDate(timeStr: string): Date {
	const [hours, minutes] = timeStr.split(":").map(Number);
	const d = new Date(1970, 0, 1, hours || 0, minutes || 0, 0);
	return d;
}

/**
 * Formats a Date object from DB Time column back to "HH:mm".
 */
export function dateToTimeString(d: Date): string {
	const hours = String(d.getHours()).padStart(2, "0");
	const minutes = String(d.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
}

/**
 * Resolves effective schedule for a specialist on a specific day of week.
 * If SpecialistHours exists for that day, uses it; otherwise falls back to Salon BusinessHours.
 */
export async function resolveEffectiveSpecialistSchedule(
	salonId: string,
	specialistId: string,
	dayOfWeek: number,
) {
	const specHours = await prisma.specialistHours.findUnique({
		where: {
			specialistId_dayOfWeek: { specialistId, dayOfWeek },
		},
	});

	if (specHours) {
		return {
			source: "specialist" as const,
			isAvailable: specHours.isAvailable,
			openTime: dateToTimeString(specHours.openTime),
			closeTime: dateToTimeString(specHours.closeTime),
		};
	}

	const busHours = await prisma.businessHours.findUnique({
		where: {
			salonId_dayOfWeek: { salonId, dayOfWeek },
		},
	});

	if (busHours) {
		return {
			source: "salon" as const,
			isAvailable: busHours.isOpen,
			openTime: dateToTimeString(busHours.openTime),
			closeTime: dateToTimeString(busHours.closeTime),
		};
	}

	// Default fallback if no business hours configured in DB yet
	return {
		source: "default" as const,
		isAvailable: true,
		openTime: "09:00",
		closeTime: "18:00",
	};
}

/**
 * Checks if a specific date and time is blocked for a specialist or full salon.
 */
export async function isSlotBlocked(
	salonId: string,
	date: Date,
	timeStr: string,
	specialistId?: string,
) {
	// Check full-day date block (BlockedDate)
	const fullDayBlock = await prisma.blockedDate.findFirst({
		where: {
			salonId,
			date,
			OR: [
				{ specialistId: null }, // Full salon block
				...(specialistId ? [{ specialistId }] : []),
			],
		},
	});

	if (fullDayBlock) {
		return { isBlocked: true, reason: fullDayBlock.reason || "Día bloqueado" };
	}

	// Check time-slot block (BlockedSlot)
	const targetTime = timeStringToDate(timeStr);
	const slotBlocks = await prisma.blockedSlot.findMany({
		where: {
			salonId,
			date,
			OR: [{ specialistId: null }, ...(specialistId ? [{ specialistId }] : [])],
		},
	});

	for (const block of slotBlocks) {
		if (targetTime >= block.startTime && targetTime < block.endTime) {
			return {
				isBlocked: true,
				reason: block.reason || "Horario bloqueado por compromiso",
			};
		}
	}

	return { isBlocked: false, reason: null };
}
