import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireSalonOwner: vi.fn(),
	appointmentFindFirst: vi.fn(),
	appointmentUpdate: vi.fn(),
	appointmentCreate: vi.fn(),
	getAvailableSlots: vi.fn(),
	getCandidateSpecialists: vi.fn(),
	calculateServicesTotalDuration: vi.fn(),
	customerFindFirst: vi.fn(),
	customerCreate: vi.fn(),
	customerUpdate: vi.fn(),
	specialistFindFirst: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", () => ({
	requireSalonOwner: mocks.requireSalonOwner,
}));
vi.mock("@/lib/salons/availability", () => ({
	getAvailableSlots: mocks.getAvailableSlots,
	getCandidateSpecialists: mocks.getCandidateSpecialists,
	calculateServicesTotalDuration: mocks.calculateServicesTotalDuration,
}));
vi.mock("@/lib/db", () => ({
	default: {
		appointment: {
			findFirst: mocks.appointmentFindFirst,
			update: mocks.appointmentUpdate,
			create: mocks.appointmentCreate,
		},
		customer: {
			findFirst: mocks.customerFindFirst,
			create: mocks.customerCreate,
			update: mocks.customerUpdate,
		},
		specialist: { findFirst: mocks.specialistFindFirst },
	},
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
	createManualAppointment,
	updateAppointmentStatus,
} from "./appointments";

function form(values: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

describe("appointments server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireSalonOwner.mockResolvedValue({
			salon: { id: "salon-1", slug: "demo" },
		});
		mocks.appointmentFindFirst.mockResolvedValue({
			id: "appt-1",
			salonId: "salon-1",
			status: "confirmed",
			internalNotes: "Nota previa",
		});
		mocks.appointmentUpdate.mockResolvedValue({
			id: "appt-1",
			status: "completed",
		});
		mocks.getAvailableSlots.mockResolvedValue({
			slots: ["09:00", "10:00"],
			assignedSpecialistId: "spec-1",
		});
		mocks.getCandidateSpecialists.mockResolvedValue([
			{ id: "spec-1", name: "Ana" },
		]);
		mocks.calculateServicesTotalDuration.mockResolvedValue({
			totalDurationMinutes: 30,
			totalPrice: 15,
			services: [{ id: "s1", name: "Corte", price: 15, durationMinutes: 30 }],
		});
		mocks.customerFindFirst.mockResolvedValue(null);
		mocks.customerCreate.mockResolvedValue({ id: "cust-1" });
		mocks.appointmentCreate.mockResolvedValue({ id: "appt-999" });
	});

	describe("updateAppointmentStatus", () => {
		it("validates status value", async () => {
			const result = await updateAppointmentStatus(
				"appt-1",
				"invalid_status",
				"",
				"",
				"demo",
			);
			expect(result).toEqual({ error: "Estado de cita no válido" });
		});

		it("updates status to completed successfully", async () => {
			const result = await updateAppointmentStatus(
				"appt-1",
				"completed",
				"Nota final",
				"",
				"demo",
			);
			expect(result).toEqual({ success: true });
			expect(mocks.appointmentUpdate).toHaveBeenCalledWith({
				where: { id: "appt-1" },
				data: { status: "completed", internalNotes: "Nota final" },
			});
		});

		it("appends cancellation reason when cancelled", async () => {
			const result = await updateAppointmentStatus(
				"appt-1",
				"cancelled",
				"Nota previa",
				"Cliente viajó",
				"demo",
			);
			expect(result).toEqual({ success: true });
			expect(mocks.appointmentUpdate).toHaveBeenCalledWith({
				where: { id: "appt-1" },
				data: {
					status: "cancelled",
					internalNotes: "Nota previa\n[Motivo Cancelación]: Cliente viajó",
				},
			});
		});
	});

	describe("createManualAppointment", () => {
		it("returns warning when slot overlaps and allowOverlap is false", async () => {
			mocks.getAvailableSlots.mockResolvedValue({ slots: ["14:00"] }); // 09:00 is not free

			const result = await createManualAppointment(
				form({
					customerName: "Pedro",
					customerPhone: "60001122",
					date: "2028-06-15",
					startTime: "09:00",
					serviceIds: "s1",
					allowOverlap: "false",
				}),
				"demo",
			);

			expect(result.warning).toBe(true);
			expect(result.message).toContain("El horario seleccionado solapa");
			expect(mocks.appointmentCreate).not.toHaveBeenCalled();
		});

		it("creates appointment when allowOverlap is true despite overlap", async () => {
			mocks.getAvailableSlots.mockResolvedValue({ slots: ["14:00"] }); // 09:00 is not free

			const result = await createManualAppointment(
				form({
					customerName: "Pedro",
					customerPhone: "60001122",
					date: "2028-06-15",
					startTime: "09:00",
					serviceIds: "s1",
					allowOverlap: "true",
				}),
				"demo",
			);

			expect(result).toEqual({ success: true, appointmentId: "appt-999" });
			expect(mocks.appointmentCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						salonId: "salon-1",
						status: "confirmed",
						source: "owner_panel",
					}),
				}),
			);
		});
	});
});
