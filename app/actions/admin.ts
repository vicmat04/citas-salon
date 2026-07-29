"use server";

import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth/helpers";
import { getDbUser, getUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/result";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type AdminMutableSalonStatus = "trial" | "active" | "suspended";

const statusUpdateSchema = z.object({
	salonId: z.string().uuid(),
	nextStatus: z.enum(["trial", "active", "suspended"]),
});

export async function updateSalonStatus(
	salonId: string,
	nextStatus: AdminMutableSalonStatus,
): Promise<ActionResult> {
	const user = await getUser();
	const dbUser = user ? await getDbUser(user.id) : null;

	if (!dbUser || dbUser.role !== "platform_admin") {
		return {
			ok: false,
			code: "UNAUTHORIZED",
			message: "No tienes permisos para cambiar el estado del salón.",
		};
	}

	const parsed = statusUpdateSchema.safeParse({ salonId, nextStatus });
	if (!parsed.success) {
		return {
			ok: false,
			code: "VALIDATION",
			message: "El salón o el estado seleccionado no es válido.",
		};
	}

	let transactionResult:
		| { outcome: "not-found" }
		| { outcome: "unchanged"; slug: string }
		| { outcome: "updated"; slug: string };

	try {
		transactionResult = await prisma.$transaction(async (transaction) => {
			const currentSalon = await transaction.salon.findUnique({
				where: { id: parsed.data.salonId },
				select: { id: true, slug: true, status: true },
			});

			if (!currentSalon) return { outcome: "not-found" as const };
			if (currentSalon.status === parsed.data.nextStatus) {
				return { outcome: "unchanged" as const, slug: currentSalon.slug };
			}

			await transaction.salon.update({
				where: { id: currentSalon.id },
				data: { status: parsed.data.nextStatus },
			});
			await transaction.auditLog.create({
				data: {
					salonId: currentSalon.id,
					userId: dbUser.id,
					action: "salon.status.updated",
					entityType: "Salon",
					entityId: currentSalon.id,
					metadata: {
						oldStatus: currentSalon.status,
						newStatus: parsed.data.nextStatus,
					},
				},
			});

			return { outcome: "updated" as const, slug: currentSalon.slug };
		});
	} catch {
		return {
			ok: false,
			code: "INTERNAL",
			message: "No fue posible actualizar el estado del salón.",
		};
	}

	if (transactionResult.outcome === "not-found") {
		return {
			ok: false,
			code: "NOT_FOUND",
			message: "Salón no encontrado.",
		};
	}

	if (transactionResult.outcome === "updated") {
		const { slug } = transactionResult;
		revalidatePath("/admin/salons");
		revalidatePath("/my-salons");
		revalidatePath(`/${slug}`);
		revalidatePath(`/book/${slug}`);
		revalidatePath(`/book/${slug}/confirmacion`);
		revalidatePath(`/s/${slug}`, "layout");
	}

	return { ok: true };
}

export async function createSalon(formData: FormData) {
	// 1. Verify admin permissions
	await requireAdmin();

	const name = formData.get("name") as string;
	const slug = formData.get("slug") as string;
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	if (!name || !slug || !email || !password) {
		return { error: "Todos los campos son obligatorios" };
	}

	// 2. Check the independent slug and email constraints concurrently
	const [existingSalon, existingUser] = await Promise.all([
		prisma.salon.findUnique({ where: { slug } }),
		prisma.user.findUnique({ where: { email } }),
	]);
	if (existingSalon) {
		return { error: "El slug ya está en uso" };
	}

	let supabaseUid = existingUser?.supabaseUid;
	let dbUser = existingUser;

	if (!existingUser) {
		// 3. Create user in Supabase Auth using Admin API
		const { data: authData, error: authError } =
			await supabaseAdmin.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
				user_metadata: { role: "salon_owner" },
			});

		if (authError) {
			return { error: authError.message };
		}

		supabaseUid = authData.user.id;

		// 4. Create user in Prisma DB
		dbUser = await prisma.user.create({
			data: {
				name: `Dueño de ${name}`,
				email,
				role: "salon_owner",
				supabaseUid,
			},
		});
	}

	if (!dbUser) {
		return { error: "Error inesperado al crear o recuperar usuario." };
	}

	// 5. Create Salon in Prisma
	await prisma.salon.create({
		data: {
			name,
			slug,
			ownerId: dbUser.id,
			status: "trial",
		},
	});

	// 6. Refresh admin salons page
	revalidatePath("/admin/salons");

	return { success: true };
}

export async function updateSalonStatusAndPlan(
	salonId: string,
	nextStatus: AdminMutableSalonStatus,
	planId?: string | null,
): Promise<ActionResult> {
	const result = await updateSalonStatus(salonId, nextStatus);
	if (!result.ok) return result;

	if (planId !== undefined) {
		try {
			await prisma.salon.update({
				where: { id: salonId },
				data: { planId: planId || null },
			});
			revalidatePath("/admin/salons");
		} catch {
			return {
				ok: false,
				code: "INTERNAL",
				message: "No fue posible actualizar el plan del salón.",
			};
		}
	}

	return { ok: true };
}

export async function extendSalonTrial(
	salonId: string,
	extraDays: number,
): Promise<ActionResult> {
	const user = await getUser();
	const dbUser = user ? await getDbUser(user.id) : null;

	if (!dbUser || dbUser.role !== "platform_admin") {
		return {
			ok: false,
			code: "UNAUTHORIZED",
			message: "No tienes permisos para extender el trial.",
		};
	}

	if (![7, 14, 30].includes(extraDays)) {
		return {
			ok: false,
			code: "VALIDATION",
			message: "Los días de extensión deben ser 7, 14 o 30.",
		};
	}

	try {
		const [salon, existingSub] = await Promise.all([
			prisma.salon.findUnique({
				where: { id: salonId },
				include: { owner: true },
			}),
			prisma.subscription.findFirst({
				where: { salonId, status: "trial" },
				orderBy: { createdAt: "desc" },
			}),
		]);

		if (!salon)
			return { ok: false, code: "NOT_FOUND", message: "Salón no encontrado." };

		const baseDate =
			existingSub?.endDate && existingSub.endDate > new Date()
				? new Date(existingSub.endDate)
				: new Date();

		const newEndDate = new Date(
			baseDate.getTime() + extraDays * 24 * 60 * 60 * 1000,
		);

		let targetPlanId = salon.planId;
		if (!targetPlanId) {
			const activePlan = await prisma.plan.findFirst({
				where: { isActive: true },
			});
			targetPlanId = activePlan?.id || "default-plan-id";
		}

		if (existingSub) {
			await prisma.subscription.update({
				where: { id: existingSub.id },
				data: { endDate: newEndDate },
			});
		} else {
			await prisma.subscription.create({
				data: {
					salonId,
					planId: targetPlanId,
					status: "trial",
					startDate: new Date(),
					endDate: newEndDate,
				},
			});
		}

		if (salon.status === "suspended" || salon.status === "cancelled") {
			await prisma.salon.update({
				where: { id: salonId },
				data: { status: "trial" },
			});
		}

		await prisma.auditLog.create({
			data: {
				salonId,
				userId: dbUser.id,
				action: "salon.trial.extended",
				entityType: "Salon",
				entityId: salonId,
				metadata: { extraDays, newEndDate: newEndDate.toISOString() },
			},
		});

		revalidatePath("/admin/salons");
		revalidatePath("/admin/dashboard");
		revalidatePath("/my-salons");
		revalidatePath(`/s/${salon.slug}/dashboard`);
		revalidatePath(`/s/${salon.slug}`, "layout");
		return { ok: true };
	} catch (err) {
		console.error("Error extending trial:", err);
		return {
			ok: false,
			code: "INTERNAL",
			message: "No fue posible extender el período de prueba.",
		};
	}
}

export async function updateAdminNotes(
	salonId: string,
	adminNotes: string,
): Promise<ActionResult> {
	const user = await getUser();
	const dbUser = user ? await getDbUser(user.id) : null;

	if (!dbUser || dbUser.role !== "platform_admin") {
		return {
			ok: false,
			code: "UNAUTHORIZED",
			message: "No tienes permisos de administrador.",
		};
	}

	try {
		await prisma.salon.update({
			where: { id: salonId },
			data: { adminNotes },
		});
		revalidatePath("/admin/salons");
		return { ok: true };
	} catch {
		return {
			ok: false,
			code: "INTERNAL",
			message: "Error al guardar notas del administrador.",
		};
	}
}

export async function sendTrialExpirationNotice(
	salonId: string,
): Promise<ActionResult> {
	const user = await getUser();
	const dbUser = user ? await getDbUser(user.id) : null;

	if (!dbUser || dbUser.role !== "platform_admin") {
		return {
			ok: false,
			code: "UNAUTHORIZED",
			message: "No tienes permisos de administrador.",
		};
	}

	try {
		const [salon, existingSub, { sendTrialExpirationEmail }] =
			await Promise.all([
				prisma.salon.findUnique({
					where: { id: salonId },
					include: { owner: true },
				}),
				prisma.subscription.findFirst({
					where: { salonId, status: "trial" },
					orderBy: { createdAt: "desc" },
				}),
				import("@/lib/email/mailer"),
			]);

		if (!salon)
			return { ok: false, code: "NOT_FOUND", message: "Salón no encontrado." };

		const remainingDays = existingSub?.endDate
			? Math.max(
					0,
					Math.ceil(
						(existingSub.endDate.getTime() - Date.now()) /
							(1000 * 60 * 60 * 24),
					),
				)
			: 0;

		await sendTrialExpirationEmail({
			ownerName: salon.owner.name || "Dueño de salón",
			ownerEmail: salon.owner.email,
			salonName: salon.name,
			remainingDays,
			newEndDate: existingSub?.endDate
				? existingSub.endDate.toISOString().slice(0, 10)
				: undefined,
			additionalNotificationEmails: salon.notificationEmails,
		});

		return { ok: true };
	} catch (err) {
		console.error("Error sending trial expiration notice:", err);
		return {
			ok: false,
			code: "INTERNAL",
			message: "Fallo al enviar la notificación por correo.",
		};
	}
}
