"use client";

import type { Salon } from "@prisma/client";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateSalonSettings } from "@/app/actions/owner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({
	salon,
	slug,
	ownerEmailMasked,
}: {
	salon: Salon;
	slug: string;
	ownerEmailMasked: string;
}) {
	const [isPending, startTransition] = useTransition();
	const [feedback, setFeedback] = useState<{
		kind: "success" | "error";
		message: string;
	} | null>(null);

	const handleSubmit = async (formData: FormData) => {
		setFeedback(null);
		startTransition(async () => {
			const result = await updateSalonSettings(formData, slug);
			if (result.error) {
				setFeedback({ kind: "error", message: result.error });
				toast.error(result.error);
			} else {
				const message = "Configuración actualizada correctamente.";
				setFeedback({ kind: "success", message });
				toast.success(message);
			}
		});
	};

	return (
		<Card className="min-w-0">
			<form action={handleSubmit}>
				<CardHeader>
					<CardTitle>Información Pública</CardTitle>
					<CardDescription>
						Estos datos se mostrarán en tu página pública de reservas.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 [&_[data-slot=input]]:min-h-11">
					<div className="space-y-2">
						<Label htmlFor="name">Nombre del Salón</Label>
						<Input id="name" name="name" defaultValue={salon.name} required />
					</div>
					<div className="space-y-2">
						<Label htmlFor="slogan">Eslogan o descripción corta</Label>
						<Input
							id="slogan"
							name="slogan"
							defaultValue={salon.slogan || ""}
						/>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="phone">Teléfono de contacto</Label>
							<Input id="phone" name="phone" defaultValue={salon.phone || ""} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="themeColor">Color del Tema (Hex)</Label>
							<Input
								id="themeColor"
								name="themeColor"
								type="color"
								defaultValue={salon.themeColor}
								className="min-h-11 px-1 py-1"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="address">Dirección completa</Label>
						<Input
							id="address"
							name="address"
							defaultValue={salon.address || ""}
						/>
					</div>
					<div className="rounded-lg border p-4 space-y-2">
						<label
							htmlFor="ownerEmailNotificationsEnabled"
							className="flex min-h-11 cursor-pointer items-center gap-3"
						>
							<input
								id="ownerEmailNotificationsEnabled"
								name="ownerEmailNotificationsEnabled"
								type="checkbox"
								defaultChecked={salon.ownerEmailNotificationsEnabled}
								className="h-5 w-5 rounded border-input"
							/>
							<span className="min-w-0 font-medium">
								Recibir en mi correo las notificaciones de citas
							</span>
						</label>
						<p className="text-xs text-muted-foreground">
							Se enviarán a {ownerEmailMasked}. Esta preferencia no cambia los
							correos del cliente ni del especialista.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="notificationEmails">
							Correos para alertas administrativas (separados por coma)
						</Label>
						<Input
							id="notificationEmails"
							name="notificationEmails"
							defaultValue={salon.notificationEmails || ""}
							placeholder="victorpty999@gmail.com, dayanisr270@gmail.com"
						/>
						<p className="text-xs text-muted-foreground">
							Correos adicionales para alertas administrativas/de suscripción;
							no reciben notificaciones de citas.
						</p>
					</div>
				</CardContent>
				<CardFooter className="flex-col items-start gap-3">
					{feedback && (
						<p
							role="status"
							className={
								feedback.kind === "success"
									? "text-sm font-medium text-emerald-700"
									: "text-sm font-medium text-destructive"
							}
						>
							{feedback.message}
						</p>
					)}
					<Button className="min-h-11" type="submit" disabled={isPending}>
						{isPending ? "Guardando..." : "Guardar Cambios"}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}
