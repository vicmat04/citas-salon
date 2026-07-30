"use client";

import type { Salon } from "@prisma/client";
import {
	AlertCircle,
	BellRing,
	CheckCircle2,
	LoaderCircle,
} from "lucide-react";
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
		kind: "pending" | "success" | "error";
		message: string;
	} | null>(null);

	const handleSubmit = async (formData: FormData) => {
		setFeedback({ kind: "pending", message: "Guardando configuración..." });
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
		<Card className="min-w-0 overflow-hidden rounded-2xl">
			<form action={handleSubmit}>
				<CardHeader className="border-b bg-muted/20 px-4 py-5 sm:px-6">
					<CardTitle>Información del salón</CardTitle>
					<CardDescription>
						Personaliza los datos públicos y cómo recibes las alertas.
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-0 p-0 [&_[data-slot=input]]:min-h-11">
					<section
						className="space-y-4 px-4 py-5 sm:px-6"
						aria-labelledby="public-settings-title"
					>
						<div>
							<h3 id="public-settings-title" className="text-sm font-bold">
								Perfil público
							</h3>
							<p className="text-xs text-muted-foreground">
								Estos datos aparecen en tu página pública de reservas.
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="name">Nombre del salón</Label>
							<Input
								id="name"
								name="name"
								defaultValue={salon.name}
								className="rounded-xl"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="slogan">Eslogan o descripción corta</Label>
							<Input
								id="slogan"
								name="slogan"
								defaultValue={salon.slogan || ""}
								className="rounded-xl"
							/>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
							<div className="space-y-2">
								<Label htmlFor="phone">Teléfono de contacto</Label>
								<Input
									id="phone"
									name="phone"
									type="tel"
									defaultValue={salon.phone || ""}
									className="rounded-xl"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="themeColor">Color del tema</Label>
								<Input
									id="themeColor"
									name="themeColor"
									type="color"
									defaultValue={salon.themeColor}
									className="min-h-11 cursor-pointer rounded-xl px-1 py-1 active:scale-[0.98]"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="address">Dirección completa</Label>
							<Input
								id="address"
								name="address"
								defaultValue={salon.address || ""}
								className="rounded-xl"
							/>
						</div>
					</section>

					<section
						className="space-y-4 border-t px-4 py-5 sm:px-6"
						aria-labelledby="notification-settings-title"
					>
						<div className="flex items-center gap-2">
							<BellRing className="size-4 text-primary" />
							<h3
								id="notification-settings-title"
								className="text-sm font-bold"
							>
								Notificaciones
							</h3>
						</div>

						<div className="overflow-hidden rounded-2xl border bg-card">
							<label
								htmlFor="ownerEmailNotificationsEnabled"
								className="flex min-h-16 cursor-pointer items-center justify-between gap-4 p-4 transition-colors active:bg-muted/60"
							>
								<span className="min-w-0">
									<span className="block text-sm font-medium">
										Avisos de citas por correo
									</span>
									<span className="mt-0.5 block text-xs text-muted-foreground">
										Se enviarán a {ownerEmailMasked}
									</span>
								</span>
								<span className="relative flex min-h-11 min-w-14 shrink-0 items-center justify-center">
									<input
										id="ownerEmailNotificationsEnabled"
										name="ownerEmailNotificationsEnabled"
										type="checkbox"
										role="switch"
										defaultChecked={salon.ownerEmailNotificationsEnabled}
										className="peer sr-only"
									/>
									<span
										aria-hidden="true"
										className="h-8 w-13 rounded-full bg-muted-foreground/30 p-1 transition-colors duration-200 after:block after:size-6 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
									/>
								</span>
							</label>
							<p className="border-t px-4 py-3 text-xs text-muted-foreground">
								Esta preferencia no cambia los correos del cliente ni del
								especialista.
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="notificationEmails">
								Correos para alertas administrativas
							</Label>
							<Input
								id="notificationEmails"
								name="notificationEmails"
								defaultValue={salon.notificationEmails || ""}
								placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
								className="rounded-xl"
							/>
							<p className="text-xs text-muted-foreground">
								Sepáralos por coma. Solo reciben alertas administrativas o de
								suscripción.
							</p>
						</div>
					</section>
				</CardContent>

				<CardFooter className="flex-col items-stretch gap-3 border-t bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<div className="min-h-5 min-w-0" aria-live="polite">
						{feedback && (
							<p
								role="status"
								className={
									feedback.kind === "success"
										? "flex items-center gap-2 text-sm font-medium text-emerald-700"
										: feedback.kind === "error"
											? "flex items-center gap-2 text-sm font-medium text-destructive"
											: "flex items-center gap-2 text-sm font-medium text-muted-foreground"
								}
							>
								{feedback.kind === "success" ? (
									<CheckCircle2 className="size-4 shrink-0" />
								) : feedback.kind === "error" ? (
									<AlertCircle className="size-4 shrink-0" />
								) : (
									<LoaderCircle className="size-4 shrink-0 animate-spin" />
								)}
								{feedback.message}
							</p>
						)}
					</div>
					<Button
						className="min-h-11 w-full active:scale-[0.98] sm:w-auto"
						type="submit"
						disabled={isPending}
					>
						{isPending ? "Guardando..." : "Guardar cambios"}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}
