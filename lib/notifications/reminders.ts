import "server-only";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/db";
import { buildAppointmentSnapshot } from "./appointment-snapshot";
import { dispatchEvent } from "./dispatcher";
import { enqueueAppointmentNotification } from "./enqueue";

export const CANDIDATE_LIMIT = 100;
export const DELIVERY_LIMIT = 20;
const ABANDONED_SENDING_MINUTES = 15;
const DEFAULT_RETENTION_DAYS = 90;

export interface ReminderCandidate {
	appointmentId: string;
	salonId?: string;
	status: string;
	scheduleRevision: number;
	startsAt: Date;
}

interface ReminderDb {
	$queryRaw(query: Prisma.Sql): Promise<ReminderCandidate[]>;
	$transaction<T>(
		callback: (tx: ReminderTransaction) => Promise<T>,
	): Promise<T>;
}

interface ReminderTransaction {
	$queryRaw(query: Prisma.Sql): Promise<ReminderCandidate[]>;
	appointment: {
		findFirst(args: unknown): Promise<ReminderAppointment | null>;
	};
	appointmentNotificationEvent?: unknown;
}

interface ReminderAppointment {
	id: string;
	salonId: string;
	status: string;
	scheduleRevision: number;
	appointmentDate: Date;
	startTime: Date;
	endTime: Date;
	totalPriceSnapshot: number | string | { toString(): string };
	customer: { fullName: string; email: string | null } | null;
	specialist: { name: string; email: string | null } | null;
	appointmentServices: Array<{
		service: { name: string } | null;
		priceSnapshot: number | string | { toString(): string };
	}>;
	salon: {
		name: string;
		timezone: string;
		ownerEmailNotificationsEnabled: boolean;
		owner: { email: string | null };
	};
}

interface CronDb {
	appointmentNotificationDelivery: {
		updateMany(args: unknown): Promise<{ count: number }>;
		findMany(args: unknown): Promise<Array<{ eventId: string }>>;
	};
	$executeRaw(query: Prisma.Sql): Promise<number>;
}

type EnqueueFunction = (
	tx: ReminderTransaction,
	input: Parameters<typeof enqueueAppointmentNotification>[1],
) => Promise<{ id: string; eventKey: string }>;

interface EnqueueReminderOptions {
	db?: ReminderDb;
	now?: Date;
	reminderHours?: number;
	candidateLimit?: number;
	enqueue?: EnqueueFunction;
}

export function isReminderCandidateCurrent(
	candidate: ReminderCandidate,
	expectedRevision: number,
	now: Date,
	reminderHours: number,
): boolean {
	if (candidate.status !== "pending" && candidate.status !== "confirmed") {
		return false;
	}
	if (candidate.scheduleRevision !== expectedRevision) return false;
	const startsAt = new Date(candidate.startsAt).getTime();
	return (
		startsAt > now.getTime() &&
		startsAt <= now.getTime() + reminderHours * 60 * 60 * 1000
	);
}

export async function enqueueReminderCandidates(
	options: EnqueueReminderOptions = {},
): Promise<{ candidates: number; enqueued: number; stale: number }> {
	const db = options.db ?? (prisma as unknown as ReminderDb);
	const now = options.now ?? new Date();
	const reminderHours = options.reminderHours ?? 24;
	const candidateLimit = options.candidateLimit ?? CANDIDATE_LIMIT;
	const enqueue: EnqueueFunction =
		options.enqueue ??
		(enqueueAppointmentNotification as unknown as EnqueueFunction);
	const deadline = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
	const candidates = await db.$queryRaw(Prisma.sql`
		SELECT a.id AS "appointmentId", a.salon_id AS "salonId",
		       a.status, a.schedule_revision AS "scheduleRevision",
		       ((a.appointment_date + a.start_time) AT TIME ZONE s.timezone) AS "startsAt"
		FROM appointments a
		JOIN salons s ON s.id = a.salon_id
		WHERE a.status IN ('pending', 'confirmed')
		  AND ((a.appointment_date + a.start_time) AT TIME ZONE s.timezone) > ${now}
		  AND ((a.appointment_date + a.start_time) AT TIME ZONE s.timezone) <= ${deadline}
		ORDER BY "startsAt" ASC
		LIMIT ${candidateLimit}
	`);
	let enqueued = 0;
	let stale = 0;
	await Promise.all(
		candidates.map(async (candidate) => {
			const created = await db.$transaction(async (tx) => {
				const currentRows = await tx.$queryRaw(Prisma.sql`
					SELECT a.id AS "appointmentId", a.salon_id AS "salonId",
					       a.status, a.schedule_revision AS "scheduleRevision",
					       ((a.appointment_date + a.start_time) AT TIME ZONE s.timezone) AS "startsAt"
					FROM appointments a
					JOIN salons s ON s.id = a.salon_id
					WHERE a.id = ${candidate.appointmentId}
				`);
				const current = currentRows[0];
				if (
					!current ||
					!isReminderCandidateCurrent(
						current,
						candidate.scheduleRevision,
						now,
						reminderHours,
					)
				) {
					return false;
				}
				const appointment = await tx.appointment.findFirst({
					where: {
						id: candidate.appointmentId,
						...(current.salonId ? { salonId: current.salonId } : {}),
						status: { in: ["pending", "confirmed"] },
						scheduleRevision: candidate.scheduleRevision,
					},
					include: {
						customer: { select: { fullName: true, email: true } },
						specialist: { select: { name: true, email: true } },
						appointmentServices: {
							include: { service: { select: { name: true } } },
						},
						salon: {
							select: {
								name: true,
								timezone: true,
								ownerEmailNotificationsEnabled: true,
								owner: { select: { email: true } },
							},
						},
					},
				});
				if (!appointment) return false;
				await enqueue(tx, {
					salonId: appointment.salonId,
					appointmentId: appointment.id,
					type: "reminder_24h",
					scheduleRevision: appointment.scheduleRevision,
					payload: buildAppointmentSnapshot({
						salonName: appointment.salon.name,
						timezone: appointment.salon.timezone,
						customerName: appointment.customer?.fullName || "Cliente",
						appointmentDate: appointment.appointmentDate,
						startTime: appointment.startTime,
						endTime: appointment.endTime,
						services: appointment.appointmentServices.map((item) => ({
							name: item.service?.name || "Servicio",
							price: item.priceSnapshot,
						})),
						specialistName: appointment.specialist?.name,
						total: appointment.totalPriceSnapshot,
					}),
					clientEmail: appointment.customer?.email,
					ownerEmail: appointment.salon.owner.email,
					ownerEmailNotificationsEnabled:
						appointment.salon.ownerEmailNotificationsEnabled,
					specialistEmail: appointment.specialist?.email,
					hasSpecialist: Boolean(appointment.specialist),
				});
				return true;
			});
			if (created) enqueued += 1;
			else stale += 1;
		}),
	);
	return { candidates: candidates.length, enqueued, stale };
}

export async function recoverAbandonedDeliveries(
	db: {
		appointmentNotificationDelivery: {
			updateMany(args: unknown): Promise<{ count: number }>;
		};
	},
	now = new Date(),
): Promise<number> {
	const cutoff = new Date(
		now.getTime() - ABANDONED_SENDING_MINUTES * 60 * 1000,
	);
	const result = await db.appointmentNotificationDelivery.updateMany({
		where: { status: "sending", startedAt: { lt: cutoff } },
		data: {
			status: "failed",
			resultCode: "unknown_after_send",
			recipientEmail: null,
		},
	});
	return result.count;
}

async function skipIneligiblePendingReminders(
	db: Pick<CronDb, "$executeRaw">,
	now: Date,
	reminderHours: number,
): Promise<number> {
	const deadline = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
	const skipped = await db.$executeRaw(Prisma.sql`
		UPDATE appointment_notification_deliveries d
		SET status = 'skipped', result_code = 'appointment_ineligible',
		    recipient_email = NULL, updated_at = ${now}
		FROM appointment_notification_events e
		JOIN appointments a ON a.id = e.appointment_id AND a.salon_id = e.salon_id
		JOIN salons s ON s.id = a.salon_id
		WHERE d.event_id = e.id AND d.status = 'pending'
		  AND e.type = 'reminder_24h'
		  AND (a.status NOT IN ('pending', 'confirmed')
		    OR e.schedule_revision IS DISTINCT FROM a.schedule_revision
		    OR ((a.appointment_date + a.start_time) AT TIME ZONE s.timezone) <= ${now}
		    OR ((a.appointment_date + a.start_time) AT TIME ZONE s.timezone) > ${deadline})
	`);
	await db.$executeRaw(Prisma.sql`
		UPDATE appointment_notification_events e
		SET status = 'completed', completed_at = ${now}
		WHERE e.type = 'reminder_24h'
		  AND e.status IN ('pending', 'processing')
		  AND NOT EXISTS (
			SELECT 1 FROM appointment_notification_deliveries d
			WHERE d.event_id = e.id AND d.status IN ('pending', 'sending')
		  )
	`);
	return skipped;
}

async function purgeExpiredEvents(
	db: Pick<CronDb, "$executeRaw">,
	now: Date,
	retentionDays: number,
): Promise<number> {
	const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
	return db.$executeRaw(Prisma.sql`
		DELETE FROM appointment_notification_events
		WHERE id IN (
			SELECT id FROM appointment_notification_events
			WHERE status IN ('completed', 'partial_failed')
			  AND completed_at < ${cutoff}
			ORDER BY completed_at ASC
			LIMIT 500
		)
	`);
}

const zeroCounters = {
	candidates: 0,
	eventsEnqueued: 0,
	staleCandidates: 0,
	deliveriesProcessed: 0,
	recoveredUnknown: 0,
	staleRemindersSkipped: 0,
	purgedEvents: 0,
};

interface RunCronOptions {
	db?: CronDb;
	now?: Date;
	operationalEnabled?: boolean;
	remindersEnabled?: boolean;
	enqueueCandidates?: typeof enqueueReminderCandidates;
	dispatch?: typeof dispatchEvent;
}

export async function runNotificationCron(options: RunCronOptions = {}) {
	const operationalEnabled =
		options.operationalEnabled ??
		process.env.OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED === "true";
	if (!operationalEnabled) return { disabled: true as const, ...zeroCounters };
	const remindersEnabled =
		options.remindersEnabled ??
		process.env.APPOINTMENT_REMINDERS_ENABLED === "true";
	const db = options.db ?? (prisma as unknown as CronDb);
	const now = options.now ?? new Date();
	const configuredReminderHours = Number(
		process.env.APPOINTMENT_REMINDER_HOURS,
	);
	const reminderHours =
		Number.isInteger(configuredReminderHours) && configuredReminderHours > 0
			? configuredReminderHours
			: 24;
	const retentionValue = Number(process.env.NOTIFICATION_RETENTION_DAYS);
	const retentionDays =
		Number.isInteger(retentionValue) && retentionValue > 0
			? retentionValue
			: DEFAULT_RETENTION_DAYS;
	const recoveredUnknown = await recoverAbandonedDeliveries(db, now);
	const reminderResult = remindersEnabled
		? await (options.enqueueCandidates ?? enqueueReminderCandidates)({
				db: db as unknown as ReminderDb,
				now,
				reminderHours,
				candidateLimit: CANDIDATE_LIMIT,
			})
		: { candidates: 0, enqueued: 0, stale: 0 };
	const staleRemindersSkipped = remindersEnabled
		? await skipIneligiblePendingReminders(db, now, reminderHours)
		: 0;
	const pending = await db.appointmentNotificationDelivery.findMany({
		where: { status: "pending", event: { availableAt: { lte: now } } },
		select: { eventId: true },
		distinct: ["eventId"],
		orderBy: { createdAt: "asc" },
		take: DELIVERY_LIMIT,
	});
	let deliveriesProcessed = 0;
	for (const { eventId } of pending) {
		const remaining = DELIVERY_LIMIT - deliveriesProcessed;
		if (remaining <= 0) break;
		const result = await (options.dispatch ?? dispatchEvent)(eventId, {
			enabled: true,
			maxDeliveries: remaining,
		});
		deliveriesProcessed +=
			"processed" in result && typeof result.processed === "number"
				? result.processed
				: result.sent + result.failed;
	}
	const purgedEvents = await purgeExpiredEvents(db, now, retentionDays);
	return {
		candidates: reminderResult.candidates,
		eventsEnqueued: reminderResult.enqueued,
		staleCandidates: reminderResult.stale,
		deliveriesProcessed,
		recoveredUnknown,
		staleRemindersSkipped,
		purgedEvents,
	};
}
