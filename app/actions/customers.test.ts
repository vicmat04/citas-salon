import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireSalonOwner: vi.fn(),
	customerFindFirst: vi.fn(),
	customerCreate: vi.fn(),
	customerUpdate: vi.fn(),
	customerDeleteMany: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", () => ({
	requireSalonOwner: mocks.requireSalonOwner,
}));
vi.mock("@/lib/db", () => ({
	default: {
		customer: {
			findFirst: mocks.customerFindFirst,
			create: mocks.customerCreate,
			update: mocks.customerUpdate,
			deleteMany: mocks.customerDeleteMany,
		},
	},
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createCustomer, deleteCustomer, updateCustomer } from "./customers";

function form(values: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

describe("customers server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireSalonOwner.mockResolvedValue({
			salon: { id: "salon-1", slug: "demo" },
		});
		mocks.customerFindFirst.mockResolvedValue(null);
		mocks.customerCreate.mockResolvedValue({ id: "cust-1", fullName: "Maria" });
		mocks.customerUpdate.mockResolvedValue({
			id: "cust-1",
			fullName: "Maria Lopez",
		});
		mocks.customerDeleteMany.mockResolvedValue({ count: 1 });
	});

	describe("createCustomer", () => {
		it("requires fullName and valid phone", async () => {
			const result = await createCustomer(
				form({ fullName: "A", phone: "123" }),
				"demo",
			);
			expect(result).toEqual({
				error: "El nombre completo del cliente es obligatorio",
			});
		});

		it("returns conflict error if phone or email already exists in salon", async () => {
			mocks.customerFindFirst.mockResolvedValue({
				id: "existing-cust-123",
				fullName: "Maria Existente",
			});

			const result = await createCustomer(
				form({
					fullName: "Maria Lopez",
					phone: "+507 60001122",
					email: "maria@example.com",
				}),
				"demo",
			);

			expect(result.conflict).toBe(true);
			expect(result.existingCustomerId).toBe("existing-cust-123");
			expect(result.message).toContain("Ya existe un cliente");
			expect(mocks.customerCreate).not.toHaveBeenCalled();
		});

		it("creates customer when data is valid and unique", async () => {
			const result = await createCustomer(
				form({
					fullName: "Maria Lopez",
					phone: "+507 60001122",
					notes: "Alergia a tintes",
				}),
				"demo",
			);

			expect(result.success).toBe(true);
			expect(mocks.customerCreate).toHaveBeenCalledWith({
				data: expect.objectContaining({
					salonId: "salon-1",
					fullName: "Maria Lopez",
					phone: "+507 60001122",
					notes: "Alergia a tintes",
				}),
			});
		});
	});

	describe("updateCustomer", () => {
		it("updates customer details for salon", async () => {
			mocks.customerFindFirst.mockResolvedValue({
				id: "cust-1",
				salonId: "salon-1",
			});

			const result = await updateCustomer(
				"cust-1",
				form({ fullName: "Maria Lopez Editada", phone: "+507 60001122" }),
				"demo",
			);

			expect(result.success).toBe(true);
			expect(mocks.customerUpdate).toHaveBeenCalledWith({
				where: { id: "cust-1" },
				data: expect.objectContaining({
					fullName: "Maria Lopez Editada",
				}),
			});
		});
	});

	describe("deleteCustomer", () => {
		it("deletes customer cleanly", async () => {
			const result = await deleteCustomer("cust-1", "demo");
			expect(result.success).toBe(true);
			expect(mocks.customerDeleteMany).toHaveBeenCalledWith({
				where: { id: "cust-1", salonId: "salon-1" },
			});
		});
	});
});
