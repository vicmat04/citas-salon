import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
	Geist: () => ({ variable: "geist-sans" }),
	Geist_Mono: () => ({ variable: "geist-mono" }),
}));

const projectFile = (path: string) => join(process.cwd(), path);

function pngDimensions(path: string) {
	const image = readFileSync(projectFile(path));
	return {
		width: image.readUInt32BE(16),
		height: image.readUInt32BE(20),
	};
}

describe("PWA metadata and progressive web behavior", () => {
	it("publishes the Citas Salón manifest with installable icon purposes", async () => {
		const { default: manifest } = await import("./manifest");

		expect(manifest()).toMatchObject({
			name: "Citas Salón",
			short_name: "Citas Salón",
			start_url: "/",
			display: "standalone",
			background_color: "#ffffff",
			theme_color: "#18181b",
			icons: [
				{
					src: "/icons/icon-192.png",
					sizes: "192x192",
					type: "image/png",
					purpose: "any",
				},
				{
					src: "/icons/icon-512.png",
					sizes: "512x512",
					type: "image/png",
					purpose: "any",
				},
				{
					src: "/icons/maskable-512.png",
					sizes: "512x512",
					type: "image/png",
					purpose: "maskable",
				},
			],
		});
	});

	it("exports Spanish product, Apple, manifest, theme, and safe-area metadata", async () => {
		const {
			default: RootLayout,
			metadata,
			viewport,
		} = await import("./layout");
		const root = RootLayout({ children: null });

		expect(root.props.lang).toBe("es");
		expect(metadata).toMatchObject({
			title: "Citas Salón",
			description: expect.stringContaining("citas"),
			applicationName: "Citas Salón",
			manifest: "/manifest.webmanifest",
			appleWebApp: {
				capable: true,
				title: "Citas Salón",
				statusBarStyle: "black-translucent",
			},
			icons: {
				apple: "/icons/apple-touch-icon.png",
			},
		});
		expect(viewport).toMatchObject({
			width: "device-width",
			initialScale: 1,
			viewportFit: "cover",
			themeColor: "#18181b",
		});
	});

	it("ships correctly sized PNG assets", () => {
		expect(pngDimensions("public/icons/icon-192.png")).toEqual({
			width: 192,
			height: 192,
		});
		expect(pngDimensions("public/icons/icon-512.png")).toEqual({
			width: 512,
			height: 512,
		});
		expect(pngDimensions("public/icons/maskable-512.png")).toEqual({
			width: 512,
			height: 512,
		});
		expect(pngDimensions("public/icons/apple-touch-icon.png")).toEqual({
			width: 180,
			height: 180,
		});
	});

	it("keeps registration production/HTTPS-only and the worker cache-free", async () => {
		const { canRegisterServiceWorker } = await import("./pwa-register");
		const worker = readFileSync(projectFile("public/sw.js"), "utf8");

		expect(canRegisterServiceWorker("production", "https:", true)).toBe(true);
		expect(canRegisterServiceWorker("development", "https:", true)).toBe(false);
		expect(canRegisterServiceWorker("production", "http:", true)).toBe(false);
		expect(canRegisterServiceWorker("production", "https:", false)).toBe(false);
		expect(worker).not.toMatch(/addEventListener\(["']fetch["']/);
		expect(worker).not.toContain("caches.");
		expect(worker).not.toContain("indexedDB");
	});
});
