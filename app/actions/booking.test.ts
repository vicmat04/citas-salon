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
	salonFindUnique: vi.fn(),
	transaction: vi.fn(),
	enqueue: vi.fn(),
	dispatchEvent: vi.fn(),
	after: vi.fn(),
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
vi.mock("@/lib/notifications/enqueue", () => ({
	enqueueAppointmentNotification: mocks.enqueue,
}));
vi.mock("@/lib/notifications/dispatcher", () => ({
	dispatchEvent: mocks.dispatchEvent,
}));
vi.mock("@/lib/db", () => ({
	default: {
		$transaction: mocks.transaction,
		customer: {
			findFirst: mocks.customerFindFirst,
			create: mocks.customerCreate,
			update: mocks.customerUpdate,
		},
		appointment: { create: mocks.appointmentCreate },
		salon: { findUnique: mocks.salonFindUnique },
	},
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/server", () => ({ after: mocks.after }));

import { createPublicAppointment, getAvailableSlotsAction } from "./booking";

function form(values: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

const validBooking = {
	customerName: "Carlos Gomez",
	customerEmail: "carlos@example.com",
	customerPhone: "+507 60001122",
	date: "2028-06-15",
	startTime: "09:00",
	serviceIds: "s1",
	specialistId: "any",
	customerNotes: "Prefiero tono natural",
};

describe("booking server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireOperationalPublicSalon.mockResolvedValue({
			id: "salon-1",
			slug: "demo",
		});
		mocks.getAvailableSlots.mockResolvedValue({ slots: ["09:00", "10:00"] });
		mocks.getCandidateSpecialists.mockResolvedValue([
			{ id: "spec-1", name: "Ana", email: "ana@example.com" },
		]);
		mocks.calculateServicesTotalDuration.mockResolvedValue({
			totalDurationMinutes: 45,
			totalPrice: 25,
			services: [{ id: "s1", name: "Corte", price: 25, durationMinutes: 45 }],
		});
		mocks.customerFindFirst.mockResolvedValue(null);
		mocks.customerCreate.mockResolvedValue({
			id: "cust-1",
			fullName: "Carlos Gomez",
			email: "carlos@example.com",
		});
		mocks.appointmentCreate.mockResolvedValue({ id: "appt-123" });
		mocks.salonFindUnique.mockResolvedValue({
			name: "Salón Demo",
			timezone: "America/Panama",
			ownerEmailNotificationsEnabled: true,
			owner: { email: "owner@example.com" },
		});
		mocks.enqueue.mockResolvedValue({ id: "event-created" });
		mocks.transaction.mockImplementation(async (callback) =>
			callback({
				customer: {
					findFirst: mocks.customerFindFirst,
					create: mocks.customerCreate,
					update: mocks.customerUpdate,
				},
				appointment: { create: mocks.appointmentCreate },
				salon: { findUnique: mocks.salonFindUnique },
			}),
		);
		mocks.after.mockImplementation((callback) => callback());
		mocks.dispatchEvent.mockResolvedValue({
			eventId: "event-created",
			sent: 0,
			failed: 0,
		});
	});

	describe("getAvailableSlotsAction", () => {
		it("returns empty slots if date or services are missing", async () => {
			await expect(getAvailableSlotsAction("demo", "", [])).resolves.toEqual({
				success: true,
				slots: [],
			});
		});
	});

	describe("createPublicAppointment", () => {
		it("accepts a missing email but rejects a supplied invalid email", async () => {
			const missing = await createPublicAppointment(
				form({ ...validBooking, customerEmail: "" }),
				"demo",
			);
			expect(missing.success).toBe(true);

			const invalid = await createPublicAppointment(
				form({ ...validBooking, customerEmail: "bad-email" }),
				"demo",
			);
			expect(invalid).toEqual({
				error: "Por favor ingresa un correo electrónico válido",
			});
		});

		it("creates appointment and outbox event in one transaction, then dispatches after commit", async () => {
			const result = await createPublicAppointment(form(validBooking), "demo");

			expect(result).toEqual({
				success: true,
				appointmentId: "appt-123",
				notification: { state: "queued" },
			});
			expect(mocks.transaction).toHaveBeenCalledOnce();
			expect(mocks.enqueue).toHaveBeenCalledWith(
				expect.objectContaining({ appointment: expect.anything() }),
				expect.objectContaining({
					type: "created",
					appointmentId: "appt-123",
					clientEmail: "carlos@example.com",
					ownerEmail: "owner@example.com",
					specialistEmail: "ana@example.com",
				}),
			);
			expect(mocks.after).toHaveBeenCalledOnce();
			expect(mocks.dispatchEvent).toHaveBeenCalledWith("event-created");
		});

		it("keeps the confirmed booking successful when background email dispatch fails", async () => {
			mocks.dispatchEvent.mockRejectedValue(new Error("gmail unavailable"));

			const result = await createPublicAppointment(form(validBooking), "demo");

			expect(result).toEqual({
				success: true,
				appointmentId: "appt-123",
				notification: { state: "queued" },
			});
		});

		it("does not enqueue or dispatch when appointment creation fails", async () => {
			mocks.appointmentCreate.mockRejectedValue(new Error("db failure"));

			const result = await createPublicAppointment(form(validBooking), "demo");

			expect(result.error).toContain("Ocurrió un error");
			expect(mocks.enqueue).not.toHaveBeenCalled();
			expect(mocks.after).not.toHaveBeenCalled();
			expect(mocks.dispatchEvent).not.toHaveBeenCalled();
		});
	});
});
