"use client";

import { useState } from "react";
import { CalendarPlus, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createManualAppointment } from "@/app/actions/appointments";
import { ResponsiveAppointmentModal } from "./responsive-appointment-modal";

interface Service {
	id: string;
	name: string;
	price: number;
	durationMinutes: number;
}

interface Specialist {
	id: string;
	name: string;
}

export function CreateManualAppointmentDialog({
	slug,
	services,
	specialists,
	onCreated,
}: {
	slug: string;
	services: Service[];
	specialists: Specialist[];
	onCreated?: (notificationState: "queued" | undefined) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [warningMessage, setWarningMessage] = useState<string | null>(null);

	const [customerName, setCustomerName] = useState("");
	const [customerPhone, setCustomerPhone] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
	const [selectedSpecialistId, setSelectedSpecialistId] =
		useState<string>("any");
	const [date, setDate] = useState<string>(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [startTime, setStartTime] = useState<string>("10:00");
	const [customerNotes, setCustomerNotes] = useState("");
	const [internalNotes, setInternalNotes] = useState("");
	const [allowOverlap, setAllowOverlap] = useState(false);
	const formId = "create-manual-appointment-form";

	function resetForm() {
		setCustomerName("");
		setCustomerPhone("");
		setCustomerEmail("");
		setSelectedServiceIds([]);
		setSelectedSpecialistId("any");
		setDate(new Date().toISOString().slice(0, 10));
		setStartTime("10:00");
		setCustomerNotes("");
		setInternalNotes("");
		setAllowOverlap(false);
		setErrorMessage(null);
		setWarningMessage(null);
	}

	function setOpen(open: boolean) {
		setIsOpen(open);
		if (!open) resetForm();
	}

	function toggleService(serviceId: string) {
		setSelectedServiceIds((previous) =>
			previous.includes(serviceId)
				? previous.filter((id) => id !== serviceId)
				: [...previous, serviceId],
		);
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setIsPending(true);
		setErrorMessage(null);

		const formData = new FormData();
		formData.set("customerName", customerName);
		formData.set("customerPhone", customerPhone);
		formData.set("customerEmail", customerEmail);
		formData.set("date", date);
		formData.set("startTime", startTime);
		formData.set("serviceIds", selectedServiceIds.join(","));
		formData.set("specialistId", selectedSpecialistId);
		formData.set("customerNotes", customerNotes);
		formData.set("internalNotes", internalNotes);
		if (allowOverlap) formData.set("allowOverlap", "true");

		const result = await createManualAppointment(formData, slug);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
			setWarningMessage(null);
		} else if (result.warning) {
			setWarningMessage(
				result.message ||
					"Atención: Horario fuera de disponibilidad o solapado.",
			);
			setErrorMessage(null);
		} else {
			onCreated?.(
				"notification" in result ? result.notification?.state : undefined,
			);
			setOpen(false);
		}
	}

	return (
		<ResponsiveAppointmentModal
			open={isOpen}
			onOpenChange={setOpen}
			title="Agendar cita manual"
			trigger={
				<Button
					className="min-h-11 gap-2 font-bold active:scale-[0.98]"
					type="button"
				>
					<CalendarPlus className="h-4 w-4" />
					Nueva Cita
				</Button>
			}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						className="min-h-11 active:scale-[0.98]"
						onClick={() => setOpen(false)}
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						form={formId}
						disabled={isPending}
						className="min-h-11 gap-2 font-bold active:scale-[0.98]"
					>
						{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
						{warningMessage && allowOverlap
							? "Forzar agendamiento"
							: "Agendar cita"}
					</Button>
				</>
			}
		>
			{errorMessage && (
				<div className="mb-4 rounded-xl bg-destructive/15 p-3 text-sm font-medium text-destructive">
					{errorMessage}
				</div>
			)}

			{warningMessage && (
				<div className="mb-4 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/15 p-4">
					<div className="flex items-start gap-2 text-sm font-semibold text-amber-700">
						<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
						<span>{warningMessage}</span>
					</div>
					<label className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-amber-500/20 pt-2 text-xs font-bold text-amber-900 active:scale-[0.98]">
						<input
							type="checkbox"
							checked={allowOverlap}
							onChange={(event) => setAllowOverlap(event.target.checked)}
							className="size-5 rounded border-amber-500 text-primary"
						/>
						Confirmo que deseo forzar el agendamiento en este horario.
					</label>
				</div>
			)}

			<form id={formId} onSubmit={handleSubmit} className="space-y-4">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div>
						<Label htmlFor="m-name">Nombre Cliente *</Label>
						<Input
							className="min-h-11"
							id="m-name"
							value={customerName}
							onChange={(event) => setCustomerName(event.target.value)}
							placeholder="ej: Juan Pérez"
							required
						/>
					</div>
					<div>
						<Label htmlFor="m-phone">Teléfono / WhatsApp *</Label>
						<Input
							className="min-h-11"
							id="m-phone"
							value={customerPhone}
							onChange={(event) => setCustomerPhone(event.target.value)}
							placeholder="+507 6000 0000"
							required
						/>
					</div>
				</div>

				<div>
					<Label htmlFor="m-email">Correo Electrónico (opcional)</Label>
					<Input
						className="min-h-11"
						id="m-email"
						type="email"
						value={customerEmail}
						onChange={(event) => setCustomerEmail(event.target.value)}
						placeholder="juan@ejemplo.com"
					/>
				</div>

				<fieldset>
					<legend className="text-sm font-semibold">Servicios *</legend>
					<div className="mt-1 max-h-40 space-y-1.5 overflow-y-auto rounded-xl border p-2">
						{services.map((service) => {
							const isSelected = selectedServiceIds.includes(service.id);
							return (
								<button
									type="button"
									key={service.id}
									onClick={() => toggleService(service.id)}
									aria-pressed={isSelected}
									className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-xs transition-all active:scale-[0.98] ${
										isSelected
											? "border-primary bg-primary/10 font-semibold"
											: "border-transparent hover:bg-accent"
									}`}
								>
									<span>
										{service.name} ({service.durationMinutes} min)
									</span>
									<span className="shrink-0 font-bold text-primary">
										${service.price.toFixed(2)}
									</span>
								</button>
							);
						})}
					</div>
				</fieldset>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div>
						<Label>Especialista</Label>
						<div className="mt-1.5 flex flex-wrap gap-1.5">
							<button
								type="button"
								onClick={() => setSelectedSpecialistId("any")}
								className={`min-h-11 flex-1 rounded-lg border px-3 text-xs font-medium transition-all active:scale-[0.98] ${
									selectedSpecialistId === "any"
										? "border-primary bg-primary text-primary-foreground font-semibold"
										: "border-input bg-background hover:bg-accent"
								}`}
							>
								Cualquiera
							</button>
							{specialists.map((specialist) => (
								<button
									type="button"
									key={specialist.id}
									onClick={() => setSelectedSpecialistId(specialist.id)}
									className={`min-h-11 flex-1 rounded-lg border px-3 text-xs font-medium transition-all active:scale-[0.98] ${
										selectedSpecialistId === specialist.id
											? "border-primary bg-primary text-primary-foreground font-semibold"
											: "border-input bg-background hover:bg-accent"
									}`}
								>
									{specialist.name}
								</button>
							))}
						</div>
					</div>

					<div>
						<Label htmlFor="m-date">Fecha *</Label>
						<Input
							className="min-h-11"
							id="m-date"
							type="date"
							value={date}
							onChange={(event) => setDate(event.target.value)}
							required
						/>
					</div>
					<div>
						<Label htmlFor="m-time">Hora Inicio *</Label>
						<Input
							className="min-h-11"
							id="m-time"
							type="time"
							value={startTime}
							onChange={(event) => setStartTime(event.target.value)}
							required
						/>
					</div>
				</div>

				<div>
					<Label htmlFor="m-internal">
						Notas Internas (visibles solo para el staff)
					</Label>
					<Input
						className="min-h-11"
						id="m-internal"
						value={internalNotes}
						onChange={(event) => setInternalNotes(event.target.value)}
						placeholder="ej: Cliente frecuente, prefiere silla 2..."
					/>
				</div>
			</form>
		</ResponsiveAppointmentModal>
	);
}
