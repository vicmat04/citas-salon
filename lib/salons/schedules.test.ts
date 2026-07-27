import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	specialistHoursFindUnique: vi.fn(),
	businessHoursFindUnique: vi.fn(),
	blockedDateFindFirst: vi.fn(),
	blockedSlotFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	default: {
		specialistHours: { findUnique: mocks.specialistHoursFindUnique },
		businessHours: { findUnique: mocks.businessHoursFindUnique },
		blockedDate: { findFirst: mocks.blockedDateFindFirst },
		blockedSlot: { findMany: mocks.blockedSlotFindMany },
	},
}));

import {
	dateToTimeString,
	isSlotBlocked,
	resolveEffectiveSpecialistSchedule,
	timeStringToDate,
} from "./schedules";

describe("schedules logic helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("converts time string to Date and back", () => {
		const d = timeStringToDate("14:30");
		expect(dateToTimeString(d)).toBe("14:30");
	});

	describe("resolveEffectiveSpecialistSchedule", () => {
		it("uses SpecialistHours if explicit record exists", async () => {
			mocks.specialistHoursFindUnique.mockResolvedValue({
				isAvailable: true,
				openTime: timeStringToDate("10:00"),
				closeTime: timeStringToDate("16:00"),
			});

			const schedule = await resolveEffectiveSpecialistSchedule(
				"salon-1",
				"spec-1",
				1,
			);
			expect(schedule).toEqual({
				source: "specialist",
				isAvailable: true,
				openTime: "10:00",
				closeTime: "16:00",
			});
		});

		it("falls back to salon BusinessHours if no SpecialistHours exists", async () => {
			mocks.specialistHoursFindUnique.mockResolvedValue(null);
			mocks.businessHoursFindUnique.mockResolvedValue({
				isOpen: true,
				openTime: timeStringToDate("08:00"),
				closeTime: timeStringToDate("19:00"),
			});

			const schedule = await resolveEffectiveSpecialistSchedule(
				"salon-1",
				"spec-1",
				1,
			);
			expect(schedule).toEqual({
				source: "salon",
				isAvailable: true,
				openTime: "08:00",
				closeTime: "19:00",
			});
		});

		it("falls back to default 09:00 - 18:00 if neither exists", async () => {
			mocks.specialistHoursFindUnique.mockResolvedValue(null);
			mocks.businessHoursFindUnique.mockResolvedValue(null);

			const schedule = await resolveEffectiveSpecialistSchedule(
				"salon-1",
				"spec-1",
				1,
			);
			expect(schedule).toEqual({
				source: "default",
				isAvailable: true,
				openTime: "09:00",
				closeTime: "18:00",
			});
		});
	});

	describe("isSlotBlocked", () => {
		it("detects full-day date block", async () => {
			const testDate = new Date("2026-12-25");
			mocks.blockedDateFindFirst.mockResolvedValue({
				reason: "Navidad - Cerrado",
			});

			const result = await isSlotBlocked("salon-1", testDate, "10:00");
			expect(result).toEqual({ isBlocked: true, reason: "Navidad - Cerrado" });
		});

		it("detects partial time slot block", async () => {
			const testDate = new Date("2026-08-10");
			mocks.blockedDateFindFirst.mockResolvedValue(null);
			mocks.blockedSlotFindMany.mockResolvedValue([
				{
					startTime: timeStringToDate("13:00"),
					endTime: timeStringToDate("14:00"),
					reason: "Almuerzo equipo",
				},
			]);

			const resultBlocked = await isSlotBlocked(
				"salon-1",
				testDate,
				"13:30",
				"spec-1",
			);
			expect(resultBlocked).toEqual({
				isBlocked: true,
				reason: "Almuerzo equipo",
			});

			const resultFree = await isSlotBlocked(
				"salon-1",
				testDate,
				"15:00",
				"spec-1",
			);
			expect(resultFree).toEqual({ isBlocked: false, reason: null });
		});
	});
});
