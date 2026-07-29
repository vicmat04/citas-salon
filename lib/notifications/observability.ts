import "server-only";

import {
	DELIVERY_STATUSES,
	SAFE_EMAIL_ERROR_CODES,
	type DeliveryStatus,
	type NotificationEventType,
	type NotificationRole,
	type SafeEmailErrorCode,
} from "./types";

interface StoredDelivery {
	roles: string[];
	status: string;
	resultCode: string | null;
	recipientMasked: string | null;
	updatedAt: Date;
	// Accepted so callers may pass a Prisma row; deliberately never projected.
	recipientEmail?: string | null;
	providerMessageId?: string | null;
}

interface StoredNotificationEvent {
	type: string;
	createdAt: Date;
	deliveries: StoredDelivery[];
	payload?: unknown;
}

export function projectAppointmentNotificationEvents(
	events: StoredNotificationEvent[],
): Array<{
	type: NotificationEventType;
	createdAt: string;
	deliveries: ReturnType<typeof projectNotificationDeliveries>;
}> {
	return events.flatMap((event) => {
		if (
			event.type !== "created" &&
			event.type !== "cancelled" &&
			event.type !== "rescheduled" &&
			event.type !== "reminder_24h"
		) {
			return [];
		}
		return [
			{
				type: event.type,
				createdAt: event.createdAt.toISOString(),
				deliveries: projectNotificationDeliveries(event.deliveries),
			},
		];
	});
}

export function projectNotificationDeliveries(
	deliveries: StoredDelivery[],
): Array<{
	roles: NotificationRole[];
	status: DeliveryStatus;
	resultCode: SafeEmailErrorCode | null;
	recipientMasked: string | null;
	occurredAt: string;
}> {
	return deliveries.map((delivery) => ({
		roles: delivery.roles.filter(
			(role): role is NotificationRole =>
				role === "client" || role === "owner" || role === "specialist",
		),
		status: DELIVERY_STATUSES.includes(delivery.status as DeliveryStatus)
			? (delivery.status as DeliveryStatus)
			: "failed",
		resultCode:
			delivery.resultCode &&
			SAFE_EMAIL_ERROR_CODES.includes(delivery.resultCode as SafeEmailErrorCode)
				? (delivery.resultCode as SafeEmailErrorCode)
				: delivery.resultCode
					? "unknown_after_send"
					: null,
		recipientMasked: delivery.recipientMasked,
		occurredAt: delivery.updatedAt.toISOString(),
	}));
}
