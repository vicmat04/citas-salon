import { describe, expect, it } from "vitest";

import { resolveRecipients } from "./recipient-resolver";

describe("notification recipient resolver", () => {
	it("evaluates all roles independently and records safe omissions", () => {
		const deliveries = resolveRecipients({
			clientEmail: undefined,
			ownerEmail: "owner@example.com",
			ownerEmailNotificationsEnabled: false,
			specialistEmail: "bad-address",
			hasSpecialist: true,
		});

		expect(deliveries).toEqual([
			expect.objectContaining({
				roles: ["client"],
				status: "skipped",
				resultCode: "missing_email",
			}),
			expect.objectContaining({
				roles: ["owner"],
				status: "skipped",
				resultCode: "owner_disabled",
			}),
			expect.objectContaining({
				roles: ["specialist"],
				status: "skipped",
				resultCode: "invalid_email",
			}),
		]);
	});

	it("does not let an owner preference affect client or specialist eligibility", () => {
		const deliveries = resolveRecipients({
			clientEmail: "client@example.com",
			ownerEmail: "owner@example.com",
			ownerEmailNotificationsEnabled: false,
			specialistEmail: "pro@example.com",
			hasSpecialist: true,
		});

		expect(
			deliveries.filter((delivery) => delivery.status === "pending"),
		).toHaveLength(2);
	});

	it("merges repeated normalized addresses and preserves all represented roles", () => {
		const deliveries = resolveRecipients({
			clientEmail: " Shared@Example.com ",
			ownerEmail: "shared@example.com",
			ownerEmailNotificationsEnabled: true,
			specialistEmail: "SHARED@example.com",
			hasSpecialist: true,
		});

		expect(deliveries).toEqual([
			expect.objectContaining({
				roles: ["client", "owner", "specialist"],
				recipientKey: "shared@example.com",
				recipientMasked: "s***@example.com",
				status: "pending",
				resultCode: "duplicate_merged",
			}),
		]);
	});
});
