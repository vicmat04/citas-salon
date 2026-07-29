"use client";

import { useState } from "react";
import {
	Calendar,
	Clock,
	User,
	Scissors,
	CheckCircle,
	XCircle,
	AlertCircle,
	RefreshCw,
	MessageSquare,
	FileText,
	Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateManualAppointmentDialog } from "./create-manual-appointment-dialog";
import { RescheduleAppointmentDialog } from "./reschedule-appointment-dialog";
import { updateAppointmentStatus } from "@/app/actions/appointments";

interface Customer {
	id: string;
	fullName: string;
	phone: string;
	email: string | null;
}

interface Specialist {
	id: string;
	name: string;
}

interface Service {
	id: string;
	name: string;
	price: number;
	durationMinutes: number;
}

interface AppointmentServiceItem {
	service: {
		id: string;
		name: string;
	} | null;
	priceSnapshot: number | { toNumber(): number };
	durationSnapshot: number;
}

interface NotificationDelivery {
	roles: Array<"client" | "owner" | "specialist">;
	status: "pending" | "sending" | "sent" | "skipped" | "failed";
	resultCode: string | null;
	recipientMasked: string | null;
	occurredAt: string;
}

interface NotificationEvent {
	type: "created" | "cancelled" | "rescheduled" | "reminder_24h";
	createdAt: string;
	deliveries: NotificationDelivery[];
}

interface Appointment {
	id: string;
	appointmentDate: string;
	startTime: string;
	endTime: string;
	status: string;
	source: string;
	customerNotes: string | null;
	internalNotes: string | null;
	totalPriceSnapshot: number | { toNumber(): number };
	totalDurationMinutes: number;
	customer: Customer | null;
	specialist: Specialist | null;
	appointmentServices: AppointmentServiceItem[];
	notifications: NotificationEvent[];
}

const roleLabels = {
	client: "Cliente",
	owner: "Dueño",
	specialist: "Especialista",
};
const eventLabels = {
	created: "Creación",
	cancelled: "Cancelación",
	rescheduled: "Reprogramación",
	reminder_24h: "Recordatorio",
};
const resultLabels: Record<string, string> = {
	missing_email: "correo ausente",
	invalid_email: "correo inválido",
	owner_disabled: "preferencia desactivada",
	duplicate_merged: "destinatario unificado",
	provider_rejected: "proveedor rechazó el envío",
	oauth_failed: "configuración de correo no disponible",
	network_error: "error de red",
	appointment_rescheduled: "cita reprogramada",
	appointment_ineligible: "cita ya no vigente",
	unknown_after_send: "resultado del proveedor no confirmado",
};

function NotificationDetails({ events }: { events: NotificationEvent[] }) {
	const deliveries = events.flatMap((event) => event.deliveries);
	const counts = deliveries.reduce(
		(summary, delivery) => {
			const state =
				delivery.status === "pending" || delivery.status === "sending"
					? "processing"
					: delivery.status;
			summary[state] += 1;
			return summary;
		},
		{ sent: 0, skipped: 0, failed: 0, processing: 0 } as Record<string, number>,
	);
	const summary = [
		counts.sent && `${counts.sent} enviadas`,
		counts.skipped && `${counts.skipped} omitidas`,
		counts.failed && `${counts.failed} fallidas`,
		counts.processing && `${counts.processing} procesando`,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<details className="rounded border bg-muted/20 px-2 text-xs">
			<summary className="flex min-h-11 cursor-pointer items-center font-medium">
				Correo: {summary}
			</summary>
			<ul className="mt-2 space-y-2">
				{events.flatMap((event) =>
					event.deliveries.map((delivery, index) => (
						<li
							key={`${event.createdAt}-${index}`}
							className="text-muted-foreground"
						>
							<span className="font-medium text-foreground">
								{eventLabels[event.type]} ·{" "}
								{delivery.roles.map((role) => roleLabels[role]).join("/")}
							</span>{" "}
							—{" "}
							{delivery.status === "sent"
								? "enviada"
								: delivery.status === "skipped"
									? "omitida"
									: delivery.status === "failed"
										? "fallida"
										: "procesando"}
							{delivery.recipientMasked ? ` · ${delivery.recipientMasked}` : ""}
							{delivery.resultCode
								? ` · ${resultLabels[delivery.resultCode] || "resultado no disponible"}`
								: ""}
							{" · "}
							{new Date(delivery.occurredAt).toLocaleString("es-PA")}
						</li>
					)),
				)}
			</ul>
		</details>
	);
}

export function AppointmentsView({
	slug,
	appointments,
	specialists,
	services,
}: {
	slug: string;
	appointments: Appointment[];
	specialists: Specialist[];
	services: Service[];
}) {
	const [selectedTab, setSelectedTab] = useState<"today" | "upcoming" | "all">(
		"today",
	);
	const [filterSpecialistId, setFilterSpecialistId] = useState<string>("all");
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [isPending, setIsPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

	// Dialog states for status changes & notes
	const [activeAppointment, setActiveAppointment] =
		useState<Appointment | null>(null);
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
	const [cancellationReason, setCancellationReason] = useState("");

	const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
	const [internalNotesText, setInternalNotesText] = useState("");

	const todayStr = new Date().toISOString().slice(0, 10);

	// Status helper badges
	function getStatusBadge(status: string) {
		switch (status) {
			case "confirmed":
				return (
					<Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
						Confirmada
					</Badge>
				);
			case "completed":
				return (
					<Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
						Atendida
					</Badge>
				);
			case "cancelled":
				return (
					<Badge variant="destructive" className="font-semibold">
						Cancelada
					</Badge>
				);
			case "no_show":
				return (
					<Badge className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
						No Asistió
					</Badge>
				);
			case "pending":
				return (
					<Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold">
						Pendiente
					</Badge>
				);
			default:
				return <Badge variant="secondary">{status}</Badge>;
		}
	}

	async function handleStatusChange(
		apptId: string,
		newStatus: string,
		reason?: string,
	) {
		setIsPending(true);
		setErrorMessage(null);
		setFeedbackMessage(null);

		const result = await updateAppointmentStatus(
			apptId,
			newStatus,
			undefined,
			reason,
			slug,
		);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setIsCancelDialogOpen(false);
			setCancellationReason("");
			setFeedbackMessage(
				"notification" in result && result.notification?.state === "queued"
					? "Cita actualizada. Notificación en proceso."
					: "Cita actualizada.",
			);
		}
	}

	function openCancelDialog(appt: Appointment) {
		setActiveAppointment(appt);
		setCancellationReason("");
		setIsCancelDialogOpen(true);
	}

	function openNotesDialog(appt: Appointment) {
		setActiveAppointment(appt);
		setInternalNotesText(appt.internalNotes || "");
		setIsNotesDialogOpen(true);
	}

	async function handleSaveNotes() {
		if (!activeAppointment) return;
		setIsPending(true);

		const result = await updateAppointmentStatus(
			activeAppointment.id,
			activeAppointment.status,
			internalNotesText,
			undefined,
			slug,
		);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setIsNotesDialogOpen(false);
		}
	}

	// Filter appointments according to selected tab and dropdowns
	const filteredAppointments = appointments.filter((appt) => {
		const apptDateStr = appt.appointmentDate.slice(0, 10);

		// Tab filter
		if (selectedTab === "today" && apptDateStr !== todayStr) return false;
		if (
			selectedTab === "upcoming" &&
			(apptDateStr <= todayStr || appt.status === "cancelled")
		)
			return false;

		// Specialist dropdown filter
		if (
			filterSpecialistId !== "all" &&
			appt.specialist?.id !== filterSpecialistId
		)
			return false;

		// Status dropdown filter
		if (filterStatus !== "all" && appt.status !== filterStatus) return false;

		return true;
	});

	return (
		<div className="min-w-0 space-y-6">
			{feedbackMessage && (
				<div
					role="status"
					className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800"
				>
					{feedbackMessage}
				</div>
			)}
			{errorMessage && (
				<div className="flex items-center justify-between gap-3 rounded-md bg-destructive/15 p-4 text-sm font-medium text-destructive">
					<span className="min-w-0">{errorMessage}</span>
					<button
						type="button"
						onClick={() => setErrorMessage(null)}
						className="min-h-11 shrink-0 px-2 text-xs underline"
					>
						Cerrar
					</button>
				</div>
			)}

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Agenda de Citas</h2>
					<p className="text-muted-foreground">
						Controla la atención de tus clientes y agenda citas presenciales o
						por teléfono.
					</p>
				</div>
				<div className="[&_[data-slot=button]]:min-h-11">
					<CreateManualAppointmentDialog
						slug={slug}
						services={services}
						specialists={specialists}
						onCreated={(notificationState: "queued" | undefined) =>
							setFeedbackMessage(
								notificationState === "queued"
									? "Cita actualizada. Notificación en proceso."
									: "Cita actualizada.",
							)
						}
					/>
				</div>
			</div>

			{/* Navigation Tabs */}
			<Tabs
				defaultValue="today"
				onValueChange={(v) => setSelectedTab(v as "today" | "upcoming" | "all")}
				className="w-full"
			>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
					<TabsList className="grid h-auto min-h-11 w-full grid-cols-3 sm:w-auto">
						<TabsTrigger
							value="today"
							className="min-h-11 whitespace-normal text-xs font-bold"
						>
							Citas de Hoy
						</TabsTrigger>
						<TabsTrigger
							value="upcoming"
							className="min-h-11 whitespace-normal text-xs font-bold"
						>
							Próximas Citas
						</TabsTrigger>
						<TabsTrigger
							value="all"
							className="min-h-11 whitespace-normal text-xs font-bold"
						>
							Todas
						</TabsTrigger>
					</TabsList>

					{/* Filter dropdowns */}
					<div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 min-[390px]:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
						<Filter className="h-4 w-4 shrink-0 text-muted-foreground" />

						<select
							aria-label="Filtrar por especialista"
							className="min-h-11 min-w-0 rounded-md border border-input bg-background px-2 text-xs font-medium"
							value={filterSpecialistId}
							onChange={(e) => setFilterSpecialistId(e.target.value)}
						>
							<option value="all">Todos los Especialistas</option>
							{specialists.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>

						<select
							aria-label="Filtrar por estado"
							className="col-start-2 min-h-11 min-w-0 rounded-md border border-input bg-background px-2 text-xs font-medium min-[390px]:col-start-auto"
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
						>
							<option value="all">Todos los Estados</option>
							<option value="confirmed">Confirmadas</option>
							<option value="completed">Atendidas</option>
							<option value="cancelled">Canceladas</option>
							<option value="no_show">No Asistió</option>
							<option value="pending">Pendientes</option>
						</select>
					</div>
				</div>

				<TabsContent value={selectedTab} className="mt-6">
					{filteredAppointments.length === 0 ? (
						<Card className="p-8 text-center sm:p-12">
							<p className="text-muted-foreground font-medium">
								No se encontraron citas para el filtro seleccionado.
							</p>
						</Card>
					) : (
						<div className="grid gap-4">
							{filteredAppointments.map((appt) => {
								const totalPriceNum =
									typeof appt.totalPriceSnapshot === "object" &&
									"toNumber" in appt.totalPriceSnapshot
										? appt.totalPriceSnapshot.toNumber()
										: Number(appt.totalPriceSnapshot);

								const serviceNames =
									appt.appointmentServices
										.map((as) => as.service?.name)
										.filter(Boolean)
										.join(", ") || "Servicio";

								const customerName = appt.customer?.fullName || "Cliente";
								const customerPhone = appt.customer?.phone || "";
								const specialistName = appt.specialist?.name || "Cualquiera";
								const apptDateStr = appt.appointmentDate.slice(0, 10);

								const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
								const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${customerName}, te escribimos de parte del salón respecto a tu cita del ${apptDateStr} a las ${appt.startTime}.`)}`;

								return (
									<Card
										key={appt.id}
										className="overflow-hidden border-border/70 hover:border-primary/50 transition-colors"
									>
										<CardContent className="flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-5 md:flex-row md:items-center">
											{/* Left info: Customer & Status */}
											<div className="min-w-0 space-y-2">
												<div className="flex flex-wrap items-center gap-2">
													<h3 className="font-bold text-lg">{customerName}</h3>
													{getStatusBadge(appt.status)}
													{appt.source === "owner_panel" && (
														<Badge variant="outline" className="text-[10px]">
															Manual
														</Badge>
													)}
												</div>

												<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
													<div className="flex items-center gap-1">
														<User className="h-3.5 w-3.5 text-primary" />
														<span>{specialistName}</span>
													</div>
													<div className="flex items-center gap-1">
														<Scissors className="h-3.5 w-3.5 text-primary" />
														<span className="min-w-0 break-words">
															{serviceNames} ({appt.totalDurationMinutes} min)
														</span>
													</div>
												</div>

												{appt.customerNotes && (
													<p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
														Nota cliente: {appt.customerNotes}
													</p>
												)}
												{appt.internalNotes && (
													<p className="text-xs text-amber-900 bg-amber-500/10 p-2 rounded border border-amber-500/20 font-medium">
														Nota interna: {appt.internalNotes}
													</p>
												)}
												{appt.notifications.length > 0 && (
													<NotificationDetails events={appt.notifications} />
												)}
											</div>

											{/* Right info: Date, Price & Actions */}
											<div className="flex flex-col md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0">
												<div className="text-left md:text-right">
													<p className="font-bold text-base flex items-center md:justify-end gap-1.5">
														<Calendar className="h-4 w-4 text-primary" />{" "}
														{apptDateStr}
														<Clock className="h-4 w-4 text-primary ml-2" />{" "}
														{appt.startTime}
													</p>
													<p className="text-xl font-extrabold text-primary mt-0.5">
														${totalPriceNum.toFixed(2)}
													</p>
												</div>

												{/* Quick Actions Buttons */}
												<div className="flex flex-wrap items-center gap-1.5 pt-1">
													{customerPhone && (
														<button
															type="button"
															onClick={() =>
																window.open(
																	waUrl,
																	"_blank",
																	"noopener,noreferrer",
																)
															}
															className="min-h-11 px-3 text-xs gap-1 rounded-md border flex items-center justify-center font-medium bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-[#25D366]/30 transition-colors"
														>
															<MessageSquare className="h-3.5 w-3.5" /> WhatsApp
														</button>
													)}

													{(appt.status === "pending" ||
														appt.status === "confirmed") && (
														<RescheduleAppointmentDialog
															slug={slug}
															appointment={{
																id: appt.id,
																appointmentDate: appt.appointmentDate,
																startTime: appt.startTime,
																specialistId: appt.specialist?.id,
																serviceIds: appt.appointmentServices
																	.map((item) => item.service?.id)
																	.filter((id): id is string => Boolean(id)),
															}}
															services={services}
															specialists={specialists}
															disabled={isPending}
															onRescheduled={(notificationState) =>
																setFeedbackMessage(
																	notificationState === "queued"
																		? "Cita actualizada. Notificación en proceso."
																		: "Cita actualizada.",
																)
															}
														/>
													)}

													{appt.status !== "completed" && (
														<Button
															size="sm"
															variant="outline"
															className="min-h-11 text-xs gap-1 text-blue-600 hover:text-blue-700"
															onClick={() =>
																handleStatusChange(appt.id, "completed")
															}
															disabled={isPending}
															title="Marcar como Atendida"
														>
															<CheckCircle className="h-3.5 w-3.5" /> Atendida
														</Button>
													)}

													{appt.status !== "no_show" && (
														<Button
															size="sm"
															variant="outline"
															className="min-h-11 text-xs gap-1 text-amber-600 hover:text-amber-700"
															onClick={() =>
																handleStatusChange(appt.id, "no_show")
															}
															disabled={isPending}
															title="Marcar como No Asistió"
														>
															<AlertCircle className="h-3.5 w-3.5" /> No Asistió
														</Button>
													)}

													{appt.status !== "cancelled" && (
														<Button
															size="sm"
															variant="outline"
															className="min-h-11 text-xs gap-1 text-destructive hover:text-destructive"
															onClick={() => openCancelDialog(appt)}
															disabled={isPending}
															title="Cancelar cita"
														>
															<XCircle className="h-3.5 w-3.5" /> Cancelar
														</Button>
													)}

													{appt.status === "cancelled" && (
														<Button
															size="sm"
															variant="outline"
															className="min-h-11 text-xs gap-1 text-emerald-600"
															onClick={() =>
																handleStatusChange(appt.id, "confirmed")
															}
															disabled={isPending}
															title="Reabrir Cita"
														>
															<RefreshCw className="h-3.5 w-3.5" /> Reabrir
														</Button>
													)}

													<Button
														size="sm"
														variant="ghost"
														className="min-h-11 min-w-11 text-xs gap-1 text-muted-foreground"
														onClick={() => openNotesDialog(appt)}
														title="Editar notas internas"
													>
														<FileText className="h-3.5 w-3.5" />
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Cancellation Dialog */}
			<Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
				<DialogContent className="max-h-[90dvh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Cancelar Cita</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							La cita quedará cancelada y su horario se liberará para recibir
							nuevas reservas.
						</p>
						<div>
							<Label htmlFor="cancel-reason">
								Motivo de Cancelación (opcional)
							</Label>
							<Input
								className="min-h-11"
								id="cancel-reason"
								value={cancellationReason}
								onChange={(e) => setCancellationReason(e.target.value)}
								placeholder="ej: Cliente solicitó cambio por teléfono..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							className="min-h-11"
							onClick={() => setIsCancelDialogOpen(false)}
						>
							Volver
						</Button>
						<Button
							variant="destructive"
							className="min-h-11"
							disabled={isPending}
							onClick={() =>
								activeAppointment &&
								handleStatusChange(
									activeAppointment.id,
									"cancelled",
									cancellationReason,
								)
							}
						>
							Confirmar Cancelación
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Notes Dialog */}
			<Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
				<DialogContent className="max-h-[90dvh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Notas Internas de la Cita</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-xs text-muted-foreground">
							Estas notas son privadas y solo visibles para el personal del
							salón.
						</p>
						<div>
							<Label htmlFor="notes-input">Observaciones</Label>
							<Input
								className="min-h-11"
								id="notes-input"
								value={internalNotesText}
								onChange={(e) => setInternalNotesText(e.target.value)}
								placeholder="Escribe detalles sobre el cliente o el servicio..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							className="min-h-11"
							onClick={() => setIsNotesDialogOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							className="min-h-11"
							disabled={isPending}
							onClick={handleSaveNotes}
						>
							Guardar Notas
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
