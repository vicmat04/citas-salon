import "server-only";

export interface SendEmailOptions {
	to: string | string[];
	subject: string;
	htmlBody: string;
}

export function getGmailCredentials() {
	const clientId = process.env.GMAIL_CLIENT_ID?.trim();
	const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
	const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
	const sender = process.env.GMAIL_SENDER?.trim() || "victorpty999@gmail.com";

	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error(
			"Faltan variables GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET o GMAIL_REFRESH_TOKEN.",
		);
	}

	return { clientId, clientSecret, refreshToken, sender };
}

/**
 * Obtains a temporary access_token from Google OAuth2 API using the refresh_token.
 */
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

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Fallo al refrescar token de Google OAuth2: ${errorText}`);
	}

	const data = await response.json();
	if (!data.access_token) {
		throw new Error("Google OAuth2 no retornó access_token");
	}

	return data.access_token;
}

/**
 * Sends a transactional email using Gmail API REST endpoint + OAuth2.0 access_token.
 * Supports sending to single email or multiple recipient emails (string or array).
 */
export async function sendEmailNotification(options: SendEmailOptions) {
	const { sender } = getGmailCredentials();

	let recipientsList: string[] = [];
	if (Array.isArray(options.to)) {
		recipientsList = options.to.map((e) => e.trim()).filter(Boolean);
	} else if (typeof options.to === "string") {
		recipientsList = options.to
			.split(",")
			.map((e) => e.trim())
			.filter(Boolean);
	}

	if (recipientsList.length === 0) {
		throw new Error("No hay destinatarios válidos para enviar el correo");
	}

	const accessToken = await getGmailAccessToken();
	const results = [];

	for (const recipient of recipientsList) {
		const mimeMessage = [
			`From: ${sender}`,
			`To: ${recipient}`,
			`Subject: ${options.subject}`,
			"MIME-Version: 1.0",
			"Content-Type: text/html; charset=utf-8",
			"",
			options.htmlBody,
		].join("\r\n");

		// Encode in Base64 URL-Safe format
		const encodedMessage = Buffer.from(mimeMessage)
			.toString("base64")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");

		const sendResponse = await fetch(
			"https://gmail.googleapis.com/v1/users/me/messages/send",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ raw: encodedMessage }),
			},
		);

		if (!sendResponse.ok) {
			const errText = await sendResponse.text();
			console.error(`Fallo al enviar correo a ${recipient}:`, errText);
			results.push({ recipient, success: false, error: errText });
		} else {
			const resData = await sendResponse.json();
			results.push({ recipient, success: true, id: resData.id });
		}
	}

	return { success: results.some((r) => r.success), details: results };
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

	const subject = `[Citas Salón] Notificación de Prueba para el salón "${salonName}"`;
	const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #D4AF37; margin-top: 0;">Citas Salón — Notificación de Suscripción</h2>
      <p>Hola <strong>${ownerName}</strong>,</p>
      <p>Te escribimos de parte de la plataforma Citas Salón respecto a tu negocio <strong>"${salonName}"</strong>.</p>
      
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
        Este es un mensaje automático de la plataforma Citas Salón para ${salonName}.
      </p>
    </div>
  `;

	return sendEmailNotification({
		to: uniqueRecipients,
		subject,
		htmlBody,
	});
}
