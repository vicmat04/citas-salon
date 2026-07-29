import "server-only";

import { maskEmail, validateEmail } from "./email-validation";
import type { NotificationDeliveryDraft, NotificationRole } from "./types";

interface RecipientInput {
	clientEmail?: string | null;
	ownerEmail?: string | null;
	ownerEmailNotificationsEnabled: boolean;
	specialistEmail?: string | null;
	hasSpecialist: boolean;
}

export function resolveRecipients(
	input: RecipientInput,
): NotificationDeliveryDraft[] {
	const candidates: Array<{
		role: NotificationRole;
		email?: string | null;
		disabled?: boolean;
	}> = [
		{ role: "client", email: input.clientEmail },
		{
			role: "owner",
			email: input.ownerEmail,
			disabled: !input.ownerEmailNotificationsEnabled,
		},
		{
			role: "specialist",
			email: input.hasSpecialist ? input.specialistEmail : undefined,
		},
	];
	const deliveries: NotificationDeliveryDraft[] = [];
	const usable = new Map<string, NotificationDeliveryDraft>();

	for (const candidate of candidates) {
		if (candidate.disabled) {
			deliveries.push(omitted(candidate.role, "owner_disabled"));
			continue;
		}
		const validation = validateEmail(candidate.email);
		if (!validation.valid) {
			deliveries.push(omitted(candidate.role, validation.resultCode));
			continue;
		}
		const duplicate = usable.get(validation.normalized);
		if (duplicate) {
			duplicate.roles.push(candidate.role);
			duplicate.resultCode = "duplicate_merged";
			continue;
		}
		const delivery: NotificationDeliveryDraft = {
			roles: [candidate.role],
			recipientEmail: validation.normalized,
			recipientMasked: maskEmail(validation.normalized),
			recipientKey: validation.normalized,
			status: "pending",
			resultCode: null,
		};
		usable.set(validation.normalized, delivery);
		deliveries.push(delivery);
	}
	return deliveries;
}

function omitted(
	role: NotificationRole,
	resultCode: "missing_email" | "invalid_email" | "owner_disabled",
): NotificationDeliveryDraft {
	return {
		roles: [role],
		recipientEmail: null,
		recipientMasked: null,
		recipientKey: `omitted:${role}`,
		status: "skipped",
		resultCode,
	};
}
