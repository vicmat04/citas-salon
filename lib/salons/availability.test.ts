import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	serviceFindMany: vi.fn(),
	specialistFindFirst: vi.fn(),
	specialistFindMany: vi.fn(),
	salonFindUnique: vi.fn(),
	blockedDateFindFirst: vi.fn(),
	blockedSlotFindMany: vi.fn(),
	appointmentFindMany: vi.fn(),
	specialistHoursFindUnique: vi.fn(),
	businessHoursFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	default: {
		service: { findMany: mocks.serviceFindMany },
		specialist: {
			findFirst: mocks.specialistFindFirst,
			findMany: mocks.specialistFindMany,
		},
		salon: { findUnique: mocks.salonFindUnique },
		blockedDate: { findFirst: mocks.blockedDateFindFirst },
		blockedSlot: { findMany: mocks.blockedSlotFindMany },
		appointment: { findMany: mocks.appointmentFindMany },
		specialistHours: { findUnique: mocks.specialistHoursFindUnique },
		businessHours: { findUnique: mocks.businessHoursFindUnique },
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
		mocks.specialistHoursFindUnique.mockResolvedValue(null);
		mocks.businessHoursFindUnique.mockResolvedValue({
			isOpen: true,
			openTime: timeStringToDate("09:00"),
			closeTime: timeStringToDate("12:00"),
		});
		mocks.blockedDateFindFirst.mockResolvedValue(null);
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

	it("calculates available start time slots excluding existing appointments", async () => {
		mocks.specialistFindFirst.mockResolvedValue({
			id: "spec-1",
			isActive: true,
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
});
