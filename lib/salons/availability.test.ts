import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	serviceFindMany: vi.fn(),
	specialistFindFirst: vi.fn(),
	specialistFindMany: vi.fn(),
	salonFindUnique: vi.fn(),
	blockedDateFindMany: vi.fn(),
	blockedSlotFindMany: vi.fn(),
	appointmentFindMany: vi.fn(),
	specialistHoursFindMany: vi.fn(),
	businessHoursFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	default: {
		service: { findMany: mocks.serviceFindMany },
		specialist: {
			findFirst: mocks.specialistFindFirst,
			findMany: mocks.specialistFindMany,
		},
		salon: { findUnique: mocks.salonFindUnique },
		blockedDate: { findMany: mocks.blockedDateFindMany },
		blockedSlot: { findMany: mocks.blockedSlotFindMany },
		appointment: { findMany: mocks.appointmentFindMany },
		specialistHours: { findMany: mocks.specialistHoursFindMany },
		businessHours: { findMany: mocks.businessHoursFindMany },
	},
}));

import {
	calculateServicesTotalDuration,
	getAvailableSlots,
	getCandidateSpecialists,
} from "./availability";
import { timeStringToDate } from "./schedules";

describe("availability calculation engine", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.salonFindUnique.mockResolvedValue({
			bookingRangeDays: 15,
			minAdvanceHours: 1,
		});
		mocks.specialistHoursFindMany.mockResolvedValue([]);
		mocks.businessHoursFindMany.mockResolvedValue([
			{
				dayOfWeek: 4,
				isOpen: true,
				openTime: timeStringToDate("09:00"),
				closeTime: timeStringToDate("12:00"),
			},
		]);
		mocks.blockedDateFindMany.mockResolvedValue([]);
		mocks.blockedSlotFindMany.mockResolvedValue([]);
		mocks.appointmentFindMany.mockResolvedValue([]);
	});

	it("calculates total duration and price for multi-service list", async () => {
		mocks.serviceFindMany.mockResolvedValue([
			{
				id: "s1",
				name: "Corte",
				price: 15,
				durationMinutes: 30,
				bufferMinutes: 10,
			},
			{
				id: "s2",
				name: "Barba",
				price: 10,
				durationMinutes: 20,
				bufferMinutes: 0,
			},
		]);

		const result = await calculateServicesTotalDuration(["s1", "s2"]);
		expect(result.totalDurationMinutes).toBe(60); // (30+10) + (20+0)
		expect(result.totalPrice).toBe(25);
	});

	it("filters candidate specialists offering all requested services", async () => {
		mocks.specialistFindMany.mockResolvedValue([
			{
				id: "spec-1",
				isActive: true,
				specialistServices: [{ serviceId: "s1" }, { serviceId: "s2" }],
			},
			{
				id: "spec-2",
				isActive: true,
				specialistServices: [{ serviceId: "s1" }],
			},
		]);

		const candidates = await getCandidateSpecialists("salon-1", ["s1", "s2"]);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].id).toBe("spec-1");
	});

	it("rejects an explicitly requested specialist missing a selected service", async () => {
		mocks.specialistFindFirst.mockResolvedValue({
			id: "spec-1",
			isActive: true,
			specialistServices: [{ serviceId: "s1" }],
		});

		const candidates = await getCandidateSpecialists(
			"salon-1",
			["s1", "s2"],
			"spec-1",
		);

		expect(candidates).toEqual([]);
		expect(mocks.specialistFindFirst).toHaveBeenCalledWith({
			where: { id: "spec-1", salonId: "salon-1", isActive: true },
			select: {
				id: true,
				name: true,
				email: true,
				specialistServices: { select: { serviceId: true } },
			},
		});
	});

	it("calculates available start time slots excluding existing appointments", async () => {
		mocks.specialistFindFirst.mockResolvedValue({
			id: "spec-1",
			isActive: true,
			specialistServices: [{ serviceId: "s1" }],
		});
		mocks.serviceFindMany.mockResolvedValue([
			{
				id: "s1",
				name: "Corte",
				price: 15,
				durationMinutes: 30,
				bufferMinutes: 0,
			},
		]);
		mocks.specialistFindMany.mockResolvedValue([
			{
				id: "spec-1",
				isActive: true,
				specialistServices: [{ serviceId: "s1" }],
			},
		]);
		// Existing appointment from 09:30 to 10:00
		mocks.appointmentFindMany.mockResolvedValue([
			{
				specialistId: "spec-1",
				startTime: timeStringToDate("09:30"),
				endTime: timeStringToDate("10:00"),
			},
		]);

		// Future date (local time)
		const futureDate = new Date(2028, 5, 15);
		const result = await getAvailableSlots(
			"salon-1",
			futureDate,
			["s1"],
			"spec-1",
		);

		// Between 09:00 and 12:00, 30min slots: 09:00, 09:30 (blocked), 10:00, 10:30, 11:00, 11:30
		expect(result.slots).toContain("09:00");
		expect(result.slots).not.toContain("09:30");
		expect(result.slots).toContain("10:00");
	});

	it("excludes the appointment being rescheduled from overlap detection", async () => {
		mocks.specialistFindFirst.mockResolvedValue({
			id: "spec-1",
			isActive: true,
			specialistServices: [{ serviceId: "s1" }],
		});
		mocks.serviceFindMany.mockResolvedValue([
			{
				id: "s1",
				name: "Corte",
				price: 15,
				durationMinutes: 30,
				bufferMinutes: 0,
			},
		]);
		mocks.appointmentFindMany.mockResolvedValue([]);

		const result = await getAvailableSlots(
			"salon-1",
			new Date(2028, 5, 15),
			["s1"],
			"spec-1",
			"appt-1",
		);

		expect(result.slots).toContain("09:30");
		expect(mocks.appointmentFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					salonId: "salon-1",
					specialistId: { in: ["spec-1"] },
					id: { not: "appt-1" },
				}),
			}),
		);
		expect(mocks.businessHoursFindMany).toHaveBeenCalledTimes(1);
		expect(mocks.specialistHoursFindMany).toHaveBeenCalledTimes(1);
		expect(mocks.blockedDateFindMany).toHaveBeenCalledTimes(1);
		expect(mocks.blockedSlotFindMany).toHaveBeenCalledTimes(1);
		expect(mocks.appointmentFindMany).toHaveBeenCalledTimes(1);
	});
});
