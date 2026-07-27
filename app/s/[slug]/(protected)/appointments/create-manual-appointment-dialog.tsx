"use client";

import { useState } from "react";
import { CalendarPlus, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createManualAppointment } from "@/app/actions/appointments";

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
}: {
	slug: string;
	services: Service[];
	specialists: Specialist[];
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [warningMessage, setWarningMessage] = useState<string | null>(null);

	// Form state
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

	function toggleService(serviceId: string) {
		setSelectedServiceIds((prev) =>
			prev.includes(serviceId)
				? prev.filter((id) => id !== serviceId)
				: [...prev, serviceId],
		);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
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
		if (allowOverlap) {
			formData.set("allowOverlap", "true");
		}

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
			setIsOpen(false);
			resetForm();
		}
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				setIsOpen(open);
				if (!open) resetForm();
			}}
		>
			<DialogTrigger>
				<Button className="gap-2 font-bold" type="button">
					<CalendarPlus className="h-4 w-4" />
					Nueva Cita
				</Button>
			</DialogTrigger>

			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Agendar Cita Manual (Presencial / Teléfono)</DialogTitle>
				</DialogHeader>

				{errorMessage && (
					<div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium">
						{errorMessage}
					</div>
				)}

				{warningMessage && (
					<div className="rounded-md bg-amber-500/15 border border-amber-500/30 p-4 space-y-3">
						<div className="flex items-start gap-2 text-amber-700 font-semibold text-sm">
							<AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
							<span>{warningMessage}</span>
						</div>
						<div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
							<input
								type="checkbox"
								id="force-overlap"
								checked={allowOverlap}
								onChange={(e) => setAllowOverlap(e.target.checked)}
								className="h-4 w-4 rounded border-amber-500 text-primary"
							/>
							<Label
								htmlFor="force-overlap"
								className="text-xs font-bold text-amber-900 cursor-pointer"
							>
								Confirmar desición: Deseo forzar el agendamiento en este
								horario.
							</Label>
						</div>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<Label htmlFor="m-name">Nombre Cliente *</Label>
							<Input
								id="m-name"
								value={customerName}
								onChange={(e) => setCustomerName(e.target.value)}
								placeholder="ej: Juan Pérez"
								required
							/>
						</div>
						<div>
							<Label htmlFor="m-phone">Teléfono / WhatsApp *</Label>
							<Input
								id="m-phone"
								value={customerPhone}
								onChange={(e) => setCustomerPhone(e.target.value)}
								placeholder="+507 6000 0000"
								required
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="m-email">Correo Electrónico (opcional)</Label>
						<Input
							id="m-email"
							type="email"
							value={customerEmail}
							onChange={(e) => setCustomerEmail(e.target.value)}
							placeholder="juan@ejemplo.com"
						/>
					</div>

					<div>
						<Label className="font-semibold text-sm">Servicios *</Label>
						<div className="max-h-36 overflow-y-auto space-y-1.5 border rounded-md p-2 mt-1">
							{services.map((srv) => {
								const isSelected = selectedServiceIds.includes(srv.id);
								return (
									<div
										key={srv.id}
										onClick={() => toggleService(srv.id)}
										className={`flex items-center justify-between p-2 rounded cursor-pointer border text-xs transition-colors ${
											isSelected
												? "border-primary bg-primary/5 font-semibold"
												: "hover:bg-accent"
										}`}
									>
										<span>
											{srv.name} ({srv.durationMinutes} min)
										</span>
										<span className="font-bold text-primary">
											${srv.price.toFixed(2)}
										</span>
									</div>
								);
							})}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div>
							<Label htmlFor="m-spec">Especialista</Label>
							<select
								id="m-spec"
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								value={selectedSpecialistId}
								onChange={(e) => setSelectedSpecialistId(e.target.value)}
							>
								<option value="any">-- Cualquiera --</option>
								{specialists.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<Label htmlFor="m-date">Fecha *</Label>
							<Input
								id="m-date"
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								required
							/>
						</div>

						<div>
							<Label htmlFor="m-time">Hora Inicio *</Label>
							<Input
								id="m-time"
								type="time"
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
								required
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="m-internal">
							Notas Internas (visibles solo para el staff)
						</Label>
						<Input
							id="m-internal"
							value={internalNotes}
							onChange={(e) => setInternalNotes(e.target.value)}
							placeholder="ej: Cliente frecuente, prefiere silla 2..."
						/>
					</div>

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={isPending}
							className="font-bold gap-2"
						>
							{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							{warningMessage && allowOverlap
								? "Forzar Agendamiento"
								: "Agendar Cita"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
