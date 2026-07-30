"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, Scissors, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CreateSpecialistDialog } from "./create-specialist-dialog";
import {
	deleteSpecialist,
	updateSpecialistServices,
} from "@/app/actions/owner";

interface Service {
	id: string;
	name: string;
	price: number;
	durationMinutes: number;
}

interface SpecialistServiceRelation {
	serviceId: string;
}

interface Specialist {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	specialty: string | null;
	isActive: boolean;
	specialistServices: SpecialistServiceRelation[];
}

export function SpecialistsView({
	slug,
	specialists,
	services,
}: {
	slug: string;
	specialists: Specialist[];
	services: Service[];
}) {
	const [selectedSpecialist, setSelectedSpecialist] =
		useState<Specialist | null>(null);
	const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
	const [isServicesDialogOpen, setIsServicesDialogOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function openServicesDialog(specialist: Specialist) {
		setSelectedSpecialist(specialist);
		setAssignedServiceIds(
			specialist.specialistServices.map((relation) => relation.serviceId),
		);
		setErrorMessage(null);
		setIsServicesDialogOpen(true);
	}

	function toggleServiceSelection(serviceId: string) {
		setAssignedServiceIds((currentIds) =>
			currentIds.includes(serviceId)
				? currentIds.filter((id) => id !== serviceId)
				: [...currentIds, serviceId],
		);
	}

	async function handleSaveServices() {
		if (!selectedSpecialist) return;
		setIsPending(true);
		setErrorMessage(null);
		const result = await updateSpecialistServices(
			selectedSpecialist.id,
			assignedServiceIds,
			slug,
		);
		setIsPending(false);
		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setIsServicesDialogOpen(false);
		}
	}

	async function handleDelete(specialistId: string) {
		if (!confirm("¿Estás seguro de eliminar a este especialista?")) return;
		setIsPending(true);
		await deleteSpecialist(specialistId, slug);
		setIsPending(false);
	}

	return (
		<div className="space-y-5 sm:space-y-6">
			{errorMessage && (
				<div className="rounded-xl bg-destructive/15 p-4 text-sm font-medium text-destructive">
					{errorMessage}
				</div>
			)}

			<header className="flex items-start justify-between gap-3 sm:items-center">
				<div className="min-w-0">
					<h2 className="text-2xl font-bold tracking-tight">Especialistas</h2>
					<p className="text-sm text-muted-foreground sm:text-base">
						Tu equipo de profesionales y los servicios que realizan.
					</p>
				</div>
				<div className="shrink-0 active:scale-[0.98]">
					<CreateSpecialistDialog slug={slug} />
				</div>
			</header>

			{specialists.length === 0 ? (
				<div className="rounded-2xl border bg-card px-6 py-12 text-center text-muted-foreground shadow-sm">
					No tienes especialistas registrados. Añade uno para comenzar a recibir
					citas.
				</div>
			) : (
				<section aria-label="Equipo de especialistas" className="space-y-2">
					<h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
						Equipo
					</h3>
					<div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:shadow-none lg:grid-cols-3">
						{specialists.map((specialist) => {
							const assignedCount = specialist.specialistServices.length;
							return (
								<article
									key={specialist.id}
									className="border-b p-4 last:border-b-0 md:rounded-2xl md:border md:bg-card md:p-5 md:shadow-sm"
								>
									<div className="flex items-center gap-3 md:flex-col md:text-center">
										<Avatar className="h-14 w-14 shrink-0 md:h-20 md:w-20">
											<AvatarFallback className="bg-primary/10 text-lg font-bold text-primary md:text-2xl">
												{specialist.name.substring(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1 md:flex-none">
											<h4 className="truncate text-base font-bold md:text-lg">
												{specialist.name}
											</h4>
											<p className="truncate text-sm text-muted-foreground">
												{specialist.specialty || "Sin especialidad"}
											</p>
										</div>
										<Badge
											variant={specialist.isActive ? "default" : "secondary"}
											className="shrink-0"
										>
											{specialist.isActive ? "Disponible" : "No disponible"}
										</Badge>
									</div>

									<div className="mt-4 flex min-h-11 items-center justify-between rounded-xl bg-muted/60 px-3 text-sm">
										<span className="flex items-center gap-2 font-medium">
											<Scissors className="h-4 w-4 text-muted-foreground" />
											Servicios asignados
										</span>
										<strong>{assignedCount}</strong>
									</div>

									<div className="mt-3 grid grid-cols-2 gap-2">
										<Button
											type="button"
											variant="outline"
											className="min-h-11 gap-2 text-xs active:scale-[0.98]"
											onClick={() => openServicesDialog(specialist)}
										>
											<Scissors className="h-4 w-4" />
											Servicios
										</Button>
										<Link
											href={`/s/${slug}/schedules`}
											className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-secondary px-4 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/80 active:scale-[0.98]"
										>
											<Clock className="h-4 w-4" /> Horarios
										</Link>
										<Button
											type="button"
											variant="ghost"
											className="col-span-2 min-h-11 gap-2 text-xs text-destructive hover:text-destructive active:scale-[0.98]"
											onClick={() => handleDelete(specialist.id)}
											disabled={isPending}
										>
											<Trash2 className="h-4 w-4" /> Eliminar especialista
										</Button>
									</div>
								</article>
							);
						})}
					</div>
				</section>
			)}

			<Dialog
				open={isServicesDialogOpen}
				onOpenChange={setIsServicesDialogOpen}
			>
				<DialogContent className="max-h-[90dvh] max-w-md overflow-hidden rounded-t-2xl sm:rounded-lg">
					<DialogHeader>
						<DialogTitle>Servicios de {selectedSpecialist?.name}</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						Selecciona los servicios que este profesional está capacitado para
						realizar.
					</p>

					<div className="smooth-scroll my-2 max-h-[50dvh] overflow-y-auto rounded-2xl border bg-muted/30 p-2">
						{services.length === 0 ? (
							<p className="py-6 text-center text-xs text-muted-foreground">
								No hay servicios creados en el salón. Crea servicios primero en
								la pestaña &quot;Servicios&quot;.
							</p>
						) : (
							<div className="overflow-hidden rounded-xl border bg-card">
								{services.map((service) => {
									const isSelected = assignedServiceIds.includes(service.id);
									return (
										<button
											key={service.id}
											type="button"
											role="checkbox"
											aria-checked={isSelected}
											onClick={() => toggleServiceSelection(service.id)}
											className={`flex min-h-14 w-full items-center justify-between gap-3 border-b px-3 py-2 text-left transition last:border-b-0 active:scale-[0.98] ${
												isSelected ? "bg-primary/5" : "hover:bg-accent"
											}`}
										>
											<span className="min-w-0">
												<span className="block truncate text-sm font-medium">
													{service.name}
												</span>
												<span className="block text-xs text-muted-foreground">
													${service.price.toFixed(2)} •{" "}
													{service.durationMinutes} min
												</span>
											</span>
											<span
												className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/60 bg-background"}`}
												aria-hidden="true"
											>
												{isSelected && <Check className="h-4 w-4" />}
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					<DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsServicesDialogOpen(false)}
							className="min-h-11 active:scale-[0.98]"
						>
							Cancelar
						</Button>
						<Button
							type="button"
							onClick={handleSaveServices}
							disabled={isPending}
							className="min-h-11 active:scale-[0.98]"
						>
							Guardar Asignaciones
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
