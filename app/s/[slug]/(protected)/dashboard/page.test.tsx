import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SalonDashboardPage from "./page";

describe("SalonDashboardPage", () => {
	it("renders compact owner summary totals", async () => {
		const page = await SalonDashboardPage({
			params: Promise.resolve({ slug: "acme" }),
		});
		const markup = renderToStaticMarkup(page);

		expect(markup).toContain("Citas de hoy");
		expect(markup).toContain("Total de servicios");
		expect(markup).toContain("Total de especialistas");
		expect(markup).toContain(">4<");
		expect(markup).toContain(">3<");
		expect(markup).toContain("Enlace público");
	});
});
