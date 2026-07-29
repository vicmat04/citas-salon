import { describe, expect, it } from "vitest";

import { renderNotificationEmail } from "./templates";
import type { AppointmentNotificationSnapshot } from "./types";

const snapshot: AppointmentNotificationSnapshot = {
	salonName: "Salón <Central>",
	customerName: "Ana & Luis",
	appointmentDate: "29 de julio de 2026",
	startTime: "10:00",
	endTime: "11:00",
	services: [{ name: "Corte <script>alert(1)</script>", price: "$20.00" }],
	specialistName: 'María "M"',
	total: "$20.00",
};

describe("notification templates", () => {
	it.each(["created", "cancelled", "rescheduled", "reminder_24h"] as const)(
		"renders a mobile-readable, event-specific %s message",
		(type) => {
			const rendered = renderNotificationEmail({
				type,
				roles: ["client"],
				snapshot,
			});
			expect(rendered.subject).toContain("Citas Salón");
			expect(rendered.htmlBody).toContain("max-width: 600px");
			expect(rendered.htmlBody).toContain("29 de julio de 2026");
		},
	);

	it("escapes every dynamic HTML value and strips header newlines from the subject", () => {
		const rendered = renderNotificationEmail({
			type: "created",
			roles: ["owner"],
			snapshot: {
				...snapshot,
				salonName: "Salón\r\nBcc: leak@example.com <x>",
			},
		});

		expect(rendered.subject).not.toMatch(/[\r\n]/);
		expect(rendered.htmlBody).not.toContain("<script>");
		expect(rendered.htmlBody).not.toContain("<x>");
		expect(rendered.htmlBody).toContain("&lt;script&gt;");
	});

	it("uses neutral copy when one address represents multiple roles", () => {
		const rendered = renderNotificationEmail({
			type: "created",
			roles: ["client", "owner"],
			snapshot,
		});
		expect(rendered.htmlBody).toContain("Hola,");
	});
});
