import "server-only";

import { validateEmail } from "@/lib/notifications/email-validation";
import {
	DELIVERY_CONCURRENCY,
	type SafeEmailResult,
} from "@/lib/notifications/types";

export interface SendEmailOptions {
	to: string | string[];
	subject: string;
	htmlBody: string;
}

interface UnitEmailOptions extends Omit<SendEmailOptions, "to"> {
	to: string;
}

export function getGmailCredentials() {
	const clientId = process.env.GMAIL_CLIENT_ID?.trim();
	const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
	const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
	const sender = process.env.GMAIL_SENDER?.trim() || "victorpty999@gmail.com";
	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error("Gmail OAuth credentials are not configured");
	}
	return { clientId, clientSecret, refreshToken, sender };
}

export async function getGmailAccessToken(): Promise<string> {
	const { clientId, clientSecret, refreshToken } = getGmailCredentials();
	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		}),
	});
	if (!response.ok) throw new Error("Gmail OAuth token refresh failed");
	const data = (await response.json()) as { access_token?: string };
	if (!data.access_token)
		throw new Error("Gmail OAuth access token is missing");
	return data.access_token;
}

export async function sendEmailUnit(
	options: UnitEmailOptions,
): Promise<SafeEmailResult> {
	try {
		const accessToken = await getGmailAccessToken();
		return await sendWithToken(options, accessToken);
	} catch {
		return { accepted: false, errorCode: "oauth_failed" };
	}
}

export async function sendEmailNotification(options: SendEmailOptions) {
	const recipients = (
		Array.isArray(options.to) ? options.to : options.to.split(",")
	)
		.map((email) => email.trim())
		.filter(Boolean);
	if (recipients.length === 0)
		throw new Error("No hay destinatarios válidos para enviar el correo");

	let accessToken: string;
	try {
		accessToken = await getGmailAccessToken();
	} catch {
		const details = recipients.map(() => ({
			success: false,
			errorCode: "oauth_failed" as const,
		}));
		return { success: false, details };
	}
	const details = await mapWithConcurrency(
		recipients,
		DELIVERY_CONCURRENCY,
		async (to) => {
			const result = await sendWithToken(
				{ to, subject: options.subject, htmlBody: options.htmlBody },
				accessToken,
			).catch(
				(): SafeEmailResult => ({
					accepted: false,
					errorCode: "unknown_after_send",
				}),
			);
			return {
				success: result.accepted,
				providerMessageId: result.providerMessageId,
				errorCode: result.errorCode,
			};
		},
	);
	return { success: details.some((result) => result.success), details };
}

async function sendWithToken(
	options: UnitEmailOptions,
	accessToken: string,
): Promise<SafeEmailResult> {
	const recipient = validateEmail(options.to);
	if (!recipient.valid)
		return { accepted: false, errorCode: recipient.resultCode };
	const credentials = getGmailCredentials();
	const sender = validateEmail(credentials.sender);
	if (!sender.valid) return { accepted: false, errorCode: "oauth_failed" };
	const subject = options.subject.replace(/[\r\n]+/g, " ").trim();
	const mimeMessage = [
		`From: Citas Glam <${sender.normalized}>`,
		`To: ${recipient.normalized}`,
		`Subject: ${subject}`,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=utf-8",
		"",
		options.htmlBody,
	].join("\r\n");
	const raw = Buffer.from(mimeMessage).toString("base64url");
	let response: Response;
	try {
		response = await fetch(
			"https://gmail.googleapis.com/v1/users/me/messages/send",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ raw }),
			},
		);
	} catch {
		return { accepted: false, errorCode: "unknown_after_send" };
	}
	if (!response.ok) return { accepted: false, errorCode: "provider_rejected" };
	try {
		const data = (await response.json()) as { id?: string };
		return data.id
			? { accepted: true, providerMessageId: data.id }
			: { accepted: false, errorCode: "unknown_after_send" };
	} catch {
		return { accepted: false, errorCode: "unknown_after_send" };
	}
}

async function mapWithConcurrency<T, R>(
	items: T[],
	limit: number,
	mapper: (item: T) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			results[index] = await mapper(items[index]);
		}
	};
	await Promise.allSettled(
		Array.from({ length: Math.min(limit, items.length) }, () => worker()),
	);
	return results;
}

/**
 * Sends trial expiration notice email to owner and additional configured notification recipients.
 */
export async function sendTrialExpirationEmail({
	ownerName,
	ownerEmail,
	salonName,
	remainingDays,
	newEndDate,
	additionalNotificationEmails,
}: {
	ownerName: string;
	ownerEmail: string;
	salonName: string;
	remainingDays: number;
	newEndDate?: string;
	additionalNotificationEmails?: string | null;
}) {
	const systemNotificationEmails = (
		process.env.SYSTEM_NOTIFICATION_EMAILS ||
		"vicmat04@gmail.com,dayanisr270@gmail.com"
	)
		.split(",")
		.map((e) => e.trim())
		.filter(Boolean);

	const recipients = [ownerEmail, ...systemNotificationEmails];

	if (additionalNotificationEmails) {
		const extra = additionalNotificationEmails
			.split(",")
			.map((e) => e.trim())
			.filter(Boolean);
		recipients.push(...extra);
	}

	const uniqueRecipients = Array.from(new Set(recipients));

	const subject = `[Citas Glam] Notificación de Prueba para el salón "${salonName}"`;
	const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #D4AF37; margin-top: 0;">Citas Glam — Notificación de Suscripción</h2>
      <p>Hola <strong>${ownerName}</strong>,</p>
      <p>Te escribimos de parte de la plataforma Citas Glam respecto a tu negocio <strong>"${salonName}"</strong>.</p>
      
      <div style="background-color: #fff8e1; border-left: 4px solid #D4AF37; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #856404;">
          ${remainingDays > 0 ? `Quedan ${remainingDays} día(s) de tu período de prueba` : "Tu período de prueba ha finalizado o ha sido actualizado"}
        </p>
        ${newEndDate ? `<p style="margin: 8px 0 0 0; font-size: 14px;">Fecha de vencimiento: <strong>${newEndDate}</strong></p>` : ""}
      </div>

      <p>Para mantener activo tu panel de gestión y la página pública de reservas sin interrupciones, comunícate con nosotros por WhatsApp al <strong>+507 67005805</strong> para activar tu plan.</p>
      
      <div style="margin-top: 24px; text-align: center;">
        <a href="https://wa.me/50767005805?text=Hola!%20Quiero%20activar%20el%20plan%20para%20mi%20sal%C3%B3n%20${encodeURIComponent(salonName)}" 
           style="background-color: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Contactar por WhatsApp (+507 67005805)
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0 15px 0;" />
      <p style="font-size: 12px; color: #888888; text-align: center;">
        Este es un mensaje automático de la plataforma Citas Glam para ${salonName}.
      </p>
    </div>
  `;

	return sendEmailNotification({
		to: uniqueRecipients,
		subject,
		htmlBody,
	});
}
