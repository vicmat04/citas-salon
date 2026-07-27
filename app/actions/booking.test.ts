import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireOperationalPublicSalon: vi.fn(),
	getAvailableSlots: vi.fn(),
	getCandidateSpecialists: vi.fn(),
	calculateServicesTotalDuration: vi.fn(),
	customerFindFirst: vi.fn(),
	customerCreate: vi.fn(),
	customerUpdate: vi.fn(),
	appointmentCreate: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/salons/lifecycle", () => ({
	requireOperationalPublicSalon: mocks.requireOperationalPublicSalon,
}));
vi.mock("@/lib/salons/availability", () => ({
	getAvailableSlots: mocks.getAvailableSlots,
	getCandidateSpecialists: mocks.getCandidateSpecialists,
	calculateServicesTotalDuration: mocks.calculateServicesTotalDuration,
}));
vi.mock("@/lib/db", () => ({
	default: {
		customer: {
			findFirst: mocks.customerFindFirst,
			create: mocks.customerCreate,
			update: mocks.customerUpdate,
		},
		appointment: { create: mocks.appointmentCreate },
	},
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createPublicAppointment, getAvailableSlotsAction } from "./booking";

function form(values: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

describe("booking server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireOperationalPublicSalon.mockResolvedValue({
			id: "salon-1",
			slug: "demo",
		});
		mocks.getAvailableSlots.mockResolvedValue({
			slots: ["09:00", "10:00"],
			assignedSpecialistId: "spec-1",
		});
		mocks.getCandidateSpecialists.mockResolvedValue([
			{ id: "spec-1", name: "Ana" },
		]);
		mocks.calculateServicesTotalDuration.mockResolvedValue({
			totalDurationMinutes: 45,
			totalPrice: 25,
			services: [{ id: "s1", name: "Corte", price: 25, durationMinutes: 45 }],
		});
		mocks.customerFindFirst.mockResolvedValue(null);
		mocks.customerCreate.mockResolvedValue({
			id: "cust-1",
			fullName: "Carlos",
		});
		mocks.appointmentCreate.mockResolvedValue({ id: "appt-123" });
	});

	describe("getAvailableSlotsAction", () => {
		it("returns empty slots if date or services are missing", async () => {
			const result = await getAvailableSlotsAction("demo", "", []);
			expect(result).toEqual({ success: true, slots: [] });
		});

		it("returns calculated slots for operational salon", async () => {
			const result = await getAvailableSlotsAction("demo", "2028-06-15", [
				"s1",
			]);
			expect(result).toEqual({ success: true, slots: ["09:00", "10:00"] });
		});
	});

	describe("createPublicAppointment", () => {
		it("validates customer data", async () => {
			const result = await createPublicAppointment(
				form({
					customerName: "A",
					customerEmail: "bad-email",
					customerPhone: "123",
				}),
				"demo",
			);
			expect(result.error).toBe("El nombre del cliente es obligatorio");
		});

		it("creates customer and confirmed appointment when slot is available", async () => {
			const result = await createPublicAppointment(
				form({
					customerName: "Carlos Gomez",
					customerEmail: "carlos@example.com",
					customerPhone: "+507 60001122",
					date: "2028-06-15",
					startTime: "09:00",
					serviceIds: "s1",
					specialistId: "any",
					customerNotes: "Prefiero tono natural",
				}),
				"demo",
			);

			expect(result).toEqual({ success: true, appointmentId: "appt-123" });
			expect(mocks.customerCreate).toHaveBeenCalledWith({
				data: {
					salonId: "salon-1",
					fullName: "Carlos Gomez",
					email: "carlos@example.com",
					phone: "+507 60001122",
				},
			});
			expect(mocks.appointmentCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						salonId: "salon-1",
						customerId: "cust-1",
						specialistId: "spec-1",
						status: "confirmed",
						source: "public_form",
						totalPriceSnapshot: 25,
						totalDurationMinutes: 45,
					}),
				}),
			);
		});
	});
});
