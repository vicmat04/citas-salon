import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
	copyPublicUrl,
	PublicLinkActions,
	resolvePublicUrl,
	sharePublicUrl,
	supportsWebShare,
} from "./public-link-actions";

describe("PublicLinkActions", () => {
	it("renders a non-navigating public link trigger", () => {
		const markup = renderToStaticMarkup(
			<PublicLinkActions href="/book/acme" />,
		);

		expect(markup).toContain("Enlace público");
		expect(markup).toContain("button");
	});

	it("resolves the public booking URL from the current origin", () => {
		expect(resolvePublicUrl("/book/acme", "https://citasglam.com")).toBe(
			"https://citasglam.com/book/acme",
		);
	});

	it("detects whether the browser can use native sharing", () => {
		expect(supportsWebShare({ share: () => undefined })).toBe(true);
		expect(supportsWebShare({})).toBe(false);
		expect(supportsWebShare(undefined)).toBe(false);
	});

	it("copies through clipboard first and falls back to legacy copy", async () => {
		const clipboardWrites: string[] = [];
		await expect(
			copyPublicUrl("https://citasglam.com/book/acme", {
				clipboardWriteText: async (text) => {
					clipboardWrites.push(text);
				},
			}),
		).resolves.toBe(true);
		expect(clipboardWrites).toEqual(["https://citasglam.com/book/acme"]);

		await expect(
			copyPublicUrl("https://citasglam.com/book/acme", {
				fallbackCopy: (text) => text.endsWith("/book/acme"),
			}),
		).resolves.toBe(true);

		await expect(
			copyPublicUrl("https://citasglam.com/book/acme", {}),
		).resolves.toBe(false);
	});

	it("reports native share outcomes for success, unsupported, and failure", async () => {
		await expect(
			sharePublicUrl("https://citasglam.com/book/acme", {
				share: async ({ url }) => {
					expect(url).toBe("https://citasglam.com/book/acme");
				},
			}),
		).resolves.toBe("shared");

		await expect(
			sharePublicUrl("https://citasglam.com/book/acme", {}),
		).resolves.toBe("unsupported");
		await expect(
			sharePublicUrl("https://citasglam.com/book/acme", {
				share: async () => {
					throw new Error("share failed");
				},
			}),
		).resolves.toBe("failed");
	});
});
