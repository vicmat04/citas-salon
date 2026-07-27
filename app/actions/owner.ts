"use server";

import { revalidatePath } from "next/cache";

import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";

function stringValue(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

export async function updateSalonSettings(formData: FormData, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	const name = stringValue(formData, "name");
	if (!name) return { error: "El nombre es requerido" };

	try {
		await prisma.salon.update({
			where: { id: salon.id },
			data: {
				name,
				slogan: stringValue(formData, "slogan") || null,
				phone: stringValue(formData, "phone") || null,
				address: stringValue(formData, "address") || null,
				themeColor: stringValue(formData, "themeColor") || "#000000",
			},
		});
	} catch {
		return { error: "Ocurrió un error al guardar la configuración." };
	}

	revalidatePath(`/s/${slug}/settings`);
	return { success: true };
}

export async function createSpecialist(formData: FormData, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	const name = stringValue(formData, "name");
	if (!name) return { error: "El nombre es requerido" };

	try {
		await prisma.specialist.create({
			data: {
				salonId: salon.id,
				name,
				email: stringValue(formData, "email") || null,
				phone: stringValue(formData, "phone") || null,
				specialty: stringValue(formData, "specialty") || null,
			},
		});
	} catch {
		return { error: "Error al crear el especialista." };
	}

	revalidatePath(`/s/${slug}/specialists`);
	return { success: true };
}

export async function deleteSpecialist(specialistId: string, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	try {
		const deleted = await prisma.specialist.deleteMany({
			where: { id: specialistId, salonId: salon.id },
		});
		if (deleted.count === 0) return { error: "Especialista no encontrado." };
	} catch {
		return { error: "Error al eliminar el especialista." };
	}

	revalidatePath(`/s/${slug}/specialists`);
	return { success: true };
}

export async function updateSpecialistServices(
	specialistId: string,
	serviceIds: string[],
	slug: string,
) {
	const { salon } = await requireSalonOwner(slug);

	try {
		const specialist = await prisma.specialist.findFirst({
			where: { id: specialistId, salonId: salon.id },
		});
		if (!specialist) return { error: "Especialista no encontrado." };

		// Verify all serviceIds belong to salon
		if (serviceIds.length > 0) {
			const validCount = await prisma.service.count({
				where: {
					id: { in: serviceIds },
					salonId: salon.id,
				},
			});
			if (validCount !== serviceIds.length) {
				return {
					error:
						"Uno o más servicios seleccionados no pertenecen a este salón.",
				};
			}
		}

		// Atomically replace SpecialistService relations
		await prisma.$transaction([
			prisma.specialistService.deleteMany({
				where: { specialistId, salonId: salon.id },
			}),
			prisma.specialistService.createMany({
				data: serviceIds.map((serviceId) => ({
					salonId: salon.id,
					specialistId,
					serviceId,
				})),
			}),
		]);

		revalidatePath(`/s/${slug}/specialists`);
		revalidatePath(`/s/${slug}/services`);
		return { success: true };
	} catch {
		return { error: "Error al actualizar los servicios del especialista." };
	}
}
