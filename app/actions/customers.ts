"use server";

import { revalidatePath } from "next/cache";

import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";

function stringValue(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

export async function createCustomer(formData: FormData, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	const fullName = stringValue(formData, "fullName");
	if (!fullName || fullName.length < 2) {
		return { error: "El nombre completo del cliente es obligatorio" };
	}

	const phone = stringValue(formData, "phone");
	if (!phone || phone.length < 7) {
		return {
			error: "El número de teléfono es obligatorio (mínimo 7 caracteres)",
		};
	}

	const email = stringValue(formData, "email") || null;
	if (email && !email.includes("@")) {
		return { error: "El correo electrónico ingresado no es válido" };
	}

	const birthdayStr = stringValue(formData, "birthday");
	let birthday: Date | null = null;
	if (birthdayStr) {
		const parsed = new Date(birthdayStr);
		if (!Number.isNaN(parsed.getTime())) {
			birthday = parsed;
		}
	}

	const notes = stringValue(formData, "notes") || null;

	// Check duplicate customer by phone or email in this salon
	try {
		const existing = await prisma.customer.findFirst({
			where: {
				salonId: salon.id,
				OR: [{ phone }, ...(email ? [{ email }] : [])],
			},
		});

		if (existing) {
			return {
				conflict: true,
				existingCustomerId: existing.id,
				message:
					"Ya existe un cliente registrado con este teléfono o correo en tu salón.",
			};
		}

		const customer = await prisma.customer.create({
			data: {
				salonId: salon.id,
				fullName,
				phone,
				email,
				birthday,
				notes,
			},
		});

		revalidatePath(`/s/${slug}/customers`);
		revalidatePath(`/s/${slug}/appointments`);
		return { success: true, customer };
	} catch {
		return { error: "Error al registrar el cliente." };
	}
}

export async function updateCustomer(
	customerId: string,
	formData: FormData,
	slug: string,
) {
	const { salon } = await requireSalonOwner(slug);

	const fullName = stringValue(formData, "fullName");
	if (!fullName || fullName.length < 2) {
		return { error: "El nombre completo del cliente es obligatorio" };
	}

	const phone = stringValue(formData, "phone");
	if (!phone || phone.length < 7) {
		return {
			error: "El número de teléfono es obligatorio (mínimo 7 caracteres)",
		};
	}

	const email = stringValue(formData, "email") || null;
	if (email && !email.includes("@")) {
		return { error: "El correo electrónico ingresado no es válido" };
	}

	const birthdayStr = stringValue(formData, "birthday");
	let birthday: Date | null = null;
	if (birthdayStr) {
		const parsed = new Date(birthdayStr);
		if (!Number.isNaN(parsed.getTime())) {
			birthday = parsed;
		}
	}

	const notes = stringValue(formData, "notes") || null;

	try {
		const existing = await prisma.customer.findFirst({
			where: { id: customerId, salonId: salon.id },
		});

		if (!existing) {
			return { error: "Cliente no encontrado." };
		}

		const updated = await prisma.customer.update({
			where: { id: customerId },
			data: {
				fullName,
				phone,
				email,
				birthday,
				notes,
			},
		});

		revalidatePath(`/s/${slug}/customers`);
		revalidatePath(`/s/${slug}/appointments`);
		return { success: true, customer: updated };
	} catch {
		return { error: "Error al actualizar la ficha del cliente." };
	}
}

export async function deleteCustomer(customerId: string, slug: string) {
	const { salon } = await requireSalonOwner(slug);

	try {
		const deleted = await prisma.customer.deleteMany({
			where: { id: customerId, salonId: salon.id },
		});

		if (deleted.count === 0) {
			return { error: "Cliente no encontrado." };
		}

		revalidatePath(`/s/${slug}/customers`);
		revalidatePath(`/s/${slug}/appointments`);
		return { success: true };
	} catch {
		return { error: "Error al eliminar el cliente." };
	}
}
