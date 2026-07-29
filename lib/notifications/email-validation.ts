import type { SafeEmailErrorCode } from "./types";

const EMAIL_PATTERN =
	/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function validateEmail(
	email: string | null | undefined,
):
	| { valid: true; normalized: string }
	| {
			valid: false;
			resultCode: Extract<
				SafeEmailErrorCode,
				"missing_email" | "invalid_email"
			>;
	  } {
	if (!email?.trim()) return { valid: false, resultCode: "missing_email" };
	const normalized = normalizeEmail(email);
	if (
		normalized.length > 254 ||
		normalized.includes("\r") ||
		normalized.includes("\n") ||
		!EMAIL_PATTERN.test(normalized)
	) {
		return { valid: false, resultCode: "invalid_email" };
	}
	return { valid: true, normalized };
}

export function maskEmail(email: string): string {
	const normalized = normalizeEmail(email);
	const separator = normalized.lastIndexOf("@");
	if (separator < 1) return "***";
	return `${normalized[0]}***${normalized.slice(separator)}`;
}
