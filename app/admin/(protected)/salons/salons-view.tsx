"use client";

import { CalendarDays, Mail, Search, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";

import {
	extendSalonTrial,
	sendTrialExpirationNotice,
	updateAdminNotes,
	updateSalonStatusAndPlan,
	type AdminMutableSalonStatus,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/actions/result";

export type SalonListItem = {
	id: string;
	name: string;
	slug: string;
	status: string;
	planId: string | null;
	adminNotes: string | null;
	owner: { name: string; email: string };
	plan: { name: string; isActive: boolean } | null;
	latestTrial: { endDate: string | null; planName: string } | null;
};

type PlanOption = { id: string; name: string };
type Feedback = { tone: "success" | "error"; message: string };

const NO_PLAN_FILTER = "without-plan";
const EXTENSION_OPTIONS = [7, 14, 30] as const;
const STATUS_OPTIONS: Array<{
	value: AdminMutableSalonStatus;
	label: string;
}> = [
	{ value: "trial", label: "En prueba" },
	{ value: "active", label: "Activo" },
	{ value: "suspended", label: "Suspendido" },
];
const FILTER_STATUS_OPTIONS = [
	...STATUS_OPTIONS,
	{ value: "pending", label: "Pendiente" },
	{ value: "cancelled", label: "Cancelado" },
];

const dateFormatter = new Intl.DateTimeFormat("es-PA", {
	dateStyle: "medium",
	timeZone: "UTC",
});

function normalize(value: string) {
	return value.trim().toLocaleLowerCase("es");
}

function isMutableStatus(value: string): value is AdminMutableSalonStatus {
	return STATUS_OPTIONS.some((option) => option.value === value);
}

function statusLabel(status: string) {
	return (
		FILTER_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
		status
	);
}

function statusBadgeVariant(status: string) {
	if (status === "active") return "default" as const;
	if (status === "trial") return "secondary" as const;
	if (status === "suspended" || status === "cancelled") {
		return "destructive" as const;
	}
	return "outline" as const;
}

function trialEndLabel(latestTrial: SalonListItem["latestTrial"]) {
	if (!latestTrial) return "Sin período de prueba registrado";
	if (!latestTrial.endDate) return "Sin fecha de vencimiento";
	return `Vence el ${dateFormatter.format(new Date(latestTrial.endDate))}`;
}

export function SalonsView({
	salons,
	plans,
}: {
	salons: SalonListItem[];
	plans: PlanOption[];
}) {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search);
	const [statusFilter, setStatusFilter] = useState("all");
	const [planFilter, setPlanFilter] = useState("all");
	const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<
		AdminMutableSalonStatus | ""
	>("");
	const [selectedPlanId, setSelectedPlanId] = useState("");
	const [adminNotes, setAdminNotes] = useState("");
	const [feedback, setFeedback] = useState<Feedback | null>(null);
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const filteredSalons = useMemo(() => {
		const query = normalize(deferredSearch);

		return salons.filter((salon) => {
			const matchesSearch =
				!query ||
				[salon.name, salon.slug, salon.owner.name, salon.owner.email].some(
					(value) => normalize(value).includes(query),
				);
			const matchesStatus =
				statusFilter === "all" || salon.status === statusFilter;
			const salonPlanFilter = salon.planId ?? NO_PLAN_FILTER;
			const matchesPlan =
				planFilter === "all" || salonPlanFilter === planFilter;

			return matchesSearch && matchesStatus && matchesPlan;
		});
	}, [deferredSearch, planFilter, salons, statusFilter]);

	const selectedSalon = selectedSalonId
		? (salons.find((salon) => salon.id === selectedSalonId) ?? null)
		: null;
	const selectedPlanIsInactive = Boolean(
		selectedSalon?.planId &&
			!plans.some((plan) => plan.id === selectedSalon.planId),
	);

	function openManagement(salon: SalonListItem) {
		setSelectedSalonId(salon.id);
		setSelectedStatus(isMutableStatus(salon.status) ? salon.status : "");
		setSelectedPlanId(salon.planId ?? "");
		setAdminNotes(salon.adminNotes ?? "");
		setFeedback(null);
		setPendingAction(null);
	}

	function closeManagement() {
		if (isPending) return;
		setSelectedSalonId(null);
		setFeedback(null);
	}

	function runAction(
		actionKey: string,
		action: () => Promise<ActionResult>,
		successMessage: string,
		onSuccess?: () => void,
	) {
		setFeedback(null);
		setPendingAction(actionKey);
		startTransition(async () => {
			try {
				const result = await action();
				if (!result.ok) {
					setFeedback({ tone: "error", message: result.message });
					return;
				}

				onSuccess?.();
				setFeedback({ tone: "success", message: successMessage });
				router.refresh();
			} catch {
				setFeedback({
					tone: "error",
					message: "No fue posible completar la acción.",
				});
			} finally {
				setPendingAction(null);
			}
		});
	}

	function saveChanges() {
		if (!selectedSalon || !selectedStatus) {
			setFeedback({
				tone: "error",
				message: "Selecciona un estado permitido antes de guardar.",
			});
			return;
		}

		setFeedback(null);
		setPendingAction("save");
		startTransition(async () => {
			try {
				const detailsResult = await updateSalonStatusAndPlan(
					selectedSalon.id,
					selectedStatus,
					selectedPlanId || null,
				);
				if (!detailsResult.ok) {
					setFeedback({ tone: "error", message: detailsResult.message });
					return;
				}

				if (adminNotes !== (selectedSalon.adminNotes ?? "")) {
					const notesResult = await updateAdminNotes(
						selectedSalon.id,
						adminNotes,
					);
					if (!notesResult.ok) {
						setFeedback({
							tone: "error",
							message:
								"Se guardaron el estado y el plan, pero no fue posible guardar las notas.",
						});
						router.refresh();
						return;
					}
				}

				setFeedback({ tone: "success", message: "Cambios guardados." });
				router.refresh();
			} catch {
				setFeedback({
					tone: "error",
					message: "No fue posible guardar los cambios del salón.",
				});
			} finally {
				setPendingAction(null);
			}
		});
	}

	return (
		<>
			<Card>
				<CardHeader className="border-b">
					<CardTitle>Listado de salones</CardTitle>
					<p className="text-sm text-muted-foreground">
						Busca y filtra para encontrar el salón que deseas gestionar.
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
						<div>
							<Label htmlFor="salon-search" className="sr-only">
								Buscar salones
							</Label>
							<div className="relative">
								<Search
									className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
									aria-hidden="true"
								/>
								<Input
									id="salon-search"
									type="search"
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									placeholder="Nombre, slug o propietario…"
									className="pl-8"
								/>
							</div>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="status-filter">Estado</Label>
							<select
								id="status-filter"
								value={statusFilter}
								onChange={(event) => setStatusFilter(event.target.value)}
								className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							>
								<option value="all">Todos los estados</option>
								{FILTER_STATUS_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="plan-filter">Plan</Label>
							<select
								id="plan-filter"
								value={planFilter}
								onChange={(event) => setPlanFilter(event.target.value)}
								className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
							>
								<option value="all">Todos los planes</option>
								<option value={NO_PLAN_FILTER}>Sin plan</option>
								{plans.map((plan) => (
									<option key={plan.id} value={plan.id}>
										{plan.name}
									</option>
								))}
							</select>
						</div>
					</div>

					<p className="text-xs text-muted-foreground" aria-live="polite">
						{filteredSalons.length} de {salons.length} salones
					</p>

					{filteredSalons.length === 0 ? (
						<div className="rounded-lg border border-dashed px-4 py-10 text-center">
							<p className="font-medium">
								{salons.length === 0
									? "No hay salones registrados."
									: "No se encontraron salones."}
							</p>
							{salons.length > 0 && (
								<p className="mt-1 text-sm text-muted-foreground">
									Prueba con otra búsqueda o cambia los filtros.
								</p>
							)}
						</div>
					) : (
						<div className="divide-y rounded-lg border">
							{filteredSalons.map((salon) => (
								<article
									key={salon.id}
									className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(9rem,0.65fr)_minmax(12rem,0.8fr)_auto] md:items-center"
								>
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="font-semibold">{salon.name}</h3>
											<Badge variant={statusBadgeVariant(salon.status)}>
												{statusLabel(salon.status)}
											</Badge>
										</div>
										<p className="mt-1 text-sm text-muted-foreground">
											/s/{salon.slug}
										</p>
										<p className="mt-2 truncate text-sm">
											{salon.owner.name} · {salon.owner.email}
										</p>
									</div>
									<div>
										<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
											Plan asignado
										</p>
										<p className="mt-1 text-sm">
											{salon.plan?.name ?? "Sin plan"}
										</p>
									</div>
									<div>
										<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
											Último trial
										</p>
										<p className="mt-1 text-sm">
											{trialEndLabel(salon.latestTrial)}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										className="w-full md:w-auto"
										onClick={() => openManagement(salon)}
									>
										<Settings2 />
										Gestionar
									</Button>
								</article>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={Boolean(selectedSalon)}
				onOpenChange={(open) => {
					if (!open) closeManagement();
				}}
			>
				<DialogContent
					className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl"
					showCloseButton={false}
				>
					{selectedSalon && (
						<>
							<DialogHeader>
								<DialogTitle>Gestionar {selectedSalon.name}</DialogTitle>
								<DialogDescription>
									Actualiza el estado, plan, trial y notas privadas del salón.
								</DialogDescription>
							</DialogHeader>

							<div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-3">
								<Badge variant={statusBadgeVariant(selectedSalon.status)}>
									{statusLabel(selectedSalon.status)}
								</Badge>
								<span className="text-sm text-muted-foreground">
									{selectedSalon.owner.name} · {selectedSalon.owner.email}
								</span>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="management-status">Estado</Label>
									<select
										id="management-status"
										value={selectedStatus}
										onChange={(event) =>
											setSelectedStatus(
												event.target.value as AdminMutableSalonStatus,
											)
										}
										disabled={isPending}
										className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
									>
										{!selectedStatus && (
											<option value="">Selecciona un estado</option>
										)}
										{STATUS_OPTIONS.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
									{!isMutableStatus(selectedSalon.status) && (
										<p className="text-xs text-muted-foreground">
											El estado actual es{" "}
											{statusLabel(selectedSalon.status).toLowerCase()}.
										</p>
									)}
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="management-plan">Plan activo</Label>
									<select
										id="management-plan"
										value={selectedPlanId}
										onChange={(event) => setSelectedPlanId(event.target.value)}
										disabled={isPending}
										className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
									>
										<option value="">Sin plan</option>
										{selectedPlanIsInactive && selectedSalon.planId && (
											<option value={selectedSalon.planId} disabled>
												{selectedSalon.plan?.name ?? "Plan actual"} (inactivo)
											</option>
										)}
										{plans.map((plan) => (
											<option key={plan.id} value={plan.id}>
												{plan.name}
											</option>
										))}
									</select>
								</div>
							</div>

							<section
								className="space-y-3 rounded-lg border p-3"
								aria-labelledby="trial-actions-title"
							>
								<div className="flex items-start gap-2">
									<CalendarDays
										className="mt-0.5 size-4 text-primary"
										aria-hidden="true"
									/>
									<div>
										<h3 id="trial-actions-title" className="font-medium">
											Período de prueba
										</h3>
										<p className="text-xs text-muted-foreground">
											{trialEndLabel(selectedSalon.latestTrial)}
											{selectedSalon.latestTrial
												? ` · ${selectedSalon.latestTrial.planName}`
												: ""}
										</p>
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									{EXTENSION_OPTIONS.map((days) => (
										<Button
											key={days}
											type="button"
											variant="outline"
											disabled={isPending}
											onClick={() =>
												runAction(
													`extend-${days}`,
													() => extendSalonTrial(selectedSalon.id, days),
													`Trial extendido por ${days} días.`,
													() => {
														if (
															selectedSalon.status === "suspended" ||
															selectedSalon.status === "cancelled"
														) {
															setSelectedStatus("trial");
														}
													},
												)
											}
										>
											{pendingAction === `extend-${days}`
												? "Procesando…"
												: `+${days} días`}
										</Button>
									))}
									<Button
										type="button"
										variant="secondary"
										disabled={isPending}
										onClick={() =>
											runAction(
												"email",
												() => sendTrialExpirationNotice(selectedSalon.id),
												"Notificación enviada.",
											)
										}
									>
										<Mail />
										{pendingAction === "email" ? "Enviando…" : "Enviar aviso"}
									</Button>
								</div>
							</section>

							<div className="space-y-1.5">
								<Label htmlFor="admin-notes">
									Notas administrativas privadas
								</Label>
								<textarea
									id="admin-notes"
									value={adminNotes}
									onChange={(event) => setAdminNotes(event.target.value)}
									disabled={isPending}
									maxLength={2000}
									rows={4}
									placeholder="Escribe observaciones internas sobre este salón…"
									className="w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
								/>
								<p className="text-right text-xs text-muted-foreground">
									{adminNotes.length}/2000
								</p>
							</div>

							<p
								className={`min-h-5 text-sm ${
									feedback?.tone === "error"
										? "text-destructive"
										: "text-emerald-600"
								}`}
								aria-live="polite"
							>
								{feedback?.message}
							</p>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									disabled={isPending}
									onClick={closeManagement}
								>
									Cancelar
								</Button>
								<Button
									type="button"
									disabled={isPending || !selectedStatus}
									onClick={saveChanges}
								>
									{pendingAction === "save" ? "Guardando…" : "Guardar cambios"}
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
