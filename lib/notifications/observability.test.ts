import { describe, expect, it } from "vitest";

import {
	projectAppointmentNotificationEvents,
	projectNotificationDeliveries,
} from "./observability";

describe("safe notification observability", () => {
	it("exposes masked projections and controlled fields only", () => {
		const projection = projectNotificationDeliveries([
			{
				roles: ["client"],
				status: "failed",
				resultCode: "provider_rejected",
				recipientEmail: "private@example.com",
				recipientMasked: "p***@example.com",
				updatedAt: new Date("2026-07-29T10:00:00.000Z"),
			},
		]);

		expect(projection).toEqual([
			{
				roles: ["client"],
				status: "failed",
				resultCode: "provider_rejected",
				recipientMasked: "p***@example.com",
				occurredAt: "2026-07-29T10:00:00.000Z",
			},
		]);
		expect(JSON.stringify(projection)).not.toContain("private@example.com");
	});

	it("projects events without payload, raw email, or provider identifiers", () => {
		const projection = projectAppointmentNotificationEvents([
			{
				type: "created",
				createdAt: new Date("2026-07-29T10:00:00.000Z"),
				payload: { internalNotes: "private" },
				deliveries: [
					{
						roles: ["owner"],
						status: "sent",
						resultCode: null,
						recipientEmail: "owner@example.com",
						recipientMasked: "o***@example.com",
						updatedAt: new Date("2026-07-29T10:01:00.000Z"),
						providerMessageId: "gmail-secret-id",
					},
				],
			},
		]);

		expect(projection).toEqual([
			{
				type: "created",
				createdAt: "2026-07-29T10:00:00.000Z",
				deliveries: [
					{
						roles: ["owner"],
						status: "sent",
						resultCode: null,
						recipientMasked: "o***@example.com",
						occurredAt: "2026-07-29T10:01:00.000Z",
					},
				],
			},
		]);
		expect(JSON.stringify(projection)).not.toMatch(
			/gmail-secret-id|owner@example.com|private/,
		);
	});
});
