import { describe, expect, it, vi } from "vitest";

import { buildEventKey, enqueueAppointmentNotification } from "./enqueue";
import {
	CANDIDATE_LIMIT,
	DELIVERY_LIMIT,
	enqueueReminderCandidates,
	isReminderCandidateCurrent,
	recoverAbandonedDeliveries,
	runNotificationCron,
} from "./reminders";

const now = new Date("2028-06-14T10:00:00.000Z");
const eligible = {
	appointmentId: "appt-1",
	status: "confirmed",
	scheduleRevision: 2,
	startsAt: new Date("2028-06-15T09:00:00.000Z"),
};

function appointment() {
	return {
		id: "appt-1",
		salonId: "salon-1",
		status: "confirmed",
		scheduleRevision: 2,
		appointmentDate: new Date("2028-06-15T00:00:00.000Z"),
		startTime: new Date("1970-01-01T09:00:00.000Z"),
		endTime: new Date("1970-01-01T09:30:00.000Z"),
		totalPriceSnapshot: 15,
		customer: { fullName: "Pedro", email: "pedro@example.com" },
		specialist: { name: "Ana", email: "ana@example.com" },
		appointmentServices: [{ service: { name: "Corte" }, priceSnapshot: 15 }],
		salon: {
			name: "Salón Demo",
			timezone: "America/Panama",
			ownerEmailNotificationsEnabled: true,
			owner: { email: "owner@example.com" },
		},
	};
}

function reminderDb(current = eligible) {
	const tx = {
		$queryRaw: vi.fn().mockResolvedValue([current]),
		appointment: { findFirst: vi.fn().mockResolvedValue(appointment()) },
	};
	return {
		$queryRaw: vi.fn().mockResolvedValue([eligible]),
		$transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
			callback(tx),
		),
		tx,
	};
}

describe("24-hour appointment reminders", () => {
	it("accepts only a future active appointment inside the fixed 24-hour window", () => {
		expect(isReminderCandidateCurrent(eligible, 2, now, 24)).toBe(true);
		expect(
			isReminderCandidateCurrent(
				{ ...eligible, status: "cancelled" },
				2,
				now,
				24,
			),
		).toBe(false);
	});

	it.each([
		["past", new Date("2028-06-14T09:59:59.000Z")],
		["outside", new Date("2028-06-15T10:00:01.000Z")],
	])("rejects a %s candidate", (_label, startsAt) => {
		expect(
			isReminderCandidateCurrent({ ...eligible, startsAt }, 2, now, 24),
		).toBe(false);
	});

	it("re-reads the revision and skips a candidate replaced before enqueue", async () => {
		const db = reminderDb({ ...eligible, scheduleRevision: 3 });
		const enqueue = vi.fn();

		const result = await enqueueReminderCandidates({
			db: db as never,
			now,
			enqueue,
		});

		expect(result).toEqual({ candidates: 1, enqueued: 0, stale: 1 });
		expect(enqueue).not.toHaveBeenCalled();
		expect(db.tx.appointment.findFirst).not.toHaveBeenCalled();
	});

	it("uses one atomic outbox row for a concurrent reminder eventKey", async () => {
		const stored = new Map<string, { id: string; eventKey: string }>();
		const upsert = vi.fn(async ({ where, create }) => {
			const existingEvent = stored.get(where.eventKey);
			if (existingEvent) return existingEvent;
			const event = { id: "event-1", eventKey: create.eventKey };
			stored.set(event.eventKey, event);
			return event;
		});
		const tx = { appointmentNotificationEvent: { upsert } };
		const input = {
			salonId: "salon-1",
			appointmentId: "appt-1",
			type: "reminder_24h" as const,
			scheduleRevision: 2,
			payload: {
				salonName: "Salón Demo",
				customerName: "Pedro",
				appointmentDate: "15 de junio de 2028",
				startTime: "09:00",
				endTime: "09:30",
				services: [{ name: "Corte", price: "USD 15.00" }],
				total: "USD 15.00",
			},
			clientEmail: "pedro@example.com",
			ownerEmail: null,
			ownerEmailNotificationsEnabled: false,
			specialistEmail: null,
			hasSpecialist: false,
		};

		const events = await Promise.all([
			enqueueAppointmentNotification(tx as never, input),
			enqueueAppointmentNotification(tx as never, input),
		]);

		expect(events).toEqual([
			{ id: "event-1", eventKey: "reminder_24h:appt-1:2" },
			{ id: "event-1", eventKey: "reminder_24h:appt-1:2" },
		]);
		expect(stored.size).toBe(1);
		expect(upsert).toHaveBeenCalledTimes(2);
	});

	it("creates one reminder eventKey across two concurrent executions", async () => {
		const db = reminderDb();
		const eventKeys = new Set<string>();
		const enqueue = vi.fn(async (_tx, input) => {
			const eventKey = buildEventKey(input);
			eventKeys.add(eventKey);
			return { id: "event-1", eventKey };
		});

		const results = await Promise.all([
			enqueueReminderCandidates({ db: db as never, now, enqueue }),
			enqueueReminderCandidates({ db: db as never, now, enqueue }),
		]);

		expect(results).toEqual([
			{ candidates: 1, enqueued: 1, stale: 0 },
			{ candidates: 1, enqueued: 1, stale: 0 },
		]);
		expect(eventKeys).toEqual(new Set(["reminder_24h:appt-1:2"]));
	});

	it("uses APPOINTMENT_REMINDER_HOURS when running the cron", async () => {
		const previous = process.env.APPOINTMENT_REMINDER_HOURS;
		process.env.APPOINTMENT_REMINDER_HOURS = "12";
		const db = {
			appointmentNotificationDelivery: {
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
				findMany: vi.fn().mockResolvedValue([]),
			},
			appointmentNotificationEvent: { deleteMany: vi.fn() },
			$executeRaw: vi.fn().mockResolvedValue(0),
		};
		const enqueueCandidates = vi.fn().mockResolvedValue({
			candidates: 0,
			enqueued: 0,
			stale: 0,
		});

		try {
			await runNotificationCron({
				db: db as never,
				now,
				operationalEnabled: true,
				remindersEnabled: true,
				enqueueCandidates,
				dispatch: vi.fn(),
			});
		} finally {
			if (previous === undefined) {
				delete process.env.APPOINTMENT_REMINDER_HOURS;
			} else {
				process.env.APPOINTMENT_REMINDER_HOURS = previous;
			}
		}

		expect(enqueueCandidates).toHaveBeenCalledWith(
			expect.objectContaining({ reminderHours: 12 }),
		);
	});

	it("caps discovery and delivery work and does not mutate appointments", async () => {
		const db = {
			appointmentNotificationDelivery: {
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
				findMany: vi.fn().mockResolvedValue([]),
			},
			appointmentNotificationEvent: { deleteMany: vi.fn() },
			$executeRaw: vi.fn().mockResolvedValue(0),
		};
		const enqueueCandidates = vi.fn().mockResolvedValue({
			candidates: CANDIDATE_LIMIT,
			enqueued: 0,
			stale: 0,
		});

		const result = await runNotificationCron({
			db: db as never,
			now,
			operationalEnabled: true,
			remindersEnabled: true,
			enqueueCandidates,
			dispatch: vi.fn(),
		});

		expect(result).toEqual({
			candidates: CANDIDATE_LIMIT,
			eventsEnqueued: 0,
			staleCandidates: 0,
			deliveriesProcessed: 0,
			recoveredUnknown: 0,
			staleRemindersSkipped: 0,
			purgedEvents: 0,
		});
		expect(db.appointmentNotificationDelivery.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: DELIVERY_LIMIT }),
		);
		expect(db).not.toHaveProperty("appointment.update");
	});

	it("finalizes abandoned sending deliveries as unknown_after_send without retry", async () => {
		const updateMany = vi.fn().mockResolvedValue({ count: 2 });
		const recovered = await recoverAbandonedDeliveries(
			{ appointmentNotificationDelivery: { updateMany } },
			now,
		);

		expect(recovered).toBe(2);
		expect(updateMany).toHaveBeenCalledWith({
			where: { status: "sending", startedAt: { lt: expect.any(Date) } },
			data: {
				status: "failed",
				resultCode: "unknown_after_send",
				recipientEmail: null,
			},
		});
	});

	it("keeps all outbox work untouched behind the global kill switch", async () => {
		const db = { appointmentNotificationDelivery: { updateMany: vi.fn() } };
		await expect(
			runNotificationCron({
				db: db as never,
				now,
				operationalEnabled: false,
				remindersEnabled: true,
			}),
		).resolves.toEqual({
			disabled: true,
			candidates: 0,
			eventsEnqueued: 0,
			staleCandidates: 0,
			deliveriesProcessed: 0,
			recoveredUnknown: 0,
			staleRemindersSkipped: 0,
			purgedEvents: 0,
		});
		expect(
			db.appointmentNotificationDelivery.updateMany,
		).not.toHaveBeenCalled();
	});
});
