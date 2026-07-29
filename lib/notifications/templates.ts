import "server-only";

import type {
	AppointmentNotificationSnapshot,
	NotificationEventType,
	NotificationRole,
} from "./types";

const EVENT_COPY: Record<
	NotificationEventType,
	{ subject: string; heading: string }
> = {
	created: { subject: "Nueva cita", heading: "Tu cita ha sido creada" },
	cancelled: {
		subject: "Cita cancelada",
		heading: "La cita ha sido cancelada",
	},
	rescheduled: {
		subject: "Cita reprogramada",
		heading: "La cita ha sido reprogramada",
	},
	reminder_24h: {
		subject: "Recordatorio de cita",
		heading: "Tu cita se acerca",
	},
};
const ROLE_GREETING: Record<NotificationRole, string> = {
	client: "Hola, cliente:",
	owner: "Hola, dueño del salón:",
	specialist: "Hola, especialista:",
};

export function renderNotificationEmail(input: {
	type: NotificationEventType;
	roles: NotificationRole[];
	snapshot: AppointmentNotificationSnapshot;
}): { subject: string; htmlBody: string } {
	const copy = EVENT_COPY[input.type];
	const subject = sanitizeSubject(
		`[Citas Salón] ${copy.subject} — ${input.snapshot.salonName}`,
	);
	const greeting =
		input.roles.length === 1 ? ROLE_GREETING[input.roles[0]] : "Hola,";
	const services = input.snapshot.services
		.map(
			(service) =>
				`<li>${escapeHtml(service.name)} — ${escapeHtml(service.price)}</li>`,
		)
		.join("");
	const optional = [
		input.snapshot.specialistName &&
			`<p><strong>Especialista:</strong> ${escapeHtml(input.snapshot.specialistName)}</p>`,
		input.snapshot.cancellationReason &&
			`<p><strong>Motivo:</strong> ${escapeHtml(input.snapshot.cancellationReason)}</p>`,
	]
		.filter(Boolean)
		.join("");

	return {
		subject,
		htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px"><h2>${escapeHtml(copy.heading)}</h2><p>${escapeHtml(greeting)}</p><p><strong>Salón:</strong> ${escapeHtml(input.snapshot.salonName)}</p><p><strong>Cliente:</strong> ${escapeHtml(input.snapshot.customerName)}</p><p><strong>Fecha:</strong> ${escapeHtml(input.snapshot.appointmentDate)}</p><p><strong>Horario:</strong> ${escapeHtml(input.snapshot.startTime)}–${escapeHtml(input.snapshot.endTime)}</p><p><strong>Servicios:</strong></p><ul>${services}</ul>${optional}<p><strong>Total:</strong> ${escapeHtml(input.snapshot.total)}</p></div>`,
	};
}

function sanitizeSubject(value: string): string {
	return value
		.replace(/[\r\n]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>'"]/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				"'": "&#39;",
				'"': "&quot;",
			})[character] ?? character,
	);
}
