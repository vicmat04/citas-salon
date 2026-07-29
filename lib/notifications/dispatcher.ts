import "server-only";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/db";
import { sendEmailUnit } from "@/lib/email/mailer";
import { renderNotificationEmail } from "./templates";
import {
	DELIVERY_CONCURRENCY,
	type AppointmentNotificationSnapshot,
	type NotificationEventType,
	type NotificationRole,
	type SafeEmailResult,
} from "./types";

interface DeliveryRow {
	id: string;
	eventId: string;
	roles: string[];
	recipientEmail: string | null;
	event: { id: string; type: string; payload: unknown };
}

interface DispatcherDb {
	$executeRaw(query: Prisma.Sql): Promise<number>;
	appointmentNotificationDelivery: {
		findMany(args: unknown): Promise<DeliveryRow[]>;
		updateMany(args: unknown): Promise<{ count: number }>;
		update(args: unknown): Promise<unknown>;
		count(args: unknown): Promise<number>;
	};
	appointmentNotificationEvent: { update(args: unknown): Promise<unknown> };
}

interface DispatchDependencies {
	db?: DispatcherDb;
	sendEmail?: (options: {
		to: string;
		subject: string;
		htmlBody: string;
	}) => Promise<SafeEmailResult>;
	enabled?: boolean;
	maxDeliveries?: number;
}

export async function dispatchEvent(
	eventId: string,
	dependencies: DispatchDependencies = {},
): Promise<{
	eventId: string;
	disabled?: true;
	sent: number;
	failed: number;
	processed?: number;
}> {
	const enabled =
		dependencies.enabled ??
		process.env.OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED === "true";
	if (!enabled) return { eventId, disabled: true, sent: 0, failed: 0 };
	const db = dependencies.db ?? (prisma as unknown as DispatcherDb);
	const sendEmail = dependencies.sendEmail ?? sendEmailUnit;
	const deliveries = await db.appointmentNotificationDelivery.findMany({
		where: { eventId, status: "pending" },
		include: { event: true },
		orderBy: { createdAt: "asc" },
		...(dependencies.maxDeliveries ? { take: dependencies.maxDeliveries } : {}),
	});
	const outcomes = await mapWithConcurrency(
		deliveries,
		DELIVERY_CONCURRENCY,
		async (delivery) => {
			const claimed =
				delivery.event.type === "reminder_24h"
					? await claimCurrentReminder(db, delivery.id, eventId)
					: (
							await db.appointmentNotificationDelivery.updateMany({
								where: { id: delivery.id, eventId, status: "pending" },
								data: {
									status: "sending",
									startedAt: new Date(),
									attemptCount: { increment: 1 },
								},
							})
						).count;
			if (claimed !== 1) return "unclaimed" as const;
			if (!delivery.recipientEmail) {
				await finalize(db, delivery.id, "skipped", "missing_email");
				return "skipped" as const;
			}
			try {
				const rendered = renderNotificationEmail({
					type: delivery.event.type as NotificationEventType,
					roles: delivery.roles as NotificationRole[],
					snapshot: delivery.event.payload as AppointmentNotificationSnapshot,
				});
				const result = await sendEmail({
					to: delivery.recipientEmail,
					...rendered,
				});
				if (result.accepted) {
					await db.appointmentNotificationDelivery.update({
						where: { id: delivery.id },
						data: {
							status: "sent",
							resultCode: null,
							sentAt: new Date(),
							recipientEmail: null,
						},
					});
					return "sent" as const;
				}
				await finalize(
					db,
					delivery.id,
					"failed",
					result.errorCode ?? "unknown_after_send",
				);
				return "failed" as const;
			} catch {
				await finalize(db, delivery.id, "failed", "unknown_after_send");
				return "failed" as const;
			}
		},
	);
	const sent = outcomes.filter((outcome) => outcome === "sent").length;
	const failed = outcomes.filter((outcome) => outcome === "failed").length;
	const unfinished = await db.appointmentNotificationDelivery.count({
		where: { eventId, status: { in: ["pending", "sending"] } },
	});
	if (unfinished === 0) {
		const totalFailed = await db.appointmentNotificationDelivery.count({
			where: { eventId, status: "failed" },
		});
		await db.appointmentNotificationEvent.update({
			where: { id: eventId },
			data: {
				status: totalFailed > 0 ? "partial_failed" : "completed",
				completedAt: new Date(),
			},
		});
	}
	const processed = outcomes.filter(
		(outcome) => outcome && outcome !== "unclaimed",
	).length;
	return { eventId, sent, failed, processed };
}

async function claimCurrentReminder(
	db: DispatcherDb,
	deliveryId: string,
	eventId: string,
): Promise<number> {
	const claimedAt = new Date();
	return db.$executeRaw(Prisma.sql`
		UPDATE appointment_notification_deliveries d
		SET status = 'sending', started_at = ${claimedAt},
		    attempt_count = d.attempt_count + 1, updated_at = ${claimedAt}
		FROM appointment_notification_events e
		JOIN appointments a
		  ON a.id = e.appointment_id AND a.salon_id = e.salon_id
		JOIN salons s ON s.id = a.salon_id
		WHERE d.id = ${deliveryId} AND d.event_id = ${eventId}
		  AND d.event_id = e.id AND d.status = 'pending'
		  AND e.type = 'reminder_24h'
		  AND a.status IN ('pending', 'confirmed')
		  AND e.schedule_revision = a.schedule_revision
		  AND ((a.appointment_date + a.start_time) AT TIME ZONE s.timezone) > ${claimedAt}
	`);
}

async function finalize(
	db: DispatcherDb,
	id: string,
	status: "skipped" | "failed",
	resultCode: string,
): Promise<void> {
	await db.appointmentNotificationDelivery.update({
		where: { id },
		data: { status, resultCode, recipientEmail: null },
	});
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
