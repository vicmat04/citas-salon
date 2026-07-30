"use client";

import {
	Calendar as CalendarIcon,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	Loader2,
	Scissors,
	User,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
	createPublicAppointment,
	getAvailableSlotsAction,
} from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const steps = ["Servicios", "Profesional", "Horario", "Tus datos"] as const;

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
	const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
	const [selectedSpecialistId, setSelectedSpecialistId] =
		useState<string>("any");
	const [selectedDate, setSelectedDate] = useState<string>(() => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().slice(0, 10);
	});
	const [availableSlots, setAvailableSlots] = useState<string[]>([]);
	const [isLoadingSlots, setIsLoadingSlots] = useState(false);
	const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
	const [customerName, setCustomerName] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [customerPhone, setCustomerPhone] = useState("");
	const [customerNotes, setCustomerNotes] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const selectedServices = services.filter((service) =>
		selectedServiceIds.includes(service.id),
	);
	const totalPrice = selectedServices.reduce(
		(sum, service) => sum + service.price,
		0,
	);
	const totalDuration = selectedServices.reduce(
		(sum, service) => sum + service.durationMinutes + service.bufferMinutes,
		0,
	);

	const dateMinStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
	const dateMaxStr = useMemo(() => {
		const maxDate = new Date();
		maxDate.setDate(maxDate.getDate() + bookingRangeDays);
		return maxDate.toISOString().slice(0, 10);
	}, [bookingRangeDays]);

	useEffect(() => {
		if (step !== 3 || selectedServiceIds.length === 0 || !selectedDate) {
			return;
		}

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
			.then((result) => {
				if (isMounted) {
					setAvailableSlots(result.slots ?? []);
					setIsLoadingSlots(false);
				}
			})
			.catch(() => {
				if (isMounted) {
					setAvailableSlots([]);
					setIsLoadingSlots(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [step, selectedDate, selectedSpecialistId, selectedServiceIds, slug]);

	function toggleService(serviceId: string) {
		setSelectedServiceIds((current) =>
			current.includes(serviceId)
				? current.filter((id) => id !== serviceId)
				: [...current, serviceId],
		);
	}

	function goBack() {
		if (step > 1) {
			setStep((step - 1) as 1 | 2 | 3);
		}
	}

	function goForward() {
		if (step < 4) {
			setStep((step + 1) as 2 | 3 | 4);
		}
	}

	async function handleSubmitBooking(event: FormEvent) {
		event.preventDefault();
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

	const continueDisabled =
		(step === 1 && selectedServiceIds.length === 0) ||
		(step === 3 && !selectedTimeSlot);

	return (
		<div className="flex h-dvh w-full flex-col overflow-hidden bg-muted/30">
			<header className="shrink-0 border-b bg-background/95 pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
				<div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="truncate text-lg font-bold capitalize">{salonName}</p>
						<p className="text-xs text-muted-foreground">
							Reserva en pocos pasos
						</p>
					</div>
					<p className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
						Paso {step} de 4
					</p>
				</div>
				<ol
					aria-label="Progreso de la reserva"
					className="mx-auto mt-3 grid max-w-3xl grid-cols-4 gap-1.5"
				>
					{steps.map((label, index) => {
						const number = index + 1;
						const isCurrent = step === number;
						const isComplete = step > number;
						return (
							<li key={label} className="min-w-0 text-center">
								<div
									aria-current={isCurrent ? "step" : undefined}
									className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
										isCurrent
											? "bg-primary text-primary-foreground"
											: isComplete
												? "bg-primary/15 text-primary"
												: "bg-muted text-muted-foreground"
									}`}
								>
									{isComplete ? <Check className="h-4 w-4" /> : number}
								</div>
								<span className="mt-1 hidden truncate text-[11px] text-muted-foreground min-[360px]:block">
									{label}
								</span>
							</li>
						);
					})}
				</ol>
			</header>

			<main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
				<div className="mx-auto max-w-3xl">
					{errorMessage && (
						<div
							role="alert"
							className="mb-4 rounded-xl bg-destructive/15 p-4 text-sm font-medium text-destructive"
						>
							{errorMessage}
						</div>
					)}

					{step === 1 && (
						<Card className="border-0 shadow-sm sm:border">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-xl">
									<Scissors className="h-5 w-5 text-primary" /> Elige tus
									servicios
								</CardTitle>
								<CardDescription>
									Puedes seleccionar uno o varios para la misma visita.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{services.length === 0 ? (
									<p className="py-8 text-center text-muted-foreground">
										No hay servicios disponibles.
									</p>
								) : (
									services.map((service) => {
										const isSelected = selectedServiceIds.includes(service.id);
										return (
											<button
												type="button"
												key={service.id}
												aria-pressed={isSelected}
												onClick={() => toggleService(service.id)}
												className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
													isSelected
														? "border-primary bg-primary/5 shadow-sm"
														: "bg-background hover:border-primary/40"
												}`}
											>
												<span className="min-w-0">
													<span className="flex items-center gap-2 font-semibold">
														<span className="truncate">{service.name}</span>
														{isSelected && (
															<CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
														)}
													</span>
													<span className="text-sm text-muted-foreground">
														{service.durationMinutes} min
													</span>
												</span>
												<span className="shrink-0 text-lg font-bold text-primary">
													${service.price.toFixed(2)}
												</span>
											</button>
										);
									})
								)}
							</CardContent>
						</Card>
					)}

					{step === 2 && (
						<Card className="border-0 shadow-sm sm:border">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-xl">
									<User className="h-5 w-5 text-primary" /> Elige profesional
								</CardTitle>
								<CardDescription>
									Selecciona a alguien o déjanos asignar la primera opción
									disponible.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{[
									{
										id: "any",
										name: "Cualquiera disponible",
										specialty: "La opción con disponibilidad más próxima",
									},
									...specialists,
								].map((specialist) => {
									const isSelected = selectedSpecialistId === specialist.id;
									return (
										<button
											type="button"
											key={specialist.id}
											aria-pressed={isSelected}
											onClick={() => setSelectedSpecialistId(specialist.id)}
											className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
												isSelected
													? "border-primary bg-primary/5 shadow-sm"
													: "bg-background hover:border-primary/40"
											}`}
										>
											<span className="min-w-0">
												<span className="block truncate font-semibold">
													{specialist.name}
												</span>
												{specialist.specialty && (
													<span className="block text-sm text-muted-foreground">
														{specialist.specialty}
													</span>
												)}
											</span>
											<span
												className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
													isSelected
														? "border-primary bg-primary text-primary-foreground"
														: "border-muted-foreground/40"
												}`}
											>
												{isSelected && <Check className="h-4 w-4" />}
											</span>
										</button>
									);
								})}
							</CardContent>
						</Card>
					)}

					{step === 3 && (
						<Card className="border-0 shadow-sm sm:border">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-xl">
									<CalendarIcon className="h-5 w-5 text-primary" /> Elige fecha
									y hora
								</CardTitle>
								<CardDescription>
									Los horarios se actualizan según el día y profesional
									elegidos.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div>
									<Label htmlFor="booking-date" className="font-semibold">
										Fecha
									</Label>
									<Input
										id="booking-date"
										type="date"
										value={selectedDate}
										min={dateMinStr}
										max={dateMaxStr}
										onChange={(event) => setSelectedDate(event.target.value)}
										className="mt-2 min-h-12 text-base"
										required
									/>
								</div>
								<div>
									<Label className="mb-3 flex items-center gap-2 font-semibold">
										<Clock className="h-4 w-4 text-primary" /> Horarios
										disponibles
									</Label>
									{isLoadingSlots ? (
										<div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
											<Loader2 className="h-5 w-5 animate-spin" /> Buscando
											horarios…
										</div>
									) : availableSlots.length === 0 ? (
										<p className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">
											No hay horarios para esta fecha. Prueba otro día o
											profesional.
										</p>
									) : (
										<div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:grid-cols-4">
											{availableSlots.map((time) => {
												const isSelected = selectedTimeSlot === time;
												return (
													<button
														type="button"
														key={time}
														aria-pressed={isSelected}
														onClick={() => setSelectedTimeSlot(time)}
														className={`min-h-12 rounded-xl border px-3 py-2 text-center text-base font-semibold transition active:scale-[0.98] ${
															isSelected
																? "border-primary bg-primary text-primary-foreground shadow-sm"
																: "bg-background hover:border-primary/50 hover:bg-accent"
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
						</Card>
					)}

					{step === 4 && (
						<Card className="border-0 shadow-sm sm:border">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-xl">
									<User className="h-5 w-5 text-primary" /> Completa tus datos
								</CardTitle>
								<CardDescription>
									Los usaremos para registrar y confirmar tu cita.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form
									id="booking-details-form"
									onSubmit={handleSubmitBooking}
									className="space-y-4"
								>
									<div className="rounded-2xl border bg-muted/40 p-4 text-sm">
										<p className="font-semibold">
											{selectedDate} · {selectedTimeSlot}
										</p>
										<p className="mt-1 text-muted-foreground">
											{selectedServices
												.map((service) => service.name)
												.join(", ")}
										</p>
									</div>
									<div>
										<Label htmlFor="cust-name">Nombre completo *</Label>
										<Input
											id="cust-name"
											value={customerName}
											onChange={(event) => setCustomerName(event.target.value)}
											placeholder="María Pérez"
											className="mt-1.5 min-h-12 text-base"
											required
										/>
									</div>
									<div>
										<Label htmlFor="cust-email">
											Correo electrónico (opcional)
										</Label>
										<Input
											id="cust-email"
											type="email"
											value={customerEmail}
											onChange={(event) => setCustomerEmail(event.target.value)}
											placeholder="maria@ejemplo.com"
											className="mt-1.5 min-h-12 text-base"
										/>
									</div>
									<div>
										<Label htmlFor="cust-phone">WhatsApp / Teléfono *</Label>
										<Input
											id="cust-phone"
											type="tel"
											value={customerPhone}
											onChange={(event) => setCustomerPhone(event.target.value)}
											placeholder="+507 6000 0000"
											className="mt-1.5 min-h-12 text-base"
											required
										/>
									</div>
									<div>
										<Label htmlFor="cust-notes">
											Notas adicionales (opcional)
										</Label>
										<Input
											id="cust-notes"
											value={customerNotes}
											onChange={(event) => setCustomerNotes(event.target.value)}
											placeholder="Preferencias o detalles"
											className="mt-1.5 min-h-12 text-base"
										/>
									</div>
								</form>
							</CardContent>
						</Card>
					)}
				</div>
			</main>

			<footer className="shrink-0 border-t bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
				<div className="mx-auto flex max-w-3xl items-center gap-3">
					<div className="min-w-0 flex-1">
						<p className="truncate text-xs text-muted-foreground">
							{selectedServiceIds.length === 0
								? "Selecciona tus servicios"
								: `${selectedServiceIds.length} ${
										selectedServiceIds.length === 1 ? "servicio" : "servicios"
									} · ${totalDuration} min`}
						</p>
						<p className="text-lg font-bold text-primary">
							${totalPrice.toFixed(2)}
						</p>
					</div>
					{step > 1 && (
						<Button
							type="button"
							variant="outline"
							onClick={goBack}
							className="min-h-11 min-w-11 px-3"
							aria-label="Volver al paso anterior"
						>
							<ChevronLeft className="h-5 w-5" />
							<span className="hidden sm:inline">Volver</span>
						</Button>
					)}
					<Button
						type={step === 4 ? "submit" : "button"}
						form={step === 4 ? "booking-details-form" : undefined}
						disabled={continueDisabled || isSubmitting}
						onClick={step < 4 ? goForward : undefined}
						className="min-h-11 min-w-32 gap-2 font-bold active:scale-[0.98]"
					>
						{isSubmitting ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : step === 4 ? (
							"Confirmar reserva"
						) : (
							<>
								Continuar <ChevronRight className="h-4 w-4" />
							</>
						)}
					</Button>
				</div>
			</footer>
		</div>
	);
}
