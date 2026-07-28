import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireSalonOwner: vi.fn(),
	salonUpdate: vi.fn(),
	specialistCreate: vi.fn(),
	specialistDeleteMany: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", () => ({
	requireSalonOwner: mocks.requireSalonOwner,
}));
vi.mock("@/lib/db", () => ({
	default: {
		salon: { update: mocks.salonUpdate },
		specialist: {
			create: mocks.specialistCreate,
			deleteMany: mocks.specialistDeleteMany,
		},
	},
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
	createSpecialist,
	deleteSpecialist,
	updateSalonSettings,
} from "./owner";

function form(values: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

describe("owner actions", () => {
	beforeEach(() => {
		mocks.requireSalonOwner.mockResolvedValue({
			salon: { id: "verified-salon" },
		});
		mocks.salonUpdate.mockResolvedValue({ id: "verified-salon" });
		mocks.specialistCreate.mockResolvedValue({ id: "specialist-1" });
		mocks.specialistDeleteMany.mockResolvedValue({ count: 1 });
	});

	it("updates only the salon freshly verified from the slug", async () => {
		const result = await updateSalonSettings(
			form({
				name: "Acme",
				slogan: "",
				phone: "",
				address: "",
				themeColor: "#112233",
			}),
			"acme",
		);

		expect(result).toEqual({ success: true });
		expect(mocks.requireSalonOwner).toHaveBeenCalledWith("acme");
		expect(mocks.salonUpdate).toHaveBeenCalledWith({
			where: { id: "verified-salon" },
			data: {
				name: "Acme",
				slogan: null,
				phone: null,
				address: null,
				themeColor: "#112233",
				notificationEmails: null,
			},
		});
	});

	it("creates a specialist with the verified salon ID rather than client tenant input", async () => {
		await createSpecialist(
			form({ name: "Lin", email: "", phone: "", specialty: "Color" }),
			"acme",
		);

		expect(mocks.specialistCreate).toHaveBeenCalledWith({
			data: {
				salonId: "verified-salon",
				name: "Lin",
				email: null,
				phone: null,
				specialty: "Color",
			},
		});
	});

	it("scopes specialist deletion to both resource and verified salon IDs", async () => {
		await expect(
			deleteSpecialist("specialist-from-other-salon", "acme"),
		).resolves.toEqual({
			success: true,
		});
		expect(mocks.specialistDeleteMany).toHaveBeenCalledWith({
			where: { id: "specialist-from-other-salon", salonId: "verified-salon" },
		});
	});

	it("returns not found when the scoped specialist predicate deletes nothing", async () => {
		mocks.specialistDeleteMany.mockResolvedValue({ count: 0 });
		await expect(deleteSpecialist("missing", "acme")).resolves.toEqual({
			error: "Especialista no encontrado.",
		});
	});

	it.each([
		["settings", () => updateSalonSettings(form({ name: "Acme" }), "acme")],
		["create", () => createSpecialist(form({ name: "Lin" }), "acme")],
		["delete", () => deleteSpecialist("specialist-1", "acme")],
	])(
		"performs no %s write when the fresh lifecycle/owner guard blocks",
		async (_name, action) => {
			mocks.requireSalonOwner.mockRejectedValue(new Error("INACTIVE"));

			await expect(action()).rejects.toThrow("INACTIVE");
			expect(mocks.salonUpdate).not.toHaveBeenCalled();
			expect(mocks.specialistCreate).not.toHaveBeenCalled();
			expect(mocks.specialistDeleteMany).not.toHaveBeenCalled();
		},
	);
});
