import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireSalonOwner: vi.fn(),
	businessHoursUpsert: vi.fn(),
	specialistFindFirst: vi.fn(),
	specialistHoursUpsert: vi.fn(),
	blockedDateCreate: vi.fn(),
	blockedDateDeleteMany: vi.fn(),
	blockedSlotCreate: vi.fn(),
	blockedSlotDeleteMany: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", () => ({
	requireSalonOwner: mocks.requireSalonOwner,
}));
vi.mock("@/lib/db", () => ({
	default: {
		businessHours: { upsert: mocks.businessHoursUpsert },
		specialist: { findFirst: mocks.specialistFindFirst },
		specialistHours: { upsert: mocks.specialistHoursUpsert },
		blockedDate: {
			create: mocks.blockedDateCreate,
			deleteMany: mocks.blockedDateDeleteMany,
		},
		blockedSlot: {
			create: mocks.blockedSlotCreate,
			deleteMany: mocks.blockedSlotDeleteMany,
		},
	},
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
	addBlockedDate,
	addBlockedSlot,
	updateBusinessHours,
	updateSpecialistHours,
} from "./schedules";

function form(values: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

describe("schedules server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireSalonOwner.mockResolvedValue({
			salon: { id: "salon-1", slug: "demo" },
		});
		mocks.specialistFindFirst.mockResolvedValue({
			id: "spec-1",
			salonId: "salon-1",
		});
		mocks.blockedDateCreate.mockResolvedValue({ id: "bd-1" });
		mocks.blockedDateDeleteMany.mockResolvedValue({ count: 1 });
		mocks.blockedSlotCreate.mockResolvedValue({ id: "bs-1" });
		mocks.blockedSlotDeleteMany.mockResolvedValue({ count: 1 });
	});

	describe("updateBusinessHours", () => {
		it("validates openTime before closeTime", async () => {
			const invalid = [
				{ dayOfWeek: 1, openTime: "18:00", closeTime: "09:00", isOpen: true },
			];
			const result = await updateBusinessHours(invalid, "demo");
			expect(result).toEqual({
				error:
					"La hora de apertura debe ser estrictamente anterior a la hora de cierre",
			});
		});

		it("upserts valid business hours", async () => {
			const valid = [
				{ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", isOpen: true },
				{ dayOfWeek: 0, openTime: "09:00", closeTime: "18:00", isOpen: false },
			];
			const result = await updateBusinessHours(valid, "demo");
			expect(result).toEqual({ success: true });
			expect(mocks.businessHoursUpsert).toHaveBeenCalledTimes(2);
		});
	});

	describe("updateSpecialistHours", () => {
		it("validates specialist belongs to salon", async () => {
			mocks.specialistFindFirst.mockResolvedValue(null);
			const result = await updateSpecialistHours("spec-invalid", [], "demo");
			expect(result).toEqual({ error: "Especialista no encontrado." });
		});
	});

	describe("blocked dates & slots", () => {
		it("creates a blocked date", async () => {
			const result = await addBlockedDate(
				form({ date: "2026-12-25", reason: "Navidad" }),
				"demo",
			);
			expect(result.success).toBe(true);
			expect(mocks.blockedDateCreate).toHaveBeenCalled();
		});

		it("creates a blocked time slot with validation", async () => {
			const invalidResult = await addBlockedSlot(
				form({ date: "2026-08-10", startTime: "15:00", endTime: "10:00" }),
				"demo",
			);
			expect(invalidResult).toEqual({
				error: "La hora de inicio debe ser anterior a la hora de fin",
			});

			const validResult = await addBlockedSlot(
				form({
					date: "2026-08-10",
					startTime: "13:00",
					endTime: "14:00",
					reason: "Compromiso",
				}),
				"demo",
			);
			expect(validResult.success).toBe(true);
			expect(mocks.blockedSlotCreate).toHaveBeenCalled();
		});
	});
});
