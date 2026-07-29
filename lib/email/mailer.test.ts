import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	getGmailAccessToken,
	getGmailCredentials,
	sendEmailNotification,
	sendEmailUnit,
	sendTrialExpirationEmail,
} from "./mailer";

const globalFetch = vi.fn();
global.fetch = globalFetch;

describe("OAuth2 Gmail API mailer module", () => {
	beforeEach(() => {
		globalFetch.mockReset();
		process.env.GMAIL_CLIENT_ID = "test-client-id";
		process.env.GMAIL_CLIENT_SECRET = "test-client-secret";
		process.env.GMAIL_REFRESH_TOKEN = "test-refresh-token";
		process.env.GMAIL_SENDER = "victorpty999@gmail.com";
		process.env.SYSTEM_NOTIFICATION_EMAILS =
			"vicmat04@gmail.com,dayanisr270@gmail.com";
	});

	it("reads Gmail OAuth credentials from environment", () => {
		const creds = getGmailCredentials();
		expect(creds.clientId).toBeDefined();
		expect(creds.clientSecret).toBeDefined();
		expect(creds.refreshToken).toBeDefined();
		expect(creds.sender).toBe("victorpty999@gmail.com");
		expect(creds.clientId).toBe("test-client-id");
	});

	it("obtains access token from Google OAuth2 token endpoint", async () => {
		globalFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ access_token: "fake-access-token-123" }),
		});

		const token = await getGmailAccessToken();
		expect(token).toBe("fake-access-token-123");
		expect(globalFetch).toHaveBeenCalledWith(
			"https://oauth2.googleapis.com/token",
			expect.objectContaining({
				method: "POST",
			}),
		);
	});

	it("sends transactional MIME email to multiple recipients via Gmail API", async () => {
		// 1st fetch: token
		globalFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ access_token: "fake-access-token-123" }),
		});
		// 2nd fetch: send recipient 1
		globalFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "msg-1" }),
		});
		// 3rd fetch: send recipient 2
		globalFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "msg-2" }),
		});

		const result = await sendEmailNotification({
			to: ["victorpty999@gmail.com", "dayanisr270@gmail.com"],
			subject: "Prueba Notificación",
			htmlBody: "<p>Hola</p>",
		});

		expect(result.success).toBe(true);
		expect(result.details).toHaveLength(2);
	});

	it("returns a sanitized result when Gmail rejects a unit send", async () => {
		globalFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ access_token: "fake-access-token-123" }),
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 400,
				text: async () => "raw provider response with private@example.com",
			});

		await expect(
			sendEmailUnit({
				to: "private@example.com",
				subject: "Subject",
				htmlBody: "<p>secret body</p>",
			}),
		).resolves.toEqual({ accepted: false, errorCode: "provider_rejected" });
	});

	it("reuses one token, limits concurrency to three and isolates batch failures", async () => {
		let active = 0;
		let maxActive = 0;
		globalFetch.mockImplementationOnce(async () => ({
			ok: true,
			json: async () => ({ access_token: "fake-access-token-123" }),
		}));
		globalFetch.mockImplementation(async () => {
			active += 1;
			maxActive = Math.max(maxActive, active);
			await new Promise((resolve) => setTimeout(resolve, 5));
			active -= 1;
			return { ok: true, json: async () => ({ id: "safe-id" }) };
		});

		const result = await sendEmailNotification({
			to: [
				"one@example.com",
				"two@example.com",
				"three@example.com",
				"four@example.com",
			],
			subject: "Subject",
			htmlBody: "<p>Body</p>",
		});

		expect(globalFetch).toHaveBeenCalledTimes(5);
		expect(maxActive).toBeLessThanOrEqual(3);
		expect(result.details).toHaveLength(4);
		expect(JSON.stringify(result)).not.toContain("one@example.com");
	});

	it("sends trial expiration email including vicmat04@gmail.com and dayanisr270@gmail.com", async () => {
		globalFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ access_token: "fake-access-token-123" }),
		});
		globalFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ id: "msg-ok" }),
		});

		const result = await sendTrialExpirationEmail({
			ownerName: "Carlos",
			ownerEmail: "carlos@salon.com",
			salonName: "Estilo Chic",
			remainingDays: 3,
		});

		expect(result.success).toBe(true);
		expect(globalFetch).toHaveBeenCalled();
	});
});
