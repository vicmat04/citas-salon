import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireSalonOwner: vi.fn(),
	appointmentFindFirst: vi.fn(),
	appointmentFindUniqueOrThrow: vi.fn(),
	appointmentUpdate: vi.fn(),
	appointmentUpdateMany: vi.fn(),
	appointmentCreate: vi.fn(),
	appointmentServiceDeleteMany: vi.fn(),
	appointmentServiceCreateMany: vi.fn(),
	deliveryUpdateMany: vi.fn(),
	eventUpdateMany: vi.fn(),
	getAvailableSlots: vi.fn(),
	getCandidateSpecialists: vi.fn(),
	calculateServicesTotalDuration: vi.fn(),
	customerFindFirst: vi.fn(),
	customerCreate: vi.fn(),
	customerUpdate: vi.fn(),
	specialistFindFirst: vi.fn(),
	salonFindUnique: vi.fn(),
	transaction: vi.fn(),
	enqueue: vi.fn(),
	dispatchEvent: vi.fn(),
	after: vi.fn(),
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
vi.mock("@/lib/notifications/enqueue", () => ({
	enqueueAppointmentNotification: mocks.enqueue,
}));
vi.mock("@/lib/notifications/dispatcher", () => ({
	dispatchEvent: mocks.dispatchEvent,
}));
vi.mock("@/lib/db", () => ({
	default: {
		$transaction: mocks.transaction,
		appointment: {
			findFirst: mocks.appointmentFindFirst,
			findUniqueOrThrow: mocks.appointmentFindUniqueOrThrow,
			update: mocks.appointmentUpdate,
			updateMany: mocks.appointmentUpdateMany,
			create: mocks.appointmentCreate,
		},
		appointmentService: {
			deleteMany: mocks.appointmentServiceDeleteMany,
			createMany: mocks.appointmentServiceCreateMany,
		},
		appointmentNotificationDelivery: { updateMany: mocks.deliveryUpdateMany },
		appointmentNotificationEvent: { updateMany: mocks.eventUpdateMany },
		customer: {
			findFirst: mocks.customerFindFirst,
			create: mocks.customerCreate,
			update: mocks.customerUpdate,
		},
		specialist: { findFirst: mocks.specialistFindFirst },
		salon: { findUnique: mocks.salonFindUnique },
	},
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/server", () => ({ after: mocks.after }));

import {
	createManualAppointment,
	rescheduleAppointment,
	updateAppointmentStatus,
} from "./appointments";

function form(values: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

const manualBooking = {
	customerName: "Pedro",
	customerPhone: "60001122",
	customerEmail: "",
	date: "2028-06-15",
	startTime: "09:00",
	serviceIds: "s1",
	allowOverlap: "true",
};

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
			scheduleRevision: 2,
			internalNotes: "Nota privada",
			customer: { fullName: "Pedro", email: "pedro@example.com" },
			salon: {
				name: "Salón Demo",
				timezone: "America/Panama",
				ownerEmailNotificationsEnabled: true,
				owner: { email: "owner@example.com" },
			},
		});
		mocks.appointmentUpdate.mockResolvedValue({
			id: "appt-1",
			status: "completed",
		});
		mocks.appointmentUpdateMany.mockResolvedValue({ count: 1 });
		mocks.appointmentServiceDeleteMany.mockResolvedValue({ count: 1 });
		mocks.appointmentServiceCreateMany.mockResolvedValue({ count: 1 });
		mocks.deliveryUpdateMany.mockResolvedValue({ count: 1 });
		mocks.eventUpdateMany.mockResolvedValue({ count: 1 });
		mocks.appointmentFindUniqueOrThrow.mockResolvedValue({
			id: "appt-1",
			salonId: "salon-1",
			status: "cancelled",
			notificationRevision: 1,
			appointmentDate: new Date("2028-06-15T00:00:00.000Z"),
			startTime: new Date("1970-01-01T09:00:00.000Z"),
			endTime: new Date("1970-01-01T09:30:00.000Z"),
			totalPriceSnapshot: 15,
			customer: { fullName: "Pedro", email: null },
			specialist: { name: "Ana", email: null },
			appointmentServices: [{ service: { name: "Corte" }, priceSnapshot: 15 }],
			salon: {
				name: "Salón Demo",
				timezone: "America/Panama",
				ownerEmailNotificationsEnabled: true,
				owner: { email: "owner@example.com" },
			},
		});
		mocks.getAvailableSlots.mockResolvedValue({ slots: ["09:00", "10:00"] });
		mocks.getCandidateSpecialists.mockResolvedValue([
			{ id: "spec-1", name: "Ana", email: null },
		]);
		mocks.calculateServicesTotalDuration.mockResolvedValue({
			totalDurationMinutes: 30,
			totalPrice: 15,
			services: [{ id: "s1", name: "Corte", price: 15, durationMinutes: 30 }],
		});
		mocks.customerFindFirst.mockResolvedValue(null);
		mocks.customerCreate.mockResolvedValue({
			id: "cust-1",
			fullName: "Pedro",
			email: null,
		});
		mocks.appointmentCreate.mockResolvedValue({ id: "appt-999" });
		mocks.salonFindUnique.mockResolvedValue({
			name: "Salón Demo",
			timezone: "America/Panama",
			ownerEmailNotificationsEnabled: false,
			owner: { email: null },
		});
		mocks.enqueue.mockResolvedValue({ id: "event-1" });
		mocks.transaction.mockImplementation(async (callback) =>
			callback({
				appointment: {
					findFirst: mocks.appointmentFindFirst,
					findUniqueOrThrow: mocks.appointmentFindUniqueOrThrow,
					update: mocks.appointmentUpdate,
					updateMany: mocks.appointmentUpdateMany,
					create: mocks.appointmentCreate,
				},
				appointmentService: {
					deleteMany: mocks.appointmentServiceDeleteMany,
					createMany: mocks.appointmentServiceCreateMany,
				},
				appointmentNotificationDelivery: {
					updateMany: mocks.deliveryUpdateMany,
				},
				appointmentNotificationEvent: {
					updateMany: mocks.eventUpdateMany,
				},
				customer: {
					findFirst: mocks.customerFindFirst,
					create: mocks.customerCreate,
					update: mocks.customerUpdate,
				},
				specialist: { findFirst: mocks.specialistFindFirst },
				salon: { findUnique: mocks.salonFindUnique },
			}),
		);
		mocks.after.mockImplementation((callback) => callback());
		mocks.dispatchEvent.mockResolvedValue({
			eventId: "event-1",
			sent: 0,
			failed: 0,
		});
	});

	describe("updateAppointmentStatus", () => {
		it("updates a non-notifiable status without enqueueing", async () => {
			const result = await updateAppointmentStatus(
				"appt-1",
				"completed",
				"Nota final",
				"",
				"demo",
			);
			expect(result).toEqual({ success: true });
			expect(mocks.enqueue).not.toHaveBeenCalled();
			expect(mocks.after).not.toHaveBeenCalled();
		});

		it.each(["pending", "confirmed"])(
			"enqueues one cancellation from active status %s with only the public reason",
			async (status) => {
				mocks.appointmentFindFirst.mockResolvedValue({
					id: "appt-1",
					salonId: "salon-1",
					status,
					internalNotes: "Nota privada",
				});
				const result = await updateAppointmentStatus(
					"appt-1",
					"cancelled",
					"Nota privada",
					"Cliente viajó",
					"demo",
				);

				expect(result).toEqual({
					success: true,
					notification: { state: "queued" },
				});
				expect(mocks.appointmentUpdateMany).toHaveBeenCalledWith({
					where: {
						id: "appt-1",
						salonId: "salon-1",
						status: { in: ["pending", "confirmed"] },
					},
					data: {
						status: "cancelled",
						internalNotes: "Nota privada\n[Motivo Cancelación]: Cliente viajó",
						notificationRevision: { increment: 1 },
					},
				});
				expect(mocks.enqueue).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({
						type: "cancelled",
						notificationRevision: 1,
						payload: expect.objectContaining({
							cancellationReason: "Cliente viajó",
						}),
					}),
				);
				expect(
					JSON.stringify(mocks.enqueue.mock.calls[0][1].payload),
				).not.toContain("Nota privada");
			},
		);

		it("rejects repeated or non-active cancellation without creating another event", async () => {
			mocks.appointmentFindFirst.mockResolvedValue({
				id: "appt-1",
				salonId: "salon-1",
				status: "cancelled",
				internalNotes: null,
			});
			const repeated = await updateAppointmentStatus(
				"appt-1",
				"cancelled",
				"",
				"otra",
				"demo",
			);
			expect(repeated).toEqual({
				error: "Solo una cita activa puede cancelarse.",
			});
			expect(mocks.enqueue).not.toHaveBeenCalled();
			expect(mocks.after).not.toHaveBeenCalled();
		});
	});

	describe("rescheduleAppointment", () => {
		const rescheduleData = {
			date: "2028-06-20",
			startTime: "10:00",
			serviceIds: "s1",
			specialistId: "spec-1",
			allowOverlap: "false",
		};

		it.each([
			[{ ...rescheduleData, date: "20/06/2028" }, "Fecha no válida"],
			[{ ...rescheduleData, startTime: "25:00" }, "Hora no válida"],
			[
				{ ...rescheduleData, serviceIds: "" },
				"Debes seleccionar al menos un servicio",
			],
			[
				{ ...rescheduleData, specialistId: "any" },
				"Debes seleccionar un especialista",
			],
		])(
			"validates the complete reschedule input contract",
			async (values, error) => {
				await expect(
					rescheduleAppointment("appt-1", form(values), "demo"),
				).resolves.toEqual({ error });
				expect(mocks.appointmentUpdateMany).not.toHaveBeenCalled();
			},
		);

		it("rejects an appointment outside the authorized tenant", async () => {
			mocks.appointmentFindFirst.mockResolvedValue(null);

			const result = await rescheduleAppointment(
				"other-tenant-appt",
				form(rescheduleData),
				"demo",
			);

			expect(result).toEqual({
				error: "Cita no encontrada o no pertenece a este salón.",
			});
			expect(mocks.appointmentUpdateMany).not.toHaveBeenCalled();
			expect(mocks.enqueue).not.toHaveBeenCalled();
		});

		it.each(["cancelled", "completed", "no_show"])(
			"rejects non-active status %s without a notification",
			async (status) => {
				mocks.appointmentFindFirst.mockResolvedValue({
					id: "appt-1",
					salonId: "salon-1",
					status,
					scheduleRevision: 2,
				});

				const result = await rescheduleAppointment(
					"appt-1",
					form(rescheduleData),
					"demo",
				);

				expect(result).toEqual({
					error: "Solo una cita activa puede reprogramarse.",
				});
				expect(mocks.enqueue).not.toHaveBeenCalled();
			},
		);

		it("requires explicit overlap confirmation before forcing an unavailable time", async () => {
			mocks.getAvailableSlots.mockResolvedValue({ slots: [] });
			const warning = await rescheduleAppointment(
				"appt-1",
				form(rescheduleData),
				"demo",
			);
			expect(warning).toEqual(
				expect.objectContaining({ warning: true, message: expect.any(String) }),
			);
			expect(mocks.transaction).not.toHaveBeenCalled();

			const forced = await rescheduleAppointment(
				"appt-1",
				form({ ...rescheduleData, allowOverlap: "true" }),
				"demo",
			);
			expect(forced).toEqual({
				success: true,
				notification: { state: "queued" },
			});
			expect(mocks.transaction).toHaveBeenCalledOnce();
		});

		it("replaces schedule/services atomically, preserves active status and invalidates stale reminders", async () => {
			const result = await rescheduleAppointment(
				"appt-1",
				form(rescheduleData),
				"demo",
			);

			expect(mocks.getAvailableSlots).toHaveBeenCalledWith(
				"salon-1",
				expect.any(Date),
				["s1"],
				"spec-1",
				"appt-1",
			);
			expect(mocks.appointmentUpdateMany).toHaveBeenCalledWith({
				where: {
					id: "appt-1",
					salonId: "salon-1",
					status: { in: ["pending", "confirmed"] },
					scheduleRevision: 2,
				},
				data: expect.objectContaining({
					appointmentDate: expect.any(Date),
					specialistId: "spec-1",
					scheduleRevision: { increment: 1 },
				}),
			});
			expect(
				mocks.appointmentUpdateMany.mock.calls[0][0].data,
			).not.toHaveProperty("status");
			expect(mocks.appointmentServiceDeleteMany).toHaveBeenCalledWith({
				where: { appointmentId: "appt-1" },
			});
			expect(mocks.deliveryUpdateMany).toHaveBeenCalledWith({
				where: expect.objectContaining({
					status: "pending",
					event: expect.objectContaining({
						type: "reminder_24h",
						scheduleRevision: { not: 3 },
					}),
				}),
				data: {
					status: "skipped",
					resultCode: "appointment_rescheduled",
					recipientEmail: null,
				},
			});
			expect(mocks.eventUpdateMany).toHaveBeenCalledWith({
				where: {
					appointmentId: "appt-1",
					type: "reminder_24h",
					scheduleRevision: { not: 3 },
					status: { in: ["pending", "processing"] },
					deliveries: {
						none: { status: { in: ["pending", "sending"] } },
					},
				},
				data: { status: "completed", completedAt: expect.any(Date) },
			});
			expect(mocks.enqueue).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					type: "rescheduled",
					scheduleRevision: 3,
					payload: expect.objectContaining({
						startTime: "10:00",
						services: [
							{ name: "Corte", price: expect.stringContaining("15.00") },
						],
					}),
				}),
			);
			expect(result).toEqual({
				success: true,
				notification: { state: "queued" },
			});
			expect(mocks.dispatchEvent).toHaveBeenCalledWith("event-1");
		});
	});

	describe("createManualAppointment", () => {
		it("creates appointment and outbox event atomically even when all emails are missing", async () => {
			const result = await createManualAppointment(form(manualBooking), "demo");
			expect(result).toEqual({
				success: true,
				appointmentId: "appt-999",
				notification: { state: "queued" },
			});
			expect(mocks.transaction).toHaveBeenCalledOnce();
			expect(mocks.enqueue).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					type: "created",
					clientEmail: null,
					ownerEmail: null,
					ownerEmailNotificationsEnabled: false,
					specialistEmail: null,
				}),
			);
			expect(mocks.dispatchEvent).toHaveBeenCalledWith("event-1");
		});

		it("does not enqueue when overlap is rejected", async () => {
			mocks.getAvailableSlots.mockResolvedValue({ slots: ["14:00"] });
			const result = await createManualAppointment(
				form({ ...manualBooking, allowOverlap: "false" }),
				"demo",
			);
			expect(result.warning).toBe(true);
			expect(mocks.enqueue).not.toHaveBeenCalled();
		});
	});
});
