import { describe, expect, it } from "vitest";

import { maskEmail, normalizeEmail, validateEmail } from "./email-validation";

describe("notification email validation", () => {
	it("normalizes usable addresses without preserving surrounding whitespace or case", () => {
		expect(normalizeEmail("  Person.Name+tag@Example.COM ")).toBe(
			"person.name+tag@example.com",
		);
	});

	it.each([
		[undefined, "missing_email"],
		["", "missing_email"],
		["not-an-email", "invalid_email"],
		["a@b", "invalid_email"],
		["victim@example.com\r\nBcc: leak@example.com", "invalid_email"],
	])("rejects %s with a safe code", (email, resultCode) => {
		expect(validateEmail(email)).toEqual({ valid: false, resultCode });
	});

	it("returns only a masked representation for observability", () => {
		expect(maskEmail("maria.lopez@example.com")).toBe("m***@example.com");
		expect(maskEmail("a@example.com")).toBe("a***@example.com");
	});
});
