"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
	Scissors,
	User,
	Calendar as CalendarIcon,
	Clock,
	CheckCircle2,
	ChevronRight,
	ChevronLeft,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardFooter,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	createPublicAppointment,
	getAvailableSlotsAction,
} from "@/app/actions/booking";

interface Service {
	id: string;
	name: string;
	price: number;
	durationMinutes: number;
	bufferMinutes: number;
}

interface Specialist {
	id: string;
	name: string;
	specialty: string | null;
}

export function BookingWizard({
	slug,
	salonName,
	bookingRangeDays,
	services,
	specialists,
}: {
	slug: string;
	salonName: string;
	bookingRangeDays: number;
	services: Service[];
	specialists: Specialist[];
}) {
	const router = useRouter();
	const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

	// Step 1: Selected Services
	const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

	// Step 2: Selected Specialist
	const [selectedSpecialistId, setSelectedSpecialistId] =
		useState<string>("any");

	// Step 3: Date & Time Slot
	const [selectedDate, setSelectedDate] = useState<string>(() => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().slice(0, 10);
	});
	const [availableSlots, setAvailableSlots] = useState<string[]>([]);
	const [isLoadingSlots, setIsLoadingSlots] = useState(false);
	const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");

	// Step 4: Customer Details
	const [customerName, setCustomerName] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [customerPhone, setCustomerPhone] = useState("");
	const [customerNotes, setCustomerNotes] = useState("");

	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Calculations for Step 1 & Date Bounds
	const selectedServices = services.filter((s) =>
		selectedServiceIds.includes(s.id),
	);
	const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
	const totalDuration = selectedServices.reduce(
		(sum, s) => sum + s.durationMinutes + s.bufferMinutes,
		0,
	);

	const dateMinStr = useMemo(() => {
		return new Date().toISOString().slice(0, 10);
	}, []);

	const dateMaxStr = useMemo(() => {
		const maxDate = new Date();
		maxDate.setDate(maxDate.getDate() + bookingRangeDays);
		return maxDate.toISOString().slice(0, 10);
	}, [bookingRangeDays]);

	// Fetch available slots when Step 3, date, or specialist changes
	useEffect(() => {
		if (step === 3 && selectedServiceIds.length > 0 && selectedDate) {
			let isMounted = true;

			Promise.resolve().then(() => {
				if (isMounted) {
					setIsLoadingSlots(true);
					setSelectedTimeSlot("");
				}
			});

			getAvailableSlotsAction(
				slug,
				selectedDate,
				selectedServiceIds,
				selectedSpecialistId,
			)
				.then((res) => {
					if (isMounted) {
						setIsLoadingSlots(false);
						if (res.slots) {
							setAvailableSlots(res.slots);
						}
					}
				})
				.catch(() => {
					if (isMounted) setIsLoadingSlots(false);
				});

			return () => {
				isMounted = false;
			};
		}
	}, [step, selectedDate, selectedSpecialistId, selectedServiceIds, slug]);

	function toggleService(serviceId: string) {
		setSelectedServiceIds((prev) =>
			prev.includes(serviceId)
				? prev.filter((id) => id !== serviceId)
				: [...prev, serviceId],
		);
	}

	async function handleSubmitBooking(e: React.FormEvent) {
		e.preventDefault();
		setIsSubmitting(true);
		setErrorMessage(null);

		const formData = new FormData();
		formData.set("customerName", customerName);
		formData.set("customerEmail", customerEmail);
		formData.set("customerPhone", customerPhone);
		formData.set("date", selectedDate);
		formData.set("startTime", selectedTimeSlot);
		formData.set("serviceIds", selectedServiceIds.join(","));
		formData.set("specialistId", selectedSpecialistId);
		formData.set("customerNotes", customerNotes);

		const result = await createPublicAppointment(formData, slug);
		setIsSubmitting(false);

		if (result.error) {
			setErrorMessage(result.error);
		} else if (result.appointmentId) {
			router.push(
				`/book/${slug}/confirmacion?appointmentId=${result.appointmentId}`,
			);
		}
	}

	return (
		<div className="min-h-dvh bg-muted/30 px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
			<div className="mx-auto max-w-2xl space-y-6">
				<div className="text-center mb-6">
					<h1 className="text-3xl font-extrabold capitalize">{salonName}</h1>
					<p className="text-muted-foreground mt-1">
						Reserva tu cita en pocos pasos
					</p>
				</div>

				{/* Step Indicator */}
				<div className="flex items-center justify-center gap-3 mb-6">
					{[1, 2, 3, 4].map((s) => (
						<div key={s} className="flex items-center gap-2">
							<Badge
								variant={
									step === s ? "default" : step > s ? "secondary" : "outline"
								}
								className="h-8 w-8 rounded-full flex items-center justify-center p-0 text-sm font-bold"
							>
								{step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
							</Badge>
							{s < 4 && <div className="h-0.5 w-6 sm:w-10 bg-border" />}
						</div>
					))}
				</div>

				{step > 1 && (
					<div
						aria-label="Resumen de la reserva"
						className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm"
					>
						<span className="min-w-0 font-medium">
							{selectedServices.map((service) => service.name).join(", ")}
						</span>
						<span className="shrink-0 font-bold text-primary">
							{totalDuration} min · ${totalPrice.toFixed(2)}
						</span>
					</div>
				)}

				{errorMessage && (
					<div
						role="alert"
						className="rounded-md bg-destructive/15 p-4 text-sm font-medium text-destructive"
					>
						{errorMessage}
					</div>
				)}

				{/* STEP 1: SERVICES */}
				{step === 1 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Scissors className="h-5 w-5 text-primary" /> Paso 1: Selecciona
								tus Servicios
							</CardTitle>
							<CardDescription>
								Puedes elegir uno o varios servicios para tu visita.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{services.length === 0 ? (
								<p className="text-center py-6 text-muted-foreground">
									No hay servicios disponibles.
								</p>
							) : (
								services.map((srv) => {
									const isSelected = selectedServiceIds.includes(srv.id);
									return (
										<button
											type="button"
											key={srv.id}
											aria-pressed={isSelected}
											onClick={() => toggleService(srv.id)}
											className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border p-4 text-left transition-all ${
												isSelected
													? "border-primary bg-primary/5 shadow-sm"
													: "hover:border-primary/50"
											}`}
										>
											<div>
												<h3 className="font-semibold flex items-center gap-2">
													{srv.name}
													{isSelected && (
														<CheckCircle2 className="h-4 w-4 text-primary" />
													)}
												</h3>
												<p className="text-sm text-muted-foreground">
													{srv.durationMinutes} min
												</p>
											</div>
											<div className="shrink-0 text-lg font-bold text-primary">
												${srv.price.toFixed(2)}
											</div>
										</button>
									);
								})
							)}
						</CardContent>
						<CardFooter className="flex flex-wrap justify-between gap-2 border-t pt-4">
							<div className="text-sm">
								<p className="font-medium text-muted-foreground">
									{selectedServiceIds.length}{" "}
									{selectedServiceIds.length === 1 ? "servicio" : "servicios"} •{" "}
									{totalDuration} min
								</p>
								<p className="text-lg font-bold text-primary">
									${totalPrice.toFixed(2)}
								</p>
							</div>
							<Button
								disabled={selectedServiceIds.length === 0}
								onClick={() => setStep(2)}
								className="min-h-11 gap-2 font-bold"
							>
								Continuar <ChevronRight className="h-4 w-4" />
							</Button>
						</CardFooter>
					</Card>
				)}

				{/* STEP 2: SPECIALIST */}
				{step === 2 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5 text-primary" /> Paso 2: Selecciona
								Especialista
							</CardTitle>
							<CardDescription>
								Elige tu profesional preferido o deja que asignemos al primero
								libre.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<button
								type="button"
								aria-pressed={selectedSpecialistId === "any"}
								onClick={() => setSelectedSpecialistId("any")}
								className={`min-h-11 w-full rounded-lg border p-4 text-left transition-all ${
									selectedSpecialistId === "any"
										? "border-primary bg-primary/5 shadow-sm"
										: "hover:border-primary/50"
								}`}
							>
								<div className="flex items-center justify-between">
									<div>
										<h3 className="font-semibold flex items-center gap-2">
											Cualquiera disponible
											{selectedSpecialistId === "any" && (
												<CheckCircle2 className="h-4 w-4 text-primary" />
											)}
										</h3>
										<p className="text-sm text-muted-foreground">
											Asigna al profesional con disponibilidad inmediata
										</p>
									</div>
								</div>
							</button>

							{specialists.map((spec) => {
								const isSelected = selectedSpecialistId === spec.id;
								return (
									<button
										type="button"
										key={spec.id}
										aria-pressed={isSelected}
										onClick={() => setSelectedSpecialistId(spec.id)}
										className={`min-h-11 w-full rounded-lg border p-4 text-left transition-all ${
											isSelected
												? "border-primary bg-primary/5 shadow-sm"
												: "hover:border-primary/50"
										}`}
									>
										<div className="flex items-center justify-between">
											<div>
												<h3 className="font-semibold flex items-center gap-2">
													{spec.name}
													{isSelected && (
														<CheckCircle2 className="h-4 w-4 text-primary" />
													)}
												</h3>
												{spec.specialty && (
													<p className="text-sm text-muted-foreground">
														{spec.specialty}
													</p>
												)}
											</div>
										</div>
									</button>
								);
							})}
						</CardContent>
						<CardFooter className="flex flex-wrap justify-between gap-2 border-t pt-4">
							<Button
								variant="outline"
								onClick={() => setStep(1)}
								className="min-h-11 gap-2"
							>
								<ChevronLeft className="h-4 w-4" /> Volver
							</Button>
							<Button
								onClick={() => setStep(3)}
								className="min-h-11 gap-2 font-bold"
							>
								Continuar <ChevronRight className="h-4 w-4" />
							</Button>
						</CardFooter>
					</Card>
				)}

				{/* STEP 3: DATE & TIME */}
				{step === 3 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CalendarIcon className="h-5 w-5 text-primary" /> Paso 3: Fecha
								y Horario
							</CardTitle>
							<CardDescription>
								Selecciona el día y la hora de tu cita.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div>
								<Label htmlFor="booking-date" className="font-bold text-sm">
									Fecha
								</Label>
								<Input
									id="booking-date"
									type="date"
									value={selectedDate}
									min={dateMinStr}
									max={dateMaxStr}
									onChange={(e) => setSelectedDate(e.target.value)}
									className="mt-1 min-h-11"
									required
								/>
							</div>

							<div>
								<Label className="font-bold text-sm flex items-center gap-2 mb-2">
									<Clock className="h-4 w-4 text-primary" /> Horarios
									Disponibles
								</Label>

								{isLoadingSlots ? (
									<div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
										<Loader2 className="h-5 w-5 animate-spin" /> Buscando turnos
										disponibles...
									</div>
								) : availableSlots.length === 0 ? (
									<p className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-md">
										No hay turnos disponibles para esta fecha. Intenta
										seleccionando otro día o profesional.
									</p>
								) : (
									<div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-1 min-[360px]:grid-cols-3 sm:grid-cols-4">
										{availableSlots.map((time) => {
											const isSelected = selectedTimeSlot === time;
											return (
												<button
													type="button"
													key={time}
													onClick={() => setSelectedTimeSlot(time)}
													className={`min-h-11 rounded-md border px-3 py-2 text-center text-sm font-semibold transition-all ${
														isSelected
															? "bg-primary text-primary-foreground border-primary shadow"
															: "bg-background hover:bg-accent text-foreground"
													}`}
												>
													{time}
												</button>
											);
										})}
									</div>
								)}
							</div>
						</CardContent>
						<CardFooter className="flex flex-wrap justify-between gap-2 border-t pt-4">
							<Button
								variant="outline"
								onClick={() => setStep(2)}
								className="min-h-11 gap-2"
							>
								<ChevronLeft className="h-4 w-4" /> Volver
							</Button>
							<Button
								disabled={!selectedTimeSlot}
								onClick={() => setStep(4)}
								className="min-h-11 gap-2 font-bold"
							>
								Continuar <ChevronRight className="h-4 w-4" />
							</Button>
						</CardFooter>
					</Card>
				)}

				{/* STEP 4: CUSTOMER DETAILS */}
				{step === 4 && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5 text-primary" /> Paso 4: Tus Datos de
								Contacto
							</CardTitle>
							<CardDescription>
								Ingresa tus datos para registrar y confirmar tu cita.
							</CardDescription>
						</CardHeader>
						<form onSubmit={handleSubmitBooking}>
							<CardContent className="space-y-4">
								<div className="bg-muted/40 p-4 rounded-md space-y-1 text-sm border">
									<p>
										<span className="font-bold">Fecha y Hora:</span>{" "}
										{selectedDate} a las {selectedTimeSlot}
									</p>
									<p>
										<span className="font-bold">Servicios:</span>{" "}
										{selectedServices.map((s) => s.name).join(", ")} (
										{totalDuration} min)
									</p>
									<p>
										<span className="font-bold">Total a pagar:</span>{" "}
										<span className="text-primary font-bold">
											${totalPrice.toFixed(2)}
										</span>
									</p>
								</div>

								<div>
									<Label htmlFor="cust-name">Nombre Completo *</Label>
									<Input
										className="min-h-11"
										id="cust-name"
										value={customerName}
										onChange={(e) => setCustomerName(e.target.value)}
										placeholder="ej: María Pérez"
										required
									/>
								</div>

								<div>
									<Label htmlFor="cust-email">
										Correo Electrónico (opcional)
									</Label>
									<Input
										className="min-h-11"
										id="cust-email"
										type="email"
										value={customerEmail}
										onChange={(e) => setCustomerEmail(e.target.value)}
										placeholder="maria@ejemplo.com"
									/>
								</div>

								<div>
									<Label htmlFor="cust-phone">WhatsApp / Teléfono *</Label>
									<Input
										className="min-h-11"
										id="cust-phone"
										type="tel"
										value={customerPhone}
										onChange={(e) => setCustomerPhone(e.target.value)}
										placeholder="+507 6000 0000"
										required
									/>
								</div>

								<div>
									<Label htmlFor="cust-notes">
										Notas adicionales (opcional)
									</Label>
									<Input
										className="min-h-11"
										id="cust-notes"
										value={customerNotes}
										onChange={(e) => setCustomerNotes(e.target.value)}
										placeholder="ej: Alguna preferencia o detalle..."
									/>
								</div>
							</CardContent>
							<CardFooter className="flex flex-wrap justify-between gap-2 border-t pt-4 max-[359px]:flex-col">
								<Button
									type="button"
									variant="outline"
									onClick={() => setStep(3)}
									className="min-h-11 gap-2"
								>
									<ChevronLeft className="h-4 w-4" /> Volver
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting}
									className="min-h-11 gap-2 font-bold"
								>
									{isSubmitting ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										"Confirmar Reserva"
									)}
								</Button>
							</CardFooter>
						</form>
					</Card>
				)}
			</div>
		</div>
	);
}
