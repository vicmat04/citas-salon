"use server";

import { revalidatePath } from "next/cache";

import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";

function stringValue(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

function numberValue(
	formData: FormData,
	key: string,
	defaultValue: number,
): number {
	const raw = formData.get(key);
	if (raw === null || raw === undefined || raw === "") return defaultValue;
	const parsed = Number(raw);
	return Number.isNaN(parsed) ? defaultValue : parsed;
}

// ==========================================
// CATEGORY ACTIONS
// ==========================================

export async function createCategory(formData: FormData, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	const name = stringValue(formData, "name");
	if (!name) return { error: "El nombre de la categoría es obligatorio" };

	const sortOrder = numberValue(formData, "sortOrder", 0);

	try {
		const category = await prisma.serviceCategory.create({
			data: {
				salonId: salon.id,
				name,
				sortOrder,
			},
		});
		revalidatePath(`/s/${slug}/services`);
		return { success: true, category };
	} catch {
		return { error: "Error al crear la categoría." };
	}
}

export async function updateCategory(
	categoryId: string,
	formData: FormData,
	slug: string,
) {
	const { salon } = await requireSalonOwner(slug);

	const name = stringValue(formData, "name");
	if (!name) return { error: "El nombre de la categoría es obligatorio" };

	const sortOrder = numberValue(formData, "sortOrder", 0);

	try {
		const existing = await prisma.serviceCategory.findFirst({
			where: { id: categoryId, salonId: salon.id },
		});
		if (!existing) return { error: "Categoría no encontrada." };

		const updated = await prisma.serviceCategory.update({
			where: { id: categoryId },
			data: { name, sortOrder },
		});
		revalidatePath(`/s/${slug}/services`);
		return { success: true, category: updated };
	} catch {
		return { error: "Error al actualizar la categoría." };
	}
}

export async function deleteCategory(categoryId: string, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	try {
		const [existing, servicesCount] = await Promise.all([
			prisma.serviceCategory.findFirst({
				where: { id: categoryId, salonId: salon.id },
			}),
			prisma.service.count({
				where: { categoryId, salonId: salon.id },
			}),
		]);
		if (!existing) return { error: "Categoría no encontrada." };

		// Business rule: Cannot delete category if it contains services

		if (servicesCount > 0) {
			return {
				error:
					"No se puede eliminar una categoría que contiene servicios. Reasigna o elimina los servicios primero.",
			};
		}

		await prisma.serviceCategory.delete({
			where: { id: categoryId },
		});

		revalidatePath(`/s/${slug}/services`);
		return { success: true };
	} catch {
		return { error: "Error al eliminar la categoría." };
	}
}

// ==========================================
// SERVICE ACTIONS
// ==========================================

export async function createService(formData: FormData, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	const name = stringValue(formData, "name");
	if (!name) return { error: "El nombre del servicio es obligatorio" };

	const description = stringValue(formData, "description") || null;
	const price = numberValue(formData, "price", 0);
	if (price < 0)
		return { error: "El precio debe ser un número mayor o igual a 0" };

	const durationMinutes = numberValue(formData, "durationMinutes", 30);
	if (durationMinutes <= 0)
		return { error: "La duración debe ser mayor a 0 minutos" };

	// Default bufferMinutes to 10 if not explicitly provided or invalid
	const bufferMinutes = numberValue(formData, "bufferMinutes", 10);
	if (bufferMinutes < 0)
		return { error: "El tiempo de descanso (buffer) no puede ser negativo" };

	const categoryId = stringValue(formData, "categoryId") || null;
	const isActive = formData.get("isActive") !== "false";

	// If categoryId provided, verify it belongs to this salon
	if (categoryId) {
		const validCategory = await prisma.serviceCategory.findFirst({
			where: { id: categoryId, salonId: salon.id },
		});
		if (!validCategory)
			return { error: "Categoría no válida para este salón." };
	}

	try {
		const service = await prisma.service.create({
			data: {
				salonId: salon.id,
				categoryId,
				name,
				description,
				price,
				durationMinutes,
				bufferMinutes,
				isActive,
			},
		});
		revalidatePath(`/s/${slug}/services`);
		return { success: true, service };
	} catch {
		return { error: "Error al crear el servicio." };
	}
}

export async function updateService(
	serviceId: string,
	formData: FormData,
	slug: string,
) {
	const { salon } = await requireSalonOwner(slug);

	const name = stringValue(formData, "name");
	if (!name) return { error: "El nombre del servicio es obligatorio" };

	const description = stringValue(formData, "description") || null;
	const price = numberValue(formData, "price", 0);
	if (price < 0)
		return { error: "El precio debe ser un número mayor o igual a 0" };

	const durationMinutes = numberValue(formData, "durationMinutes", 30);
	if (durationMinutes <= 0)
		return { error: "La duración debe ser mayor a 0 minutos" };

	const bufferMinutes = numberValue(formData, "bufferMinutes", 10);
	if (bufferMinutes < 0)
		return { error: "El tiempo de descanso (buffer) no puede ser negativo" };

	const categoryId = stringValue(formData, "categoryId") || null;
	const isActive = formData.get("isActive") !== "false";

	try {
		const [existing, validCategory] = await Promise.all([
			prisma.service.findFirst({
				where: { id: serviceId, salonId: salon.id },
			}),
			categoryId
				? prisma.serviceCategory.findFirst({
						where: { id: categoryId, salonId: salon.id },
					})
				: Promise.resolve(null),
		]);
		if (!existing) return { error: "Servicio no encontrado." };
		if (categoryId && !validCategory)
			return { error: "Categoría no válida para este salón." };

		const updated = await prisma.service.update({
			where: { id: serviceId },
			data: {
				categoryId,
				name,
				description,
				price,
				durationMinutes,
				bufferMinutes,
				isActive,
			},
		});
		revalidatePath(`/s/${slug}/services`);
		return { success: true, service: updated };
	} catch {
		return { error: "Error al actualizar el servicio." };
	}
}

export async function deleteService(serviceId: string, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	try {
		const deleted = await prisma.service.deleteMany({
			where: { id: serviceId, salonId: salon.id },
		});
		if (deleted.count === 0) return { error: "Servicio no encontrado." };

		revalidatePath(`/s/${slug}/services`);
		return { success: true };
	} catch {
		return { error: "Error al eliminar el servicio." };
	}
}

export async function toggleServiceActive(serviceId: string, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	try {
		const existing = await prisma.service.findFirst({
			where: { id: serviceId, salonId: salon.id },
		});
		if (!existing) return { error: "Servicio no encontrado." };

		const updated = await prisma.service.update({
			where: { id: serviceId },
			data: { isActive: !existing.isActive },
		});
		revalidatePath(`/s/${slug}/services`);
		return { success: true, isActive: updated.isActive };
	} catch {
		return { error: "Error al cambiar estado del servicio." };
	}
}
