import {
	AlertCircle,
	CalendarDays,
	CircleDollarSign,
	History,
	Store,
	Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/helpers";
import prisma from "@/lib/db";

import { TrialQuickActions } from "./trial-quick-actions";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const currencyFormatter = new Intl.NumberFormat("es-PA", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-PA");
const dateFormatter = new Intl.DateTimeFormat("es-PA", {
	dateStyle: "medium",
	timeZone: "UTC",
});
const dateTimeFormatter = new Intl.DateTimeFormat("es-PA", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "America/Panama",
});

const AUDIT_ACTION_LABELS: Record<string, string> = {
	"salon.status.updated": "Estado del salón actualizado",
	"salon.trial.extended": "Período de prueba extendido",
};

export default async function AdminDashboardPage() {
	await requireAdmin();

	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	const sevenDaysFromToday = new Date(today.getTime() + 7 * DAY_IN_MS);

	const [
		revenueAggregate,
		totalAppointmentsCount,
		activeSalons,
		trialSalons,
		suspendedSalons,
		totalOwnerUsers,
		trialSalonCandidates,
		recentAuditLogs,
	] = await Promise.all([
		prisma.appointment.aggregate({
			where: { status: "completed" },
			_sum: { totalPriceSnapshot: true },
		}),
		prisma.appointment.count(),
		prisma.salon.count({ where: { status: "active" } }),
		prisma.salon.count({ where: { status: "trial" } }),
		prisma.salon.count({ where: { status: "suspended" } }),
		prisma.user.count({ where: { role: "salon_owner" } }),
		prisma.salon.findMany({
			where: {
				status: "trial",
				subscriptions: { some: { status: "trial" } },
			},
			select: {
				id: true,
				name: true,
				owner: { select: { name: true, email: true } },
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
		prisma.auditLog.findMany({
			orderBy: { createdAt: "desc" },
			take: 10,
			select: {
				id: true,
				action: true,
				createdAt: true,
				salon: { select: { name: true } },
				user: { select: { name: true, email: true } },
			},
		}),
	]);

	const expiringSalons = trialSalonCandidates
		.flatMap((salon) => {
			const subscription = salon.subscriptions[0];
			if (
				!subscription?.endDate ||
				subscription.endDate < today ||
				subscription.endDate > sevenDaysFromToday
			) {
				return [];
			}

			return [
				{
					...salon,
					endDate: subscription.endDate,
					planName: subscription.plan.name,
					daysRemaining: Math.ceil(
						(subscription.endDate.getTime() - today.getTime()) / DAY_IN_MS,
					),
				},
			];
		})
		.sort(
			(first, second) => first.endDate.getTime() - second.endDate.getTime(),
		);

	const totalRevenueProcessed = Number(
		revenueAggregate._sum.totalPriceSnapshot ?? 0,
	);

	const kpis = [
		{
			label: "Ingresos procesados",
			value: currencyFormatter.format(totalRevenueProcessed),
			icon: CircleDollarSign,
			accent: "text-emerald-600",
		},
		{
			label: "Citas totales",
			value: numberFormatter.format(totalAppointmentsCount),
			icon: CalendarDays,
			accent: "text-primary",
		},
		{
			label: "Salones activos",
			value: numberFormatter.format(activeSalons),
			icon: Store,
			accent: "text-emerald-600",
		},
		{
			label: "Salones en prueba",
			value: numberFormatter.format(trialSalons),
			icon: Store,
			accent: "text-amber-600",
		},
		{
			label: "Salones suspendidos",
			value: numberFormatter.format(suspendedSalons),
			icon: AlertCircle,
			accent: "text-destructive",
		},
		{
			label: "Usuarios propietarios",
			value: numberFormatter.format(totalOwnerUsers),
			icon: Users,
			accent: "text-primary",
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
				<p className="text-muted-foreground">
					Métricas globales y alertas de la plataforma.
				</p>
			</div>

			<section aria-labelledby="platform-kpis-title">
				<h3 id="platform-kpis-title" className="sr-only">
					Indicadores globales
				</h3>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{kpis.map((kpi) => {
						const Icon = kpi.icon;
						return (
							<Card key={kpi.label}>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">
										{kpi.label}
									</CardTitle>
									<Icon className={`size-4 ${kpi.accent}`} aria-hidden="true" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{kpi.value}</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</section>

			<Card>
				<CardHeader className="border-b">
					<div className="flex items-start gap-3">
						<AlertCircle
							className="mt-0.5 size-5 text-amber-600"
							aria-hidden="true"
						/>
						<div>
							<CardTitle>Trials próximos a vencer</CardTitle>
							<p className="mt-1 text-sm text-muted-foreground">
								Salones cuyo período de prueba vence en los próximos 7 días.
							</p>
						</div>
					</div>
				</CardHeader>
				<CardContent className="px-0">
					{expiringSalons.length === 0 ? (
						<p className="px-4 py-8 text-center text-sm text-muted-foreground">
							No hay trials próximos a vencer.
						</p>
					) : (
						<div className="divide-y">
							{expiringSalons.map((salon) => (
								<article
									key={salon.id}
									className="grid gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(9rem,0.6fr)_minmax(11rem,0.7fr)_minmax(22rem,1.5fr)] lg:items-center"
								>
									<div className="min-w-0">
										<h4 className="font-semibold">{salon.name}</h4>
										<p className="truncate text-sm text-muted-foreground">
											{salon.owner.name} · {salon.owner.email}
										</p>
									</div>
									<div>
										<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
											Plan
										</p>
										<p className="mt-1 text-sm">{salon.planName}</p>
									</div>
									<div>
										<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
											Vencimiento
										</p>
										<div className="mt-1 flex items-center gap-2">
											<span className="text-sm">
												{dateFormatter.format(salon.endDate)}
											</span>
											<Badge
												variant={
													salon.daysRemaining <= 2 ? "destructive" : "secondary"
												}
											>
												{salon.daysRemaining === 0
													? "Vence hoy"
													: `${salon.daysRemaining} días`}
											</Badge>
										</div>
									</div>
									<TrialQuickActions
										salonId={salon.id}
										salonName={salon.name}
									/>
								</article>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="border-b">
					<div className="flex items-center gap-3">
						<History className="size-5 text-primary" aria-hidden="true" />
						<CardTitle>Actividad reciente</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-0">
					{recentAuditLogs.length === 0 ? (
						<p className="px-4 py-8 text-center text-sm text-muted-foreground">
							No hay actividad administrativa registrada.
						</p>
					) : (
						<ul className="divide-y">
							{recentAuditLogs.map((log) => (
								<li
									key={log.id}
									className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
								>
									<div className="min-w-0">
										<p className="font-medium">
											{AUDIT_ACTION_LABELS[log.action] ?? log.action}
										</p>
										<p className="truncate text-sm text-muted-foreground">
											{log.salon?.name ?? "Plataforma"} ·{" "}
											{log.user?.name ?? log.user?.email ?? "Sistema"}
										</p>
									</div>
									<time
										dateTime={log.createdAt.toISOString()}
										className="shrink-0 text-xs text-muted-foreground"
									>
										{dateTimeFormatter.format(log.createdAt)}
									</time>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
