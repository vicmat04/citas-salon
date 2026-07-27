"use client";

import { useState } from "react";
import { Clock, Calendar, ShieldAlert, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	addBlockedDate,
	addBlockedSlot,
	deleteBlockedDate,
	deleteBlockedSlot,
	updateBusinessHours,
	updateSpecialistHours,
} from "@/app/actions/schedules";

const DAYS_OF_WEEK = [
	{ day: 1, name: "Lunes" },
	{ day: 2, name: "Martes" },
	{ day: 3, name: "Miércoles" },
	{ day: 4, name: "Jueves" },
	{ day: 5, name: "Viernes" },
	{ day: 6, name: "Sábado" },
	{ day: 0, name: "Domingo" },
];

interface BusinessHour {
	dayOfWeek: number;
	openTime: string;
	closeTime: string;
	isOpen: boolean;
}

interface SpecialistHour {
	specialistId: string;
	dayOfWeek: number;
	openTime: string;
	closeTime: string;
	isAvailable: boolean;
}

interface Specialist {
	id: string;
	name: string;
}

interface BlockedDate {
	id: string;
	date: string;
	reason: string | null;
	specialistId: string | null;
}

interface BlockedSlot {
	id: string;
	date: string;
	startTime: string;
	endTime: string;
	reason: string | null;
	specialistId: string | null;
}

export function SchedulesView({
	slug,
	businessHours,
	specialistHours,
	specialists,
	blockedDates,
	blockedSlots,
}: {
	slug: string;
	businessHours: BusinessHour[];
	specialistHours: SpecialistHour[];
	specialists: Specialist[];
	blockedDates: BlockedDate[];
	blockedSlots: BlockedSlot[];
}) {
	const [isPending, setIsPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Salon Business Hours State
	const [salonHoursState, setSalonHoursState] = useState<BusinessHour[]>(() => {
		return DAYS_OF_WEEK.map(({ day }) => {
			const found = businessHours.find((bh) => bh.dayOfWeek === day);
			return (
				found || {
					dayOfWeek: day,
					openTime: "09:00",
					closeTime: "18:00",
					isOpen: day !== 0, // open Mon-Sat by default
				}
			);
		});
	});

	// Specialist Hours State
	const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>(
		specialists[0]?.id || "",
	);
	const [specHoursState, setSpecHoursState] = useState<SpecialistHour[]>(() => {
		return DAYS_OF_WEEK.map(({ day }) => {
			const found = specialistHours.find(
				(sh) =>
					sh.specialistId === selectedSpecialistId && sh.dayOfWeek === day,
			);
			return (
				found || {
					specialistId: selectedSpecialistId,
					dayOfWeek: day,
					openTime: "09:00",
					closeTime: "18:00",
					isAvailable: true,
				}
			);
		});
	});

	// Block forms
	const [blockDateValue, setBlockDateValue] = useState("");
	const [blockDateReason, setBlockDateReason] = useState("");
	const [blockDateSpec, setBlockDateSpec] = useState("");

	const [blockSlotDate, setBlockSlotDate] = useState("");
	const [blockSlotStart, setBlockSlotStart] = useState("13:00");
	const [blockSlotEnd, setBlockSlotEnd] = useState("14:00");
	const [blockSlotReason, setBlockSlotReason] = useState("");
	const [blockSlotSpec, setBlockSlotSpec] = useState("");

	function handleSalonHourChange(
		day: number,
		field: keyof BusinessHour,
		value: string | boolean,
	) {
		setSalonHoursState((prev) =>
			prev.map((item) =>
				item.dayOfWeek === day ? { ...item, [field]: value } : item,
			),
		);
	}

	async function handleSaveSalonHours(e: React.FormEvent) {
		e.preventDefault();
		setIsPending(true);
		setErrorMessage(null);
		setSuccessMessage(null);

		const result = await updateBusinessHours(salonHoursState, slug);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setSuccessMessage("Horarios del salón actualizados exitosamente.");
		}
	}

	function handleSpecSelect(specId: string) {
		setSelectedSpecialistId(specId);
		setSpecHoursState(
			DAYS_OF_WEEK.map(({ day }) => {
				const found = specialistHours.find(
					(sh) => sh.specialistId === specId && sh.dayOfWeek === day,
				);
				return (
					found || {
						specialistId: specId,
						dayOfWeek: day,
						openTime: "09:00",
						closeTime: "18:00",
						isAvailable: true,
					}
				);
			}),
		);
	}

	function handleSpecHourChange(
		day: number,
		field: keyof SpecialistHour,
		value: string | boolean,
	) {
		setSpecHoursState((prev) =>
			prev.map((item) =>
				item.dayOfWeek === day ? { ...item, [field]: value } : item,
			),
		);
	}

	async function handleSaveSpecHours(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedSpecialistId) return;
		setIsPending(true);
		setErrorMessage(null);
		setSuccessMessage(null);

		const result = await updateSpecialistHours(
			selectedSpecialistId,
			specHoursState,
			slug,
		);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setSuccessMessage("Horarios del especialista actualizados exitosamente.");
		}
	}

	async function handleAddBlockedDate(e: React.FormEvent) {
		e.preventDefault();
		setIsPending(true);
		setErrorMessage(null);

		const formData = new FormData();
		formData.set("date", blockDateValue);
		formData.set("reason", blockDateReason);
		formData.set("specialistId", blockDateSpec);

		const result = await addBlockedDate(formData, slug);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setBlockDateValue("");
			setBlockDateReason("");
			setBlockDateSpec("");
		}
	}

	async function handleDeleteBlockedDate(id: string) {
		setIsPending(true);
		await deleteBlockedDate(id, slug);
		setIsPending(false);
	}

	async function handleAddBlockedSlot(e: React.FormEvent) {
		e.preventDefault();
		setIsPending(true);
		setErrorMessage(null);

		const formData = new FormData();
		formData.set("date", blockSlotDate);
		formData.set("startTime", blockSlotStart);
		formData.set("endTime", blockSlotEnd);
		formData.set("reason", blockSlotReason);
		formData.set("specialistId", blockSlotSpec);

		const result = await addBlockedSlot(formData, slug);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setBlockSlotDate("");
			setBlockSlotReason("");
			setBlockSlotSpec("");
		}
	}

	async function handleDeleteBlockedSlot(id: string) {
		setIsPending(true);
		await deleteBlockedSlot(id, slug);
		setIsPending(false);
	}

	return (
		<div className="space-y-6">
			{errorMessage && (
				<div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive font-medium">
					{errorMessage}
				</div>
			)}
			{successMessage && (
				<div className="rounded-md bg-emerald-500/15 p-4 text-sm text-emerald-700 font-medium">
					{successMessage}
				</div>
			)}

			<div>
				<h2 className="text-2xl font-bold tracking-tight">
					Horarios y Disponibilidad
				</h2>
				<p className="text-muted-foreground">
					Configura los horarios de atención del salón, los turnos del personal
					y los bloqueos por festivos o compromisos.
				</p>
			</div>

			<Tabs defaultValue="salon" className="w-full">
				<TabsList className="grid w-full grid-cols-3 max-w-md">
					<TabsTrigger value="salon" className="gap-2">
						<Clock className="h-4 w-4" />
						Salón
					</TabsTrigger>
					<TabsTrigger value="specialists" className="gap-2">
						<Calendar className="h-4 w-4" />
						Especialistas
					</TabsTrigger>
					<TabsTrigger value="blocks" className="gap-2">
						<ShieldAlert className="h-4 w-4" />
						Bloqueos
					</TabsTrigger>
				</TabsList>

				{/* TAB 1: SALON BUSINESS HOURS */}
				<TabsContent value="salon" className="mt-6 space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Horarios Generales del Salón</CardTitle>
							<CardDescription>
								Define los días y horas en que el negocio se encuentra abierto
								para recibir reservas.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSaveSalonHours} className="space-y-4">
								<div className="divide-y border rounded-md p-4 space-y-3">
									{DAYS_OF_WEEK.map(({ day, name }) => {
										const hourConfig = salonHoursState.find(
											(h) => h.dayOfWeek === day,
										)!;
										return (
											<div
												key={day}
												className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0"
											>
												<div className="flex items-center gap-3 w-36">
													<input
														type="checkbox"
														id={`salon-day-${day}`}
														checked={hourConfig.isOpen}
														onChange={(e) =>
															handleSalonHourChange(
																day,
																"isOpen",
																e.target.checked,
															)
														}
														className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
													/>
													<Label
														htmlFor={`salon-day-${day}`}
														className="font-semibold text-sm cursor-pointer"
													>
														{name}
													</Label>
												</div>

												{hourConfig.isOpen ? (
													<div className="flex items-center gap-2">
														<Input
															type="time"
															value={hourConfig.openTime}
															onChange={(e) =>
																handleSalonHourChange(
																	day,
																	"openTime",
																	e.target.value,
																)
															}
															className="w-32 text-center"
															required
														/>
														<span className="text-sm text-muted-foreground">
															a
														</span>
														<Input
															type="time"
															value={hourConfig.closeTime}
															onChange={(e) =>
																handleSalonHourChange(
																	day,
																	"closeTime",
																	e.target.value,
																)
															}
															className="w-32 text-center"
															required
														/>
													</div>
												) : (
													<span className="text-sm text-muted-foreground italic">
														Cerrado
													</span>
												)}
											</div>
										);
									})}
								</div>

								<div className="flex justify-end pt-2">
									<Button type="submit" disabled={isPending}>
										Guardar Horarios del Salón
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</TabsContent>

				{/* TAB 2: SPECIALIST HOURS */}
				<TabsContent value="specialists" className="mt-6 space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Horarios por Especialista</CardTitle>
							<CardDescription>
								Si un especialista no tiene horario personalizado, heredará
								automáticamente los horarios del salón.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{specialists.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-6">
									No hay especialistas registrados en este salón.
								</p>
							) : (
								<>
									<div className="w-full max-w-xs">
										<Label htmlFor="spec-select">Selecciona Especialista</Label>
										<select
											id="spec-select"
											className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
											value={selectedSpecialistId}
											onChange={(e) => handleSpecSelect(e.target.value)}
										>
											{specialists.map((s) => (
												<option key={s.id} value={s.id}>
													{s.name}
												</option>
											))}
										</select>
									</div>

									<form
										onSubmit={handleSaveSpecHours}
										className="space-y-4 pt-2"
									>
										<div className="divide-y border rounded-md p-4 space-y-3">
											{DAYS_OF_WEEK.map(({ day, name }) => {
												const hourConfig = specHoursState.find(
													(h) => h.dayOfWeek === day,
												)!;
												return (
													<div
														key={day}
														className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0"
													>
														<div className="flex items-center gap-3 w-36">
															<input
																type="checkbox"
																id={`spec-day-${day}`}
																checked={hourConfig.isAvailable}
																onChange={(e) =>
																	handleSpecHourChange(
																		day,
																		"isAvailable",
																		e.target.checked,
																	)
																}
																className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
															/>
															<Label
																htmlFor={`spec-day-${day}`}
																className="font-semibold text-sm cursor-pointer"
															>
																{name}
															</Label>
														</div>

														{hourConfig.isAvailable ? (
															<div className="flex items-center gap-2">
																<Input
																	type="time"
																	value={hourConfig.openTime}
																	onChange={(e) =>
																		handleSpecHourChange(
																			day,
																			"openTime",
																			e.target.value,
																		)
																	}
																	className="w-32 text-center"
																	required
																/>
																<span className="text-sm text-muted-foreground">
																	a
																</span>
																<Input
																	type="time"
																	value={hourConfig.closeTime}
																	onChange={(e) =>
																		handleSpecHourChange(
																			day,
																			"closeTime",
																			e.target.value,
																		)
																	}
																	className="w-32 text-center"
																	required
																/>
															</div>
														) : (
															<span className="text-sm text-muted-foreground italic">
																No disponible
															</span>
														)}
													</div>
												);
											})}
										</div>

										<div className="flex justify-end pt-2">
											<Button type="submit" disabled={isPending}>
												Guardar Horarios del Especialista
											</Button>
										</div>
									</form>
								</>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* TAB 3: BLOCKED DATES & SLOTS */}
				<TabsContent value="blocks" className="mt-6 space-y-6">
					{/* Full Day Blocks */}
					<Card>
						<CardHeader>
							<CardTitle>
								Bloqueo de Días Completos (Festivos / Cierres)
							</CardTitle>
							<CardDescription>
								Inhabilita todo el día para un especialista o para el salón
								completo.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<form
								onSubmit={handleAddBlockedDate}
								className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end border p-4 rounded-md bg-muted/20"
							>
								<div>
									<Label htmlFor="bd-date">Fecha *</Label>
									<Input
										id="bd-date"
										type="date"
										value={blockDateValue}
										onChange={(e) => setBlockDateValue(e.target.value)}
										required
									/>
								</div>
								<div>
									<Label htmlFor="bd-spec">Especialista</Label>
									<select
										id="bd-spec"
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										value={blockDateSpec}
										onChange={(e) => setBlockDateSpec(e.target.value)}
									>
										<option value="">-- Todo el Salón --</option>
										{specialists.map((s) => (
											<option key={s.id} value={s.id}>
												{s.name}
											</option>
										))}
									</select>
								</div>
								<div>
									<Label htmlFor="bd-reason">Motivo</Label>
									<Input
										id="bd-reason"
										placeholder="ej: Festivo, Vacaciones..."
										value={blockDateReason}
										onChange={(e) => setBlockDateReason(e.target.value)}
									/>
								</div>
								<Button type="submit" disabled={isPending} className="gap-2">
									<Plus className="h-4 w-4" /> Bloquear Día
								</Button>
							</form>

							<div className="space-y-2">
								{blockedDates.length === 0 ? (
									<p className="text-xs text-muted-foreground text-center py-3">
										No hay fechas bloqueadas.
									</p>
								) : (
									blockedDates.map((bd) => {
										const specName =
											specialists.find((s) => s.id === bd.specialistId)?.name ||
											"Todo el Salón";
										return (
											<div
												key={bd.id}
												className="flex items-center justify-between p-3 border rounded-md"
											>
												<div>
													<p className="text-sm font-semibold">
														{bd.date.slice(0, 10)} — {specName}
													</p>
													{bd.reason && (
														<p className="text-xs text-muted-foreground">
															{bd.reason}
														</p>
													)}
												</div>
												<Button
													size="sm"
													variant="ghost"
													className="text-destructive hover:text-destructive"
													onClick={() => handleDeleteBlockedDate(bd.id)}
													disabled={isPending}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										);
									})
								)}
							</div>
						</CardContent>
					</Card>

					{/* Time Slot Blocks */}
					<Card>
						<CardHeader>
							<CardTitle>
								Bloqueo de Horarios Específicos (Compromisos / Almuerzo)
							</CardTitle>
							<CardDescription>
								Inhabilita un rango de horas en una fecha concreta.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<form
								onSubmit={handleAddBlockedSlot}
								className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end border p-4 rounded-md bg-muted/20"
							>
								<div>
									<Label htmlFor="bs-date">Fecha *</Label>
									<Input
										id="bs-date"
										type="date"
										value={blockSlotDate}
										onChange={(e) => setBlockSlotDate(e.target.value)}
										required
									/>
								</div>
								<div className="flex gap-1">
									<div>
										<Label htmlFor="bs-start">Desde *</Label>
										<Input
											id="bs-start"
											type="time"
											value={blockSlotStart}
											onChange={(e) => setBlockSlotStart(e.target.value)}
											required
										/>
									</div>
									<div>
										<Label htmlFor="bs-end">Hasta *</Label>
										<Input
											id="bs-end"
											type="time"
											value={blockSlotEnd}
											onChange={(e) => setBlockSlotEnd(e.target.value)}
											required
										/>
									</div>
								</div>
								<div>
									<Label htmlFor="bs-spec">Especialista</Label>
									<select
										id="bs-spec"
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										value={blockSlotSpec}
										onChange={(e) => setBlockSlotSpec(e.target.value)}
									>
										<option value="">-- Todo el Salón --</option>
										{specialists.map((s) => (
											<option key={s.id} value={s.id}>
												{s.name}
											</option>
										))}
									</select>
								</div>
								<div>
									<Label htmlFor="bs-reason">Motivo</Label>
									<Input
										id="bs-reason"
										placeholder="ej: Almuerzo, Reunión..."
										value={blockSlotReason}
										onChange={(e) => setBlockSlotReason(e.target.value)}
									/>
								</div>
								<Button type="submit" disabled={isPending} className="gap-2">
									<Plus className="h-4 w-4" /> Bloquear Horario
								</Button>
							</form>

							<div className="space-y-2">
								{blockedSlots.length === 0 ? (
									<p className="text-xs text-muted-foreground text-center py-3">
										No hay horarios bloqueados.
									</p>
								) : (
									blockedSlots.map((bs) => {
										const specName =
											specialists.find((s) => s.id === bs.specialistId)?.name ||
											"Todo el Salón";
										return (
											<div
												key={bs.id}
												className="flex items-center justify-between p-3 border rounded-md"
											>
												<div>
													<p className="text-sm font-semibold">
														{bs.date.slice(0, 10)} ({bs.startTime} -{" "}
														{bs.endTime}) — {specName}
													</p>
													{bs.reason && (
														<p className="text-xs text-muted-foreground">
															{bs.reason}
														</p>
													)}
												</div>
												<Button
													size="sm"
													variant="ghost"
													className="text-destructive hover:text-destructive"
													onClick={() => handleDeleteBlockedSlot(bs.id)}
													disabled={isPending}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										);
									})
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
