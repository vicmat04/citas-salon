"use client";

import { useState } from "react";
import {
	Search,
	Phone,
	Mail,
	Cake,
	MessageSquare,
	Trash2,
	FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { CreateCustomerDialog } from "./create-customer-dialog";
import { deleteCustomer, updateCustomer } from "@/app/actions/customers";

interface CustomerAppointment {
	id: string;
	appointmentDate: string;
	startTime: string;
	status: string;
	totalPriceSnapshot: number;
	specialistName: string;
	servicesList: string;
}

interface Customer {
	id: string;
	fullName: string;
	phone: string;
	email: string | null;
	birthday: string | null;
	notes: string | null;
	totalSpent: number;
	completedCount: number;
	noShowCount: number;
	lastVisitDate: string | null;
	appointments: CustomerAppointment[];
}

export function CustomersView({
	slug,
	salonName,
	customers,
}: {
	slug: string;
	salonName: string;
	customers: Customer[];
}) {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedTab, setSelectedTab] = useState<
		"all" | "birthdays" | "frequent"
	>("all");
	const [isPending, setIsPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Customer detail / edit dialog
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
		null,
	);
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

	// Edit fields
	const [editName, setEditName] = useState("");
	const [editPhone, setEditPhone] = useState("");
	const [editEmail, setEditEmail] = useState("");
	const [editBirthday, setEditBirthday] = useState("");
	const [editNotes, setEditNotes] = useState("");

	const currentMonth = new Date().getMonth() + 1; // 1..12

	function openDetailDialog(customer: Customer) {
		setSelectedCustomer(customer);
		setEditName(customer.fullName);
		setEditPhone(customer.phone);
		setEditEmail(customer.email || "");
		setEditBirthday(customer.birthday ? customer.birthday.slice(0, 10) : "");
		setEditNotes(customer.notes || "");
		setErrorMessage(null);
		setIsDetailDialogOpen(true);
	}

	async function handleUpdateCustomer(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedCustomer) return;
		setIsPending(true);
		setErrorMessage(null);

		const formData = new FormData();
		formData.set("fullName", editName);
		formData.set("phone", editPhone);
		formData.set("email", editEmail);
		formData.set("birthday", editBirthday);
		formData.set("notes", editNotes);

		const result = await updateCustomer(selectedCustomer.id, formData, slug);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setIsDetailDialogOpen(false);
		}
	}

	async function handleDeleteCustomer(customerId: string) {
		if (
			!confirm(
				"¿Estás seguro de eliminar la ficha de este cliente? El historial de citas se conservará intacto.",
			)
		)
			return;
		setIsPending(true);

		const result = await deleteCustomer(customerId, slug);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setIsDetailDialogOpen(false);
		}
	}

	// Filter customers by search term and tabs
	const filteredCustomers = customers.filter((cust) => {
		const matchesSearch =
			cust.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			cust.phone.includes(searchTerm) ||
			(cust.email &&
				cust.email.toLowerCase().includes(searchTerm.toLowerCase()));

		if (!matchesSearch) return false;

		if (selectedTab === "birthdays") {
			if (!cust.birthday) return false;
			const bMonth = new Date(cust.birthday).getUTCMonth() + 1;
			return bMonth === currentMonth;
		}

		if (selectedTab === "frequent") {
			return cust.completedCount >= 3;
		}

		return true;
	});

	return (
		<div className="min-w-0 space-y-6">
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
					<h2 className="text-2xl font-bold tracking-tight">
						Directorio de Clientes (CRM)
					</h2>
					<p className="text-muted-foreground">
						Historial de visitas, métricas de consumo y cumpleaños de tus
						clientes.
					</p>
				</div>
				<div className="[&_[data-slot=button]]:min-h-11">
					<CreateCustomerDialog
						slug={slug}
						onSelectExisting={(id) => {
							const found = customers.find((c) => c.id === id);
							if (found) openDetailDialog(found);
						}}
					/>
				</div>
			</div>

			{/* Search Bar & Tabs */}
			<div className="space-y-4">
				<div className="relative">
					<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Buscar por nombre, teléfono o correo electrónico..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="min-h-11 pl-9"
					/>
				</div>

				<Tabs
					defaultValue="all"
					onValueChange={(v) =>
						setSelectedTab(v as "all" | "birthdays" | "frequent")
					}
				>
					<TabsList className="grid h-auto min-h-11 w-full max-w-md grid-cols-3">
						<TabsTrigger
							value="all"
							className="min-h-11 whitespace-normal text-xs font-bold"
						>
							Todos ({customers.length})
						</TabsTrigger>
						<TabsTrigger
							value="birthdays"
							className="min-h-11 whitespace-normal text-xs font-bold"
						>
							Cumpleaños Mes
						</TabsTrigger>
						<TabsTrigger
							value="frequent"
							className="min-h-11 whitespace-normal text-xs font-bold"
						>
							Frecuentes (3+)
						</TabsTrigger>
					</TabsList>

					<TabsContent value={selectedTab} className="mt-6">
						{filteredCustomers.length === 0 ? (
							<Card className="p-8 text-center text-muted-foreground sm:p-12">
								No se encontraron clientes para este filtro.
							</Card>
						) : (
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{filteredCustomers.map((cust) => {
									const cleanPhone = cust.phone.replace(/[^0-9]/g, "");

									// Standard WhatsApp message
									const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${cust.fullName}, te escribimos de parte de ${salonName}.`)}`;

									// Birthday WhatsApp message
									const waBirthdayUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`¡Hola ${cust.fullName}! 🎉 De parte de ${salonName} te deseamos un muy feliz cumpleaños. Queremos regalarte un descuento especial en tu próxima visita. ¡Agenda tu cita con nosotros!`)}`;

									return (
										<Card
											key={cust.id}
											className="overflow-hidden hover:border-primary/50 transition-colors"
										>
											<CardContent className="p-5 space-y-4">
												<div className="flex items-start justify-between">
													<div className="min-w-0">
														<button
															type="button"
															className="min-h-11 max-w-full text-left text-lg font-bold hover:underline"
															onClick={() => openDetailDialog(cust)}
														>
															{cust.fullName}
														</button>
														<button
															type="button"
															onClick={() => {
																window.location.href = `tel:${cust.phone}`;
															}}
															className="flex min-h-11 max-w-full items-center gap-1 break-all text-left text-xs text-muted-foreground"
														>
															<Phone className="h-3 w-3 shrink-0" />{" "}
															{cust.phone}
														</button>
														{cust.email && (
															<button
																type="button"
																onClick={() => {
																	window.location.href = `mailto:${cust.email}`;
																}}
																className="flex min-h-11 max-w-full items-center gap-1 break-all text-left text-xs text-muted-foreground"
															>
																<Mail className="h-3 w-3 shrink-0" />{" "}
																{cust.email}
															</button>
														)}
													</div>
													{cust.birthday && (
														<Badge
															variant="outline"
															className="gap-1 text-[10px] bg-amber-500/10 text-amber-900 border-amber-500/30"
														>
															<Cake className="h-3 w-3 text-amber-600" />
															{cust.birthday.slice(5, 10)}
														</Badge>
													)}
												</div>

												{/* Customer Metrics */}
												<div className="grid grid-cols-3 gap-2 border-t border-b py-2 text-center text-xs">
													<div>
														<p className="font-bold text-primary text-sm">
															${cust.totalSpent.toFixed(2)}
														</p>
														<p className="text-[10px] text-muted-foreground">
															Total Gastado
														</p>
													</div>
													<div>
														<p className="font-bold text-emerald-600 text-sm">
															{cust.completedCount}
														</p>
														<p className="text-[10px] text-muted-foreground">
															Atendidas
														</p>
													</div>
													<div>
														<p className="font-bold text-amber-600 text-sm">
															{cust.noShowCount}
														</p>
														<p className="text-[10px] text-muted-foreground">
															No-Shows
														</p>
													</div>
												</div>

												{cust.notes && (
													<p className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/40 p-2 rounded">
														Nota: {cust.notes}
													</p>
												)}

												<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
													<Button
														size="sm"
														variant="outline"
														className="min-h-11 gap-1 text-xs"
														onClick={() => openDetailDialog(cust)}
													>
														<FileText className="h-3.5 w-3.5" /> Ver Ficha
													</Button>

													{selectedTab === "birthdays" ? (
														<button
															type="button"
															onClick={() =>
																window.open(
																	waBirthdayUrl,
																	"_blank",
																	"noopener,noreferrer",
																)
															}
															className="flex min-h-11 items-center justify-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-500/20"
														>
															<Cake className="h-3.5 w-3.5" /> Felicitar por WA
														</button>
													) : (
														<button
															type="button"
															onClick={() =>
																window.open(
																	waUrl,
																	"_blank",
																	"noopener,noreferrer",
																)
															}
															className="flex min-h-11 items-center justify-center gap-1 rounded-md border border-[#25D366]/30 bg-[#25D366]/10 px-3 text-xs font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/20"
														>
															<MessageSquare className="h-3.5 w-3.5" /> WhatsApp
														</button>
													)}
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</div>

			{/* Customer Detail & History Modal */}
			<Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
				<DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto [&_input]:min-h-11">
					<DialogHeader>
						<DialogTitle>Ficha e Historial del Cliente</DialogTitle>
					</DialogHeader>

					{selectedCustomer && (
						<div className="space-y-6">
							{/* Customer Stats Header */}
							<div className="grid grid-cols-1 gap-3 rounded-md border bg-muted/20 p-4 text-center min-[360px]:grid-cols-3">
								<div>
									<p className="text-xl font-bold text-primary">
										${selectedCustomer.totalSpent.toFixed(2)}
									</p>
									<p className="text-xs text-muted-foreground">
										Total Gastado (Citas Atendidas)
									</p>
								</div>
								<div>
									<p className="text-xl font-bold text-emerald-600">
										{selectedCustomer.completedCount} visitas
									</p>
									<p className="text-xs text-muted-foreground">
										Citas Atendidas
									</p>
								</div>
								<div>
									<p className="text-xl font-bold text-amber-600">
										{selectedCustomer.noShowCount}
									</p>
									<p className="text-xs text-muted-foreground">No-Shows</p>
								</div>
							</div>

							{/* Edit Customer Form */}
							<form
								onSubmit={handleUpdateCustomer}
								className="space-y-3 border p-4 rounded-md"
							>
								<h4 className="font-bold text-sm border-b pb-2">
									Datos Personales y Notas de Preferencia
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<Label htmlFor="ed-name">Nombre Completo</Label>
										<Input
											id="ed-name"
											value={editName}
											onChange={(e) => setEditName(e.target.value)}
											required
										/>
									</div>
									<div>
										<Label htmlFor="ed-phone">Teléfono / WhatsApp</Label>
										<Input
											id="ed-phone"
											value={editPhone}
											onChange={(e) => setEditPhone(e.target.value)}
											required
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<Label htmlFor="ed-email">Correo Electrónico</Label>
										<Input
											id="ed-email"
											type="email"
											value={editEmail}
											onChange={(e) => setEditEmail(e.target.value)}
										/>
									</div>
									<div>
										<Label htmlFor="ed-bday">Cumpleaños</Label>
										<Input
											id="ed-bday"
											type="date"
											value={editBirthday}
											onChange={(e) => setEditBirthday(e.target.value)}
										/>
									</div>
								</div>

								<div>
									<Label htmlFor="ed-notes">
										Notas / Preferencias Privadas
									</Label>
									<Input
										id="ed-notes"
										value={editNotes}
										onChange={(e) => setEditNotes(e.target.value)}
										placeholder="Preferencias, tintes, alergias..."
									/>
								</div>

								<div className="flex justify-end gap-2 pt-2">
									<Button type="submit" size="sm" disabled={isPending}>
										Guardar Cambios
									</Button>
								</div>
							</form>

							{/* Appointment History List */}
							<div className="space-y-3">
								<h4 className="font-bold text-sm flex items-center justify-between">
									<span>
										Historial de Citas ({selectedCustomer.appointments.length})
									</span>
									{selectedCustomer.lastVisitDate && (
										<span className="text-xs text-muted-foreground font-normal">
											Última visita: {selectedCustomer.lastVisitDate}
										</span>
									)}
								</h4>

								<div className="max-h-56 overflow-y-auto space-y-2 border rounded-md p-2">
									{selectedCustomer.appointments.length === 0 ? (
										<p className="text-xs text-muted-foreground text-center py-4">
											Este cliente aún no tiene citas registradas.
										</p>
									) : (
										selectedCustomer.appointments.map((appt) => (
											<div
												key={appt.id}
												className="flex flex-col items-start justify-between gap-2 rounded-md border p-3 text-xs min-[390px]:flex-row min-[390px]:items-center"
											>
												<div>
													<p className="font-bold">
														{appt.appointmentDate} a las {appt.startTime}
													</p>
													<p className="text-muted-foreground">
														{appt.servicesList} • Prof: {appt.specialistName}
													</p>
												</div>
												<div className="space-y-1 min-[390px]:text-right">
													<p className="font-bold text-primary">
														${appt.totalPriceSnapshot.toFixed(2)}
													</p>
													<Badge
														variant={
															appt.status === "completed"
																? "default"
																: appt.status === "cancelled"
																	? "destructive"
																	: "secondary"
														}
													>
														{appt.status}
													</Badge>
												</div>
											</div>
										))
									)}
								</div>
							</div>

							<DialogFooter className="flex flex-col-reverse items-stretch justify-between gap-2 border-t pt-4 min-[390px]:flex-row min-[390px]:items-center">
								<Button
									variant="ghost"
									size="sm"
									className="min-h-11 gap-1 text-destructive hover:text-destructive"
									onClick={() => handleDeleteCustomer(selectedCustomer.id)}
									disabled={isPending}
								>
									<Trash2 className="h-4 w-4" /> Eliminar Cliente
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="min-h-11"
									onClick={() => setIsDetailDialogOpen(false)}
								>
									Cerrar
								</Button>
							</DialogFooter>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
