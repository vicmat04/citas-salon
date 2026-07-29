import { describe, expect, it, vi } from "vitest";

import { dispatchEvent } from "./dispatcher";

function createDb(deliveries: Array<Record<string, unknown>>) {
	return {
		$executeRaw: vi.fn().mockResolvedValue(1),
		appointmentNotificationDelivery: {
			findMany: vi.fn().mockResolvedValue(deliveries),
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			update: vi.fn().mockResolvedValue({}),
			count: vi.fn().mockResolvedValue(0),
		},
		appointmentNotificationEvent: { update: vi.fn().mockResolvedValue({}) },
	};
}

const event = {
	id: "event-1",
	type: "created",
	payload: {
		salonName: "Salón Uno",
		customerName: "Ana",
		appointmentDate: "29/07/2026",
		startTime: "10:00",
		endTime: "11:00",
		services: [{ name: "Corte", price: "$20.00" }],
		total: "$20.00",
	},
};

describe("notification dispatcher", () => {
	it("uses a conditional claim and removes recipientEmail after an accepted send", async () => {
		const db = createDb([
			{
				id: "delivery-1",
				eventId: event.id,
				roles: ["client"],
				recipientEmail: "ana@example.com",
				event,
			},
		]);
		const sendEmail = vi
			.fn()
			.mockResolvedValue({ accepted: true, providerMessageId: "safe-id" });

		const result = await dispatchEvent(event.id, {
			db,
			sendEmail,
			enabled: true,
		});

		expect(db.appointmentNotificationDelivery.updateMany).toHaveBeenCalledWith({
			where: { id: "delivery-1", eventId: event.id, status: "pending" },
			data: expect.objectContaining({
				status: "sending",
				attemptCount: { increment: 1 },
			}),
		});
		expect(db.appointmentNotificationDelivery.update).toHaveBeenCalledWith({
			where: { id: "delivery-1" },
			data: expect.objectContaining({ status: "sent", recipientEmail: null }),
		});
		expect(result).toEqual(expect.objectContaining({ sent: 1, failed: 0 }));
	});

	it("isolates provider rejection and ambiguous failures between deliveries", async () => {
		const db = createDb([
			{
				id: "delivery-1",
				eventId: event.id,
				roles: ["client"],
				recipientEmail: "one@example.com",
				event,
			},
			{
				id: "delivery-2",
				eventId: event.id,
				roles: ["owner"],
				recipientEmail: "two@example.com",
				event,
			},
		]);
		const sendEmail = vi
			.fn()
			.mockResolvedValueOnce({
				accepted: false,
				errorCode: "provider_rejected",
			})
			.mockRejectedValueOnce(
				new Error("provider response may be ambiguous and contains PII"),
			);

		const result = await dispatchEvent(event.id, {
			db,
			sendEmail,
			enabled: true,
		});

		expect(sendEmail).toHaveBeenCalledTimes(2);
		expect(result.failed).toBe(2);
		expect(db.appointmentNotificationDelivery.update).toHaveBeenCalledWith({
			where: { id: "delivery-2" },
			data: expect.objectContaining({
				resultCode: "unknown_after_send",
				recipientEmail: null,
			}),
		});
	});

	it("finalizes a claimed delivery with a missing server-only address as skipped", async () => {
		const db = createDb([
			{
				id: "delivery-1",
				eventId: event.id,
				roles: ["client"],
				recipientEmail: null,
				event,
			},
		]);
		const sendEmail = vi.fn();

		const result = await dispatchEvent(event.id, {
			db,
			sendEmail,
			enabled: true,
		});

		expect(sendEmail).not.toHaveBeenCalled();
		expect(result).toEqual(expect.objectContaining({ sent: 0, failed: 0 }));
		expect(db.appointmentNotificationDelivery.update).toHaveBeenCalledWith({
			where: { id: "delivery-1" },
			data: expect.objectContaining({
				status: "skipped",
				resultCode: "missing_email",
				recipientEmail: null,
			}),
		});
	});

	it("atomically refuses a stale reminder claim before calling the provider", async () => {
		const reminderEvent = { ...event, type: "reminder_24h" };
		const db = createDb([
			{
				id: "delivery-1",
				eventId: reminderEvent.id,
				roles: ["client"],
				recipientEmail: "ana@example.com",
				event: reminderEvent,
			},
		]);
		db.$executeRaw.mockResolvedValue(0);
		const sendEmail = vi.fn();

		const result = await dispatchEvent(reminderEvent.id, {
			db,
			sendEmail,
			enabled: true,
		});

		expect(db.$executeRaw).toHaveBeenCalledOnce();
		expect(
			db.appointmentNotificationDelivery.updateMany,
		).not.toHaveBeenCalled();
		expect(sendEmail).not.toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({ sent: 0, failed: 0, processed: 0 }),
		);
	});

	it("keeps pending work untouched while the kill switch is off", async () => {
		const db = createDb([]);
		await expect(
			dispatchEvent(event.id, { db, sendEmail: vi.fn(), enabled: false }),
		).resolves.toEqual({
			eventId: event.id,
			disabled: true,
			sent: 0,
			failed: 0,
		});
		expect(db.appointmentNotificationDelivery.findMany).not.toHaveBeenCalled();
	});
});
