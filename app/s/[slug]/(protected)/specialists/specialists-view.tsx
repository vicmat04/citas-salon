"use client";

import { useState } from "react";
import Link from "next/link";
import { Scissors, Clock, Trash2, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
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

	function openServicesDialog(spec: Specialist) {
		setSelectedSpecialist(spec);
		setAssignedServiceIds(spec.specialistServices.map((ss) => ss.serviceId));
		setErrorMessage(null);
		setIsServicesDialogOpen(true);
	}

	function toggleServiceSelection(serviceId: string) {
		setAssignedServiceIds((prev) =>
			prev.includes(serviceId)
				? prev.filter((id) => id !== serviceId)
				: [...prev, serviceId],
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
		<div className="space-y-6">
			{errorMessage && (
				<div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive font-medium">
					{errorMessage}
				</div>
			)}

			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Especialistas</h2>
					<p className="text-muted-foreground">
						Tu equipo de profesionales y los servicios que realizan.
					</p>
				</div>
				<CreateSpecialistDialog slug={slug} />
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{specialists.length === 0 && (
					<div className="col-span-full py-12 text-center text-muted-foreground">
						No tienes especialistas registrados. Añade uno para comenzar a
						recibir citas.
					</div>
				)}
				{specialists.map((specialist) => {
					const assignedCount = specialist.specialistServices.length;
					return (
						<Card key={specialist.id}>
							<CardContent className="p-6 flex flex-col items-center text-center space-y-4">
								<Avatar className="h-20 w-20">
									<AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
										{specialist.name.substring(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div>
									<h3 className="font-bold text-lg">{specialist.name}</h3>
									<p className="text-sm text-muted-foreground">
										{specialist.specialty || "Sin especialidad"}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Badge
										variant={specialist.isActive ? "default" : "secondary"}
									>
										{specialist.isActive ? "Disponible" : "No disponible"}
									</Badge>
									<Badge variant="outline" className="gap-1">
										<Scissors className="h-3 w-3" />
										{assignedCount}{" "}
										{assignedCount === 1 ? "servicio" : "servicios"}
									</Badge>
								</div>

								<div className="w-full space-y-2 pt-2">
									<Button
										variant="outline"
										className="w-full gap-2 text-xs"
										onClick={() => openServicesDialog(specialist)}
									>
										<Scissors className="h-3.5 w-3.5" />
										Asignar Servicios
									</Button>
									<Link href={`/s/${slug}/schedules`}>
										<Button
											variant="secondary"
											className="w-full gap-2 text-xs mt-2"
										>
											<Clock className="h-3.5 w-3.5" />
											Gestionar Horarios
										</Button>
									</Link>
									<Button
										variant="ghost"
										className="w-full text-xs text-destructive hover:text-destructive gap-1 mt-1"
										onClick={() => handleDelete(specialist.id)}
										disabled={isPending}
									>
										<Trash2 className="h-3.5 w-3.5" />
										Eliminar
									</Button>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Services Assignment Dialog */}
			<Dialog
				open={isServicesDialogOpen}
				onOpenChange={setIsServicesDialogOpen}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Servicios de {selectedSpecialist?.name}</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						Selecciona los servicios que este profesional está capacitado para
						realizar.
					</p>

					<div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-3 my-2">
						{services.length === 0 ? (
							<p className="text-xs text-muted-foreground text-center py-4">
								No hay servicios creados en el salón. Crea servicios primero en
								la pestaña &quot;Servicios&quot;.
							</p>
						) : (
							services.map((srv) => {
								const isSelected = assignedServiceIds.includes(srv.id);
								return (
									<div
										key={srv.id}
										onClick={() => toggleServiceSelection(srv.id)}
										className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer border transition-colors ${
											isSelected
												? "border-primary bg-primary/5"
												: "hover:bg-accent"
										}`}
									>
										<div>
											<p className="text-sm font-medium">{srv.name}</p>
											<p className="text-xs text-muted-foreground">
												${srv.price.toFixed(2)} • {srv.durationMinutes} min
											</p>
										</div>
										<div
											className={`h-5 w-5 rounded border flex items-center justify-center ${
												isSelected
													? "bg-primary border-primary text-primary-foreground"
													: "border-muted-foreground"
											}`}
										>
											{isSelected && <Check className="h-3.5 w-3.5" />}
										</div>
									</div>
								);
							})
						)}
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsServicesDialogOpen(false)}
						>
							Cancelar
						</Button>
						<Button onClick={handleSaveServices} disabled={isPending}>
							Guardar Asignaciones
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
