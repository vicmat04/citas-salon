"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";

import { rescheduleAppointment } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveAppointmentModal } from "./responsive-appointment-modal";

interface RescheduleService {
	id: string;
	name: string;
	price: number;
	durationMinutes: number;
}

interface RescheduleSpecialist {
	id: string;
	name: string;
}

interface RescheduleAppointmentDialogProps {
	slug: string;
	appointment: {
		id: string;
		appointmentDate: string;
		startTime: string;
		specialistId?: string;
		serviceIds: string[];
	};
	services: RescheduleService[];
	specialists: RescheduleSpecialist[];
	disabled?: boolean;
	onRescheduled: (notificationState: "queued" | undefined) => void;
}

export function RescheduleAppointmentDialog({
	slug,
	appointment,
	services,
	specialists,
	disabled,
	onRescheduled,
}: RescheduleAppointmentDialogProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [date, setDate] = useState(appointment.appointmentDate.slice(0, 10));
	const [startTime, setStartTime] = useState(appointment.startTime);
	const [specialistId, setSpecialistId] = useState(
		appointment.specialistId || specialists[0]?.id || "",
	);
	const [serviceIds, setServiceIds] = useState(appointment.serviceIds);
	const [allowOverlap, setAllowOverlap] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const formId = `reschedule-form-${appointment.id}`;

	function toggleService(serviceId: string) {
		setServiceIds((current) =>
			current.includes(serviceId)
				? current.filter((id) => id !== serviceId)
				: [...current, serviceId],
		);
	}

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		setMessage(null);
		const data = new FormData();
		data.set("date", date);
		data.set("startTime", startTime);
		data.set("specialistId", specialistId);
		data.set("serviceIds", serviceIds.join(","));
		data.set("allowOverlap", String(allowOverlap));
		const result = await rescheduleAppointment(appointment.id, data, slug);
		setPending(false);
		if (result.error) {
			setMessage(result.error);
			return;
		}
		if ("warning" in result && result.warning) {
			setMessage(result.message || "El horario requiere confirmación.");
			return;
		}
		onRescheduled(
			"notification" in result ? result.notification?.state : undefined,
		);
		setOpen(false);
	}

	return (
		<ResponsiveAppointmentModal
			open={open}
			onOpenChange={setOpen}
			title="Reprogramar cita"
			trigger={
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="min-h-11 gap-1 text-xs active:scale-[0.98]"
					disabled={disabled}
				>
					<CalendarClock className="h-4 w-4" /> Reprogramar
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
						className="min-h-11 active:scale-[0.98]"
						disabled={pending || serviceIds.length === 0 || !specialistId}
					>
						{pending && <Loader2 className="h-4 w-4 animate-spin" />}
						Guardar reprogramación
					</Button>
				</>
			}
		>
			<form id={formId} onSubmit={submit} className="space-y-4">
				{message && (
					<div role="alert" className="rounded-xl bg-amber-500/15 p-3 text-sm">
						{message}
					</div>
				)}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div>
						<Label>Especialista</Label>
						<div className="mt-1.5 flex flex-wrap gap-1.5">
							{specialists.length === 0 && (
								<span className="text-xs text-muted-foreground">
									Sin especialistas
								</span>
							)}
							{specialists.map((specialist) => (
								<button
									type="button"
									key={specialist.id}
									onClick={() => setSpecialistId(specialist.id)}
									className={`min-h-11 flex-1 rounded-lg border px-3 text-xs font-medium transition-all active:scale-[0.98] ${
										specialistId === specialist.id
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
						<Label htmlFor={`reschedule-date-${appointment.id}`}>Fecha</Label>
						<Input
							className="min-h-11"
							id={`reschedule-date-${appointment.id}`}
							type="date"
							value={date}
							onChange={(event) => setDate(event.target.value)}
							required
						/>
					</div>
					<div>
						<Label htmlFor={`reschedule-time-${appointment.id}`}>Hora</Label>
						<Input
							className="min-h-11"
							id={`reschedule-time-${appointment.id}`}
							type="time"
							value={startTime}
							onChange={(event) => setStartTime(event.target.value)}
							required
						/>
					</div>
				</div>
				<fieldset>
					<legend className="mb-2 text-sm font-medium">Servicios</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						{services.map((service) => {
							const isSelected = serviceIds.includes(service.id);
							return (
								<label
									key={service.id}
									className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm transition-transform active:scale-[0.98] ${
										isSelected
											? "border-primary bg-primary/10"
											: "bg-background"
									}`}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => toggleService(service.id)}
										className="size-5"
									/>
									{service.name} · ${service.price.toFixed(2)}
								</label>
							);
						})}
					</div>
				</fieldset>
				{message && (
					<label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm active:scale-[0.98]">
						<input
							type="checkbox"
							checked={allowOverlap}
							onChange={(event) => setAllowOverlap(event.target.checked)}
							className="size-5"
						/>
						Confirmo que deseo forzar este horario.
					</label>
				)}
			</form>
		</ResponsiveAppointmentModal>
	);
}
