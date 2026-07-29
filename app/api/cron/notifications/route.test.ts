import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runNotificationCron: vi.fn() }));

vi.mock("@/lib/notifications/reminders", () => ({
	runNotificationCron: mocks.runNotificationCron,
}));

import { GET } from "./route";

function request(token?: string) {
	return new Request("http://localhost/api/cron/notifications", {
		headers: token ? { authorization: `Bearer ${token}` } : {},
	});
}

describe("notifications cron route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.CRON_SECRET = "cron-test-secret";
		mocks.runNotificationCron.mockResolvedValue({
			candidates: 1,
			eventsEnqueued: 1,
			staleCandidates: 0,
			deliveriesProcessed: 3,
			recoveredUnknown: 0,
			staleRemindersSkipped: 0,
			purgedEvents: 0,
		});
	});

	it.each([undefined, "wrong-secret"])(
		"rejects a missing or invalid bearer secret (%s)",
		async (token) => {
			const response = await GET(request(token));
			expect(response.status).toBe(401);
			expect(await response.json()).toEqual({ error: "unauthorized" });
			expect(mocks.runNotificationCron).not.toHaveBeenCalled();
		},
	);

	it("returns only sanitized counters for an authenticated execution", async () => {
		const response = await GET(request("cron-test-secret"));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			candidates: 1,
			eventsEnqueued: 1,
			staleCandidates: 0,
			deliveriesProcessed: 3,
			recoveredUnknown: 0,
			staleRemindersSkipped: 0,
			purgedEvents: 0,
		});
		expect(JSON.stringify(body)).not.toContain("event-");
		expect(JSON.stringify(body)).not.toContain("@example.com");
	});

	it("reports the kill switch as counters without exposing queue details", async () => {
		mocks.runNotificationCron.mockResolvedValue({
			disabled: true,
			candidates: 0,
			eventsEnqueued: 0,
			staleCandidates: 0,
			deliveriesProcessed: 0,
			recoveredUnknown: 0,
			staleRemindersSkipped: 0,
			purgedEvents: 0,
		});

		const response = await GET(request("cron-test-secret"));
		expect(await response.json()).toEqual({
			disabled: true,
			candidates: 0,
			eventsEnqueued: 0,
			staleCandidates: 0,
			deliveriesProcessed: 0,
			recoveredUnknown: 0,
			staleRemindersSkipped: 0,
			purgedEvents: 0,
		});
	});
});
