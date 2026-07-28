import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/app/actions/admin", () => ({
	extendSalonTrial: vi.fn(),
	sendTrialExpirationNotice: vi.fn(),
	updateAdminNotes: vi.fn(),
	updateSalonStatusAndPlan: vi.fn(),
}));

import { SalonsView, type SalonListItem } from "./salons-view";

const salons: SalonListItem[] = [
	{
		id: "11111111-1111-4111-8111-111111111111",
		name: "Estudio Central",
		slug: "estudio-central",
		status: "trial",
		planId: "22222222-2222-4222-8222-222222222222",
		adminNotes: "Cliente prioritario",
		owner: { name: "Ana Pérez", email: "ana@example.com" },
		plan: { name: "Pro", isActive: true },
		latestTrial: {
			endDate: "2026-07-10T00:00:00.000Z",
			planName: "Pro",
		},
	},
];

const plans = [{ id: "22222222-2222-4222-8222-222222222222", name: "Pro" }];

describe("SalonsView", () => {
	it("renders searchable salon data and the status and plan filters", () => {
		const markup = renderToStaticMarkup(
			<SalonsView salons={salons} plans={plans} />,
		);

		expect(markup).toContain("Nombre, slug o propietario");
		expect(markup).toContain("Todos los estados");
		expect(markup).toContain("Todos los planes");
		expect(markup).toContain("Estudio Central");
		expect(markup).toContain("estudio-central");
		expect(markup).toContain("Ana Pérez");
		expect(markup).toContain("ana@example.com");
		expect(markup).toContain("Gestionar");
		expect(markup).toContain("Vence el");
	});

	it("shows a useful empty state when the platform has no salons", () => {
		const markup = renderToStaticMarkup(
			<SalonsView salons={[]} plans={plans} />,
		);

		expect(markup).toContain("No hay salones registrados.");
		expect(markup).toContain("0 de 0 salones");
	});
});
