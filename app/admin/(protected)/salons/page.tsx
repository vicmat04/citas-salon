import { requireAdmin } from "@/lib/auth/helpers";
import prisma from "@/lib/db";

import { CreateSalonDialog } from "./create-salon-dialog";
import { SalonsView } from "./salons-view";

export default async function AdminSalonsPage() {
	await requireAdmin();

	const [salons, plans] = await Promise.all([
		prisma.salon.findMany({
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				name: true,
				slug: true,
				status: true,
				planId: true,
				adminNotes: true,
				owner: { select: { name: true, email: true } },
				plan: { select: { name: true, isActive: true } },
				subscriptions: {
					where: { status: "trial" },
					orderBy: { createdAt: "desc" },
					take: 1,
					select: {
						endDate: true,
						plan: { select: { name: true } },
					},
				},
			},
		}),
		prisma.plan.findMany({
			where: { isActive: true },
			orderBy: { name: "asc" },
			select: { id: true, name: true },
		}),
	]);

	const salonItems = salons.map(({ subscriptions, ...salon }) => {
		const latestTrial = subscriptions[0];
		return {
			...salon,
			latestTrial: latestTrial
				? {
						endDate: latestTrial.endDate?.toISOString() ?? null,
						planName: latestTrial.plan.name,
					}
				: null,
		};
	});

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Salones</h2>
					<p className="text-muted-foreground">
						Gestiona los salones, planes y períodos de prueba de la plataforma.
					</p>
				</div>
				<CreateSalonDialog />
			</div>

			<SalonsView salons={salonItems} plans={plans} />
		</div>
	);
}
