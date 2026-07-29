export const NOTIFICATION_EVENT_TYPES = [
	"created",
	"cancelled",
	"rescheduled",
	"reminder_24h",
] as const;
export const NOTIFICATION_ROLES = ["client", "owner", "specialist"] as const;
export const DELIVERY_CONCURRENCY = 3;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];
export type NotificationRole = (typeof NOTIFICATION_ROLES)[number];
export const DELIVERY_STATUSES = [
	"pending",
	"sending",
	"sent",
	"skipped",
	"failed",
] as const;
export const SAFE_EMAIL_ERROR_CODES = [
	"missing_email",
	"invalid_email",
	"owner_disabled",
	"duplicate_merged",
	"provider_rejected",
	"oauth_failed",
	"network_error",
	"appointment_rescheduled",
	"appointment_ineligible",
	"unknown_after_send",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export type SafeEmailErrorCode = (typeof SAFE_EMAIL_ERROR_CODES)[number];

export interface AppointmentNotificationSnapshot {
	salonName: string;
	customerName: string;
	appointmentDate: string;
	startTime: string;
	endTime: string;
	services: Array<{ name: string; price: string }>;
	specialistName?: string;
	total: string;
	cancellationReason?: string;
}

export interface NotificationDeliveryDraft {
	roles: NotificationRole[];
	recipientEmail: string | null;
	recipientMasked: string | null;
	recipientKey: string;
	status: "pending" | "skipped";
	resultCode: SafeEmailErrorCode | null;
}

export interface SafeEmailResult {
	accepted: boolean;
	providerMessageId?: string;
	errorCode?: SafeEmailErrorCode;
}
