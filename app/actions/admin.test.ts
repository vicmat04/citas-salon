import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	auditCreate: vi.fn(),
	getDbUser: vi.fn(),
	getUser: vi.fn(),
	revalidatePath: vi.fn(),
	requireAdmin: vi.fn(),
	salonFindUnique: vi.fn(),
	salonUpdate: vi.fn(),
	transaction: vi.fn(),
	subscriptionFindFirst: vi.fn(),
	subscriptionUpdate: vi.fn(),
	subscriptionCreate: vi.fn(),
	planFindFirst: vi.fn(),
	sendTrialExpirationEmail: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/auth/session", () => ({
	getDbUser: mocks.getDbUser,
	getUser: mocks.getUser,
}));
vi.mock("@/lib/supabase/admin", () => ({
	supabaseAdmin: { auth: { admin: { createUser: vi.fn() } } },
}));
vi.mock("@/lib/email/mailer", () => ({
	sendTrialExpirationEmail: mocks.sendTrialExpirationEmail,
}));
vi.mock("@/lib/db", () => ({
	default: {
		$transaction: mocks.transaction,
		salon: {
			findUnique: mocks.salonFindUnique,
			update: mocks.salonUpdate,
			create: vi.fn(),
		},
		user: { findUnique: vi.fn(), create: vi.fn() },
		subscription: {
			findFirst: mocks.subscriptionFindFirst,
			update: mocks.subscriptionUpdate,
			create: mocks.subscriptionCreate,
		},
		plan: { findFirst: mocks.planFindFirst },
		auditLog: { create: mocks.auditCreate },
	},
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
	extendSalonTrial,
	sendTrialExpirationNotice,
	updateAdminNotes,
	updateSalonStatus,
	updateSalonStatusAndPlan,
	type AdminMutableSalonStatus,
} from "./admin";

const salonId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";

function currentSalon(status = "active") {
	return {
		id: salonId,
		slug: "acme",
		status,
		name: "Salón Acme",
		planId: "plan-1",
		notificationEmails: "extra@example.com",
		owner: { name: "Carlos", email: "carlos@example.com" },
	};
}

describe("admin server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getUser.mockResolvedValue({ id: "supabase-admin" });
		mocks.getDbUser.mockResolvedValue({ id: actorId, role: "platform_admin" });
		mocks.salonFindUnique.mockResolvedValue(currentSalon());
		mocks.salonUpdate.mockResolvedValue(currentSalon("suspended"));
		mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
		mocks.subscriptionFindFirst.mockResolvedValue({
			id: "sub-1",
			endDate: new Date("2028-06-01"),
		});
		mocks.subscriptionUpdate.mockResolvedValue({ id: "sub-1" });
		mocks.subscriptionCreate.mockResolvedValue({ id: "sub-2" });
		mocks.planFindFirst.mockResolvedValue({ id: "plan-1" });
		mocks.sendTrialExpirationEmail.mockResolvedValue({
			success: true,
			details: [],
		});
		mocks.transaction.mockImplementation(async (callback) =>
			callback({
				salon: {
					findUnique: mocks.salonFindUnique,
					update: mocks.salonUpdate,
				},
				auditLog: { create: mocks.auditCreate },
			}),
		);
	});

	describe("updateSalonStatus", () => {
		it.each([
			[null, null],
			[{ id: "supabase-user" }, { id: "owner", role: "salon_owner" }],
		])(
			"denies callers without a database platform_admin role",
			async (user, dbUser) => {
				mocks.getUser.mockResolvedValue(user);
				mocks.getDbUser.mockResolvedValue(dbUser);

				await expect(updateSalonStatus(salonId, "suspended")).resolves.toEqual({
					ok: false,
					code: "UNAUTHORIZED",
					message: "No tienes permisos para cambiar el estado del salón.",
				});
				expect(mocks.transaction).not.toHaveBeenCalled();
			},
		);

		it.each([
			["not-a-uuid", "active"],
			[salonId, "cancelled"],
			[salonId, "pending"],
			[salonId, "ACTIVE"],
		])(
			"rejects malformed IDs and disallowed target values",
			async (id, target) => {
				const result = await updateSalonStatus(
					id,
					target as AdminMutableSalonStatus,
				);

				expect(result.ok).toBe(false);
				if (!result.ok) expect(result.code).toBe("VALIDATION");
				expect(mocks.transaction).not.toHaveBeenCalled();
			},
		);

		it("returns not found for an unknown salon without writing an audit", async () => {
			mocks.salonFindUnique.mockResolvedValue(null);

			await expect(updateSalonStatus(salonId, "active")).resolves.toEqual({
				ok: false,
				code: "NOT_FOUND",
				message: "Salón no encontrado.",
			});
			expect(mocks.salonUpdate).not.toHaveBeenCalled();
			expect(mocks.auditCreate).not.toHaveBeenCalled();
		});

		it("is idempotent when the requested status is already current", async () => {
			mocks.salonFindUnique.mockResolvedValue(currentSalon("active"));

			await expect(updateSalonStatus(salonId, "active")).resolves.toEqual({
				ok: true,
			});
			expect(mocks.salonUpdate).not.toHaveBeenCalled();
			expect(mocks.auditCreate).not.toHaveBeenCalled();
			expect(mocks.revalidatePath).not.toHaveBeenCalled();
		});

		it("atomically persists only status and an actor/old/new audit record", async () => {
			await expect(updateSalonStatus(salonId, "suspended")).resolves.toEqual({
				ok: true,
			});

			expect(mocks.salonUpdate).toHaveBeenCalledWith({
				where: { id: salonId },
				data: { status: "suspended" },
			});
			expect(mocks.auditCreate).toHaveBeenCalledWith({
				data: {
					salonId,
					userId: actorId,
					action: "salon.status.updated",
					entityType: "Salon",
					entityId: salonId,
					metadata: { oldStatus: "active", newStatus: "suspended" },
				},
			});
			expect(mocks.revalidatePath.mock.calls).toEqual(
				expect.arrayContaining([
					["/admin/salons"],
					["/my-salons"],
					["/acme"],
					["/book/acme"],
					["/book/acme/confirmacion"],
					["/s/acme", "layout"],
				]),
			);
		});

		it("reactivates without sending subscription, appointment, plan, or ownership data", async () => {
			mocks.salonFindUnique.mockResolvedValue(currentSalon("suspended"));

			await expect(updateSalonStatus(salonId, "active")).resolves.toEqual({
				ok: true,
			});

			expect(mocks.salonUpdate).toHaveBeenCalledWith({
				where: { id: salonId },
				data: { status: "active" },
			});
			const serializedWrites = JSON.stringify([
				...mocks.salonUpdate.mock.calls,
				...mocks.auditCreate.mock.calls,
			]);
			expect(serializedWrites).not.toMatch(
				/subscription|appointment|planId|ownerId/,
			);
		});

		it("returns a safe internal error if the atomic write fails", async () => {
			mocks.transaction.mockRejectedValue(new Error("database internals"));

			await expect(updateSalonStatus(salonId, "suspended")).resolves.toEqual({
				ok: false,
				code: "INTERNAL",
				message: "No fue posible actualizar el estado del salón.",
			});
		});
	});

	describe("extendSalonTrial", () => {
		it("rejects non-admin users for trial extension", async () => {
			mocks.getDbUser.mockResolvedValue({ id: "user-1", role: "salon_owner" });

			const result = await extendSalonTrial(salonId, 7);
			expect(result).toEqual({
				ok: false,
				code: "UNAUTHORIZED",
				message: "No tienes permisos para extender el trial.",
			});
		});

		it("validates extraDays allowed values (7, 14, 30)", async () => {
			const result = await extendSalonTrial(salonId, 10 as 7);
			expect(result).toEqual({
				ok: false,
				code: "VALIDATION",
				message: "Los días de extensión deben ser 7, 14 o 30.",
			});
		});

		it("extends existing subscription trial endDate by extraDays", async () => {
			const result = await extendSalonTrial(salonId, 14);
			expect(result.ok).toBe(true);
			expect(mocks.subscriptionUpdate).toHaveBeenCalled();
			expect(mocks.auditCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ action: "salon.trial.extended" }),
				}),
			);
			expect(mocks.revalidatePath.mock.calls).toEqual(
				expect.arrayContaining([
					["/admin/salons"],
					["/admin/dashboard"],
					["/my-salons"],
					["/s/acme/dashboard"],
					["/s/acme", "layout"],
				]),
			);
		});
	});

	describe("updateAdminNotes", () => {
		it("saves admin private notes for a salon", async () => {
			const result = await updateAdminNotes(
				salonId,
				"Pago acordado para fin de mes",
			);
			expect(result.ok).toBe(true);
			expect(mocks.salonUpdate).toHaveBeenCalledWith({
				where: { id: salonId },
				data: { adminNotes: "Pago acordado para fin de mes" },
			});
		});
	});

	describe("updateSalonStatusAndPlan", () => {
		it("updates status and plan for salon", async () => {
			mocks.salonFindUnique.mockResolvedValue(currentSalon("trial"));

			const result = await updateSalonStatusAndPlan(
				salonId,
				"active",
				"plan-2",
			);
			expect(result.ok).toBe(true);
			expect(mocks.salonUpdate).toHaveBeenCalledWith({
				where: { id: salonId },
				data: { planId: "plan-2" },
			});
		});
	});

	describe("sendTrialExpirationNotice", () => {
		it("sends email notice to owner and configured recipients", async () => {
			const result = await sendTrialExpirationNotice(salonId);
			expect(result.ok).toBe(true);
			expect(mocks.sendTrialExpirationEmail).toHaveBeenCalledWith({
				ownerName: "Carlos",
				ownerEmail: "carlos@example.com",
				salonName: "Salón Acme",
				remainingDays: expect.any(Number),
				newEndDate: "2028-06-01",
				additionalNotificationEmails: "extra@example.com",
			});
		});
	});
});
