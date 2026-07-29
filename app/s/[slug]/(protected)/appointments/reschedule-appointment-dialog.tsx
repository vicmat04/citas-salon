"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";

import { rescheduleAppointment } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="min-h-11 gap-1 text-xs"
						disabled={disabled}
					/>
				}
			>
				<CalendarClock className="h-4 w-4" /> Reprogramar
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Reprogramar cita</DialogTitle>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					{message && (
						<div
							role="alert"
							className="rounded-md bg-amber-500/15 p-3 text-sm"
						>
							{message}
						</div>
					)}
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<div>
							<Label htmlFor={`reschedule-specialist-${appointment.id}`}>
								Especialista
							</Label>
							<select
								id={`reschedule-specialist-${appointment.id}`}
								className="min-h-11 w-full rounded-md border bg-background px-3"
								value={specialistId}
								onChange={(event) => setSpecialistId(event.target.value)}
							>
								{specialists.length === 0 && (
									<option value="">Sin especialistas disponibles</option>
								)}
								{specialists.map((specialist) => (
									<option key={specialist.id} value={specialist.id}>
										{specialist.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<Label htmlFor={`reschedule-date-${appointment.id}`}>Fecha</Label>
							<Input
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
							{services.map((service) => (
								<label
									key={service.id}
									className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
								>
									<input
										type="checkbox"
										checked={serviceIds.includes(service.id)}
										onChange={() => toggleService(service.id)}
									/>
									{service.name} · ${service.price.toFixed(2)}
								</label>
							))}
						</div>
					</fieldset>
					{message && (
						<label className="flex min-h-11 items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={allowOverlap}
								onChange={(event) => setAllowOverlap(event.target.checked)}
							/>
							Confirmo que deseo forzar este horario.
						</label>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={pending || serviceIds.length === 0 || !specialistId}
						>
							{pending && <Loader2 className="h-4 w-4 animate-spin" />}
							Guardar reprogramación
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
