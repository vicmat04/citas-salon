import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	requireSalonOwner: vi.fn(),
	serviceCategoryCreate: vi.fn(),
	serviceCategoryFindFirst: vi.fn(),
	serviceCategoryUpdate: vi.fn(),
	serviceCategoryDelete: vi.fn(),
	serviceCount: vi.fn(),
	serviceCreate: vi.fn(),
	serviceFindFirst: vi.fn(),
	serviceUpdate: vi.fn(),
	serviceDeleteMany: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", () => ({
	requireSalonOwner: mocks.requireSalonOwner,
}));
vi.mock("@/lib/db", () => ({
	default: {
		serviceCategory: {
			create: mocks.serviceCategoryCreate,
			findFirst: mocks.serviceCategoryFindFirst,
			update: mocks.serviceCategoryUpdate,
			delete: mocks.serviceCategoryDelete,
		},
		service: {
			count: mocks.serviceCount,
			create: mocks.serviceCreate,
			findFirst: mocks.serviceFindFirst,
			update: mocks.serviceUpdate,
			deleteMany: mocks.serviceDeleteMany,
		},
	},
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
	createCategory,
	createService,
	deleteCategory,
	deleteService,
	toggleServiceActive,
	updateCategory,
	updateService,
} from "./services";

function form(values: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

describe("services server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireSalonOwner.mockResolvedValue({
			salon: { id: "salon-1", slug: "demo" },
		});
		mocks.serviceCategoryCreate.mockResolvedValue({
			id: "cat-1",
			name: "Cortes",
			sortOrder: 0,
		});
		mocks.serviceCategoryFindFirst.mockResolvedValue({
			id: "cat-1",
			salonId: "salon-1",
			name: "Cortes",
		});
		mocks.serviceCategoryUpdate.mockResolvedValue({
			id: "cat-1",
			name: "Cortes Top",
		});
		mocks.serviceCategoryDelete.mockResolvedValue({ id: "cat-1" });
		mocks.serviceCount.mockResolvedValue(0);

		mocks.serviceCreate.mockResolvedValue({
			id: "srv-1",
			name: "Corte Caballero",
			price: 15,
			durationMinutes: 30,
			bufferMinutes: 10,
		});
		mocks.serviceFindFirst.mockResolvedValue({
			id: "srv-1",
			salonId: "salon-1",
			name: "Corte",
			isActive: true,
		});
		mocks.serviceUpdate.mockResolvedValue({ id: "srv-1", isActive: false });
		mocks.serviceDeleteMany.mockResolvedValue({ count: 1 });
	});

	describe("category actions", () => {
		it("requires category name", async () => {
			const result = await createCategory(form({ name: "" }), "demo");
			expect(result).toEqual({
				error: "El nombre de la categoría es obligatorio",
			});
		});

		it("creates a service category with default sortOrder 0", async () => {
			const result = await createCategory(form({ name: "Coloración" }), "demo");
			expect(result.success).toBe(true);
			expect(mocks.serviceCategoryCreate).toHaveBeenCalledWith({
				data: {
					salonId: "salon-1",
					name: "Coloración",
					sortOrder: 0,
				},
			});
		});

		it("prevents deleting category if it contains services", async () => {
			mocks.serviceCount.mockResolvedValue(2);
			const result = await deleteCategory("cat-1", "demo");

			expect(result).toEqual({
				error:
					"No se puede eliminar una categoría que contiene servicios. Reasigna o elimina los servicios primero.",
			});
			expect(mocks.serviceCategoryDelete).not.toHaveBeenCalled();
		});

		it("deletes category if empty of services", async () => {
			mocks.serviceCount.mockResolvedValue(0);
			const result = await deleteCategory("cat-1", "demo");

			expect(result).toEqual({ success: true });
			expect(mocks.serviceCategoryDelete).toHaveBeenCalledWith({
				where: { id: "cat-1" },
			});
		});
	});

	describe("service actions", () => {
		it("creates service with default 10-minute buffer time", async () => {
			const result = await createService(
				form({ name: "Corte Dama", price: "25", durationMinutes: "45" }),
				"demo",
			);

			expect(result.success).toBe(true);
			expect(mocks.serviceCreate).toHaveBeenCalledWith({
				data: {
					salonId: "salon-1",
					categoryId: null,
					name: "Corte Dama",
					description: null,
					price: 25,
					durationMinutes: 45,
					bufferMinutes: 10,
					isActive: true,
				},
			});
		});

		it("validates negative price", async () => {
			const result = await createService(
				form({ name: "Barba", price: "-5", durationMinutes: "15" }),
				"demo",
			);
			expect(result).toEqual({
				error: "El precio debe ser un número mayor o igual a 0",
			});
		});

		it("validates zero duration", async () => {
			const result = await createService(
				form({ name: "Barba", price: "10", durationMinutes: "0" }),
				"demo",
			);
			expect(result).toEqual({
				error: "La duración debe ser mayor a 0 minutos",
			});
		});

		it("toggles service active status", async () => {
			const result = await toggleServiceActive("srv-1", "demo");
			expect(result).toEqual({ success: true, isActive: false });
			expect(mocks.serviceUpdate).toHaveBeenCalledWith({
				where: { id: "srv-1" },
				data: { isActive: false },
			});
		});

		it("deletes service cleanly", async () => {
			const result = await deleteService("srv-1", "demo");
			expect(result).toEqual({ success: true });
			expect(mocks.serviceDeleteMany).toHaveBeenCalledWith({
				where: { id: "srv-1", salonId: "salon-1" },
			});
		});
	});
});
