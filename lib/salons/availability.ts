import prisma from "@/lib/db";
import {
	dateToTimeString,
	resolveEffectiveSpecialistSchedule,
	timeStringToDate,
} from "@/lib/salons/schedules";

export interface AvailableSlotResult {
	slots: string[];
	assignedSpecialistId?: string;
}

/**
 * Calculates total duration in minutes (durations + buffers) for a list of service IDs.
 */
export async function calculateServicesTotalDuration(
	serviceIds: string[],
	salonId?: string,
): Promise<{
	totalDurationMinutes: number;
	totalPrice: number;
	services: {
		id: string;
		name: string;
		price: number;
		durationMinutes: number;
	}[];
}> {
	if (serviceIds.length === 0) {
		return { totalDurationMinutes: 0, totalPrice: 0, services: [] };
	}

	const dbServices = await prisma.service.findMany({
		where: { id: { in: serviceIds }, ...(salonId ? { salonId } : {}) },
	});

	let totalDurationMinutes = 0;
	let totalPrice = 0;
	const servicesList: {
		id: string;
		name: string;
		price: number;
		durationMinutes: number;
	}[] = [];

	for (const srv of dbServices) {
		const priceNum =
			typeof srv.price === "object" && "toNumber" in srv.price
				? srv.price.toNumber()
				: Number(srv.price);
		totalDurationMinutes += srv.durationMinutes + (srv.bufferMinutes || 0);
		totalPrice += priceNum;
		servicesList.push({
			id: srv.id,
			name: srv.name,
			price: priceNum,
			durationMinutes: srv.durationMinutes,
		});
	}

	return { totalDurationMinutes, totalPrice, services: servicesList };
}

/**
 * Finds candidate specialists who are active and perform ALL requested service IDs.
 */
export async function getCandidateSpecialists(
	salonId: string,
	serviceIds: string[],
	requestedSpecialistId?: string,
): Promise<Array<{ id: string; name: string; email: string | null }>> {
	if (requestedSpecialistId && requestedSpecialistId !== "any") {
		const spec = await prisma.specialist.findFirst({
			where: { id: requestedSpecialistId, salonId, isActive: true },
			select: {
				id: true,
				name: true,
				email: true,
				specialistServices: { select: { serviceId: true } },
			},
		});
		if (!spec) return [];
		const offeredIds = new Set(
			spec.specialistServices.map((item) => item.serviceId),
		);
		return serviceIds.every((id) => offeredIds.has(id))
			? [{ id: spec.id, name: spec.name, email: spec.email }]
			: [];
	}

	const activeSpecialists = await prisma.specialist.findMany({
		where: { salonId, isActive: true },
		include: {
			specialistServices: { select: { serviceId: true } },
		},
	});

	const eligible =
		serviceIds.length === 0
			? activeSpecialists
			: activeSpecialists.filter((spec) => {
					const offeredIds = new Set(
						spec.specialistServices.map((ss) => ss.serviceId),
					);
					return serviceIds.every((id) => offeredIds.has(id));
				});
	return eligible.map((spec) => ({
		id: spec.id,
		name: spec.name,
		email: spec.email,
	}));
}

/**
 * Calculates available starting time slots for a given salon, date, services, and optional specialist.
 */
export async function getAvailableSlots(
	salonId: string,
	date: Date,
	serviceIds: string[],
	requestedSpecialistId?: string,
	excludeAppointmentId?: string,
): Promise<AvailableSlotResult> {
	const { totalDurationMinutes } = await calculateServicesTotalDuration(
		serviceIds,
		salonId,
	);
	if (totalDurationMinutes === 0) return { slots: [] };

	const candidates = await getCandidateSpecialists(
		salonId,
		serviceIds,
		requestedSpecialistId,
	);
	if (candidates.length === 0) return { slots: [] };

	const salon = await prisma.salon.findUnique({
		where: { id: salonId },
		select: { bookingRangeDays: true, minAdvanceHours: true },
	});

	const minAdvanceHours = salon?.minAdvanceHours || 0;
	const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

	// Calculate cutoff time if booking for today
	const now = new Date();
	const isToday =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();

	const cutoffTime = isToday
		? new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000)
		: null;

	const availableSlotsSet = new Set<string>();

	for (const spec of candidates) {
		// 1. Check full day block for salon or specialist
		const fullDayBlock = await prisma.blockedDate.findFirst({
			where: {
				salonId,
				date,
				OR: [{ specialistId: null }, { specialistId: spec.id }],
			},
		});
		if (fullDayBlock) continue;

		// 2. Resolve schedule for day of week
		const schedule = await resolveEffectiveSpecialistSchedule(
			salonId,
			spec.id,
			dayOfWeek,
		);
		if (!schedule.isAvailable) continue;

		const openTimeDate = timeStringToDate(schedule.openTime);
		const closeTimeDate = timeStringToDate(schedule.closeTime);

		// 3. Fetch blocked slots for day
		const blockedSlots = await prisma.blockedSlot.findMany({
			where: {
				salonId,
				date,
				OR: [{ specialistId: null }, { specialistId: spec.id }],
			},
		});

		// 4. Fetch existing non-cancelled appointments for specialist on date
		const existingAppointments = await prisma.appointment.findMany({
			where: {
				salonId,
				specialistId: spec.id,
				...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
				status: { not: "cancelled" },
				startTime: {
					gte: new Date(
						date.getFullYear(),
						date.getMonth(),
						date.getDate(),
						0,
						0,
						0,
					),
					lt: new Date(
						date.getFullYear(),
						date.getMonth(),
						date.getDate() + 1,
						0,
						0,
						0,
					),
				},
			},
		});

		// Step slots in 30-minute intervals
		const slotStepMinutes = 30;
		let currentSlot = new Date(openTimeDate.getTime());

		while (
			currentSlot.getTime() + totalDurationMinutes * 60 * 1000 <=
			closeTimeDate.getTime()
		) {
			const slotTimeStr = dateToTimeString(currentSlot);

			// If today, enforce minAdvanceHours
			if (isToday && cutoffTime) {
				const slotDateTime = new Date(
					date.getFullYear(),
					date.getMonth(),
					date.getDate(),
					currentSlot.getHours(),
					currentSlot.getMinutes(),
				);
				if (slotDateTime < cutoffTime) {
					currentSlot = new Date(
						currentSlot.getTime() + slotStepMinutes * 60 * 1000,
					);
					continue;
				}
			}

			const slotStartMs = currentSlot.getTime();
			const slotEndMs = slotStartMs + totalDurationMinutes * 60 * 1000;

			// Check overlap with BlockedSlots
			let isBlockedBySlot = false;
			for (const block of blockedSlots) {
				const blockStartMs = block.startTime.getTime();
				const blockEndMs = block.endTime.getTime();
				if (slotStartMs < blockEndMs && slotEndMs > blockStartMs) {
					isBlockedBySlot = true;
					break;
				}
			}

			if (isBlockedBySlot) {
				currentSlot = new Date(
					currentSlot.getTime() + slotStepMinutes * 60 * 1000,
				);
				continue;
			}

			// Check overlap with existing appointments
			let isBlockedByAppt = false;
			for (const appt of existingAppointments) {
				const apptOpenTime = timeStringToDate(dateToTimeString(appt.startTime));
				const apptCloseTime = timeStringToDate(dateToTimeString(appt.endTime));
				const apptStartMs = apptOpenTime.getTime();
				const apptEndMs = apptCloseTime.getTime();

				if (slotStartMs < apptEndMs && slotEndMs > apptStartMs) {
					isBlockedByAppt = true;
					break;
				}
			}

			if (!isBlockedByAppt) {
				availableSlotsSet.add(slotTimeStr);
			}

			currentSlot = new Date(
				currentSlot.getTime() + slotStepMinutes * 60 * 1000,
			);
		}
	}

	const sortedSlots = Array.from(availableSlotsSet).sort();
	return {
		slots: sortedSlots,
		assignedSpecialistId: candidates[0]?.id,
	};
}
