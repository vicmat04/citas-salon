import "server-only";

import { Prisma } from "@prisma/client";
import { resolveRecipients } from "./recipient-resolver";
import type {
	AppointmentNotificationSnapshot,
	NotificationEventType,
} from "./types";

interface EnqueueInput {
	salonId: string;
	appointmentId: string;
	type: NotificationEventType;
	notificationRevision?: number;
	scheduleRevision?: number;
	payload: AppointmentNotificationSnapshot;
	clientEmail?: string | null;
	ownerEmail?: string | null;
	ownerEmailNotificationsEnabled: boolean;
	specialistEmail?: string | null;
	hasSpecialist: boolean;
	availableAt?: Date;
}

interface AppointmentNotificationEventDelegate {
	upsert(args: unknown): Promise<{ id: string; eventKey: string }>;
}

type NotificationTransaction = {
	appointmentNotificationEvent: AppointmentNotificationEventDelegate;
};

export async function enqueueAppointmentNotification(
	tx: NotificationTransaction,
	input: EnqueueInput,
) {
	const eventKey = buildEventKey(input);
	const deliveries = resolveRecipients(input);
	return tx.appointmentNotificationEvent.upsert({
		where: { eventKey },
		create: {
			salonId: input.salonId,
			appointmentId: input.appointmentId,
			type: input.type,
			eventKey,
			scheduleRevision: input.scheduleRevision,
			payload: input.payload as unknown as Prisma.InputJsonValue,
			availableAt: input.availableAt,
			deliveries: { create: deliveries },
		},
		update: {},
		select: { id: true, eventKey: true },
	});
}

export function buildEventKey(
	input: Pick<
		EnqueueInput,
		"type" | "appointmentId" | "notificationRevision" | "scheduleRevision"
	>,
): string {
	switch (input.type) {
		case "created":
			return `created:${input.appointmentId}`;
		case "cancelled":
			return `cancelled:${input.appointmentId}:${requiredRevision(input.notificationRevision)}`;
		case "rescheduled":
			return `rescheduled:${input.appointmentId}:${requiredRevision(input.scheduleRevision)}`;
		case "reminder_24h":
			return `reminder_24h:${input.appointmentId}:${requiredRevision(input.scheduleRevision)}`;
		default:
			throw new Error(
				`Unsupported notification event type: ${input.type satisfies never}`,
			);
	}
}

function requiredRevision(revision: number | undefined): number {
	if (!Number.isInteger(revision) || revision === undefined || revision < 0) {
		throw new Error("A non-negative notification revision is required");
	}
	return revision;
}
