"use client";

import {
	Cake,
	CalendarClock,
	Mail,
	MessageSquare,
	Phone,
	Search,
	Trash2,
	UserRound,
} from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import { deleteCustomer, updateCustomer } from "@/app/actions/customers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateCustomerDialog } from "./create-customer-dialog";

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

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeToMobileQuery(onChange: () => void) {
	const mediaQuery = window.matchMedia(MOBILE_QUERY);
	mediaQuery.addEventListener("change", onChange);
	return () => mediaQuery.removeEventListener("change", onChange);
}

function getMobileSnapshot() {
	return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
	return false;
}

function CustomerDetailsModal({
	open,
	onOpenChange,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
}) {
	const isMobile = useSyncExternalStore(
		subscribeToMobileQuery,
		getMobileSnapshot,
		getServerSnapshot,
	);

	if (isMobile) {
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent
					side="bottom"
					className="max-h-[94dvh] gap-0 overflow-hidden rounded-t-3xl border-x p-0 duration-300 [&_[data-slot=sheet-close]]:min-h-11 [&_[data-slot=sheet-close]]:min-w-11"
				>
					<div
						aria-hidden="true"
						className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
					/>
					<SheetHeader className="shrink-0 border-b px-4 pb-4 pt-3 pr-14 text-left">
						<SheetTitle className="text-lg font-bold">
							Ficha e historial del cliente
						</SheetTitle>
					</SheetHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
						{children}
					</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90dvh] max-w-2xl gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b p-4 pr-14">
					<DialogTitle className="text-lg font-bold">
						Ficha e historial del cliente
					</DialogTitle>
				</DialogHeader>
				<div className="min-h-0 overflow-y-auto p-4">{children}</div>
			</DialogContent>
		</Dialog>
	);
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
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
		null,
	);
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
	const [editName, setEditName] = useState("");
	const [editPhone, setEditPhone] = useState("");
	const [editEmail, setEditEmail] = useState("");
	const [editBirthday, setEditBirthday] = useState("");
	const [editNotes, setEditNotes] = useState("");

	const currentMonth = new Date().getMonth() + 1;

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

	const filteredCustomers = customers.filter((customer) => {
		const normalizedSearch = searchTerm.toLowerCase();
		const matchesSearch =
			customer.fullName.toLowerCase().includes(normalizedSearch) ||
			customer.phone.includes(searchTerm) ||
			customer.email?.toLowerCase().includes(normalizedSearch);

		if (!matchesSearch) return false;
		if (selectedTab === "birthdays") {
			if (!customer.birthday) return false;
			return new Date(customer.birthday).getUTCMonth() + 1 === currentMonth;
		}
		if (selectedTab === "frequent") return customer.completedCount >= 3;
		return true;
	});

	return (
		<div className="min-w-0 space-y-5 sm:space-y-6">
			{errorMessage && !isDetailDialogOpen && (
				<div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
					<span className="min-w-0">{errorMessage}</span>
					<button
						type="button"
						onClick={() => setErrorMessage(null)}
						className="min-h-11 shrink-0 px-2 text-xs underline active:scale-[0.98]"
					>
						Cerrar
					</button>
				</div>
			)}

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
					<p className="text-sm text-muted-foreground sm:text-base">
						Consulta contactos, visitas y preferencias desde un solo lugar.
					</p>
				</div>
				<div className="[&_[data-slot=button]]:min-h-11 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:active:scale-[0.98] sm:[&_[data-slot=button]]:w-auto">
					<CreateCustomerDialog
						slug={slug}
						onSelectExisting={(id) => {
							const found = customers.find((customer) => customer.id === id);
							if (found) openDetailDialog(found);
						}}
					/>
				</div>
			</div>

			<div className="space-y-4">
				<div className="relative">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						aria-label="Buscar clientes"
						placeholder="Buscar por nombre, teléfono o correo..."
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						className="min-h-11 rounded-xl bg-card pl-9"
					/>
				</div>

				<Tabs
					value={selectedTab}
					onValueChange={(value) =>
						setSelectedTab(value as "all" | "birthdays" | "frequent")
					}
				>
					<TabsList className="grid h-auto min-h-11 w-full max-w-md grid-cols-3 rounded-xl">
						<TabsTrigger value="all" className="min-h-11 text-xs font-bold">
							Todos ({customers.length})
						</TabsTrigger>
						<TabsTrigger
							value="birthdays"
							className="min-h-11 whitespace-normal text-xs font-bold"
						>
							Cumpleaños
						</TabsTrigger>
						<TabsTrigger
							value="frequent"
							className="min-h-11 whitespace-normal text-xs font-bold"
						>
							Frecuentes
						</TabsTrigger>
					</TabsList>

					<TabsContent value={selectedTab} className="mt-4">
						{filteredCustomers.length === 0 ? (
							<div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground sm:p-12">
								No se encontraron clientes para este filtro.
							</div>
						) : (
							<div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:shadow-none lg:grid-cols-3">
								{filteredCustomers.map((customer) => {
									const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
									const standardMessage = `Hola ${customer.fullName}, te escribimos de parte de ${salonName}.`;
									const birthdayMessage = `¡Hola ${customer.fullName}! 🎉 De parte de ${salonName} te deseamos un muy feliz cumpleaños. Queremos regalarte un descuento especial en tu próxima visita. ¡Agenda tu cita con nosotros!`;
									const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
										selectedTab === "birthdays"
											? birthdayMessage
											: standardMessage,
									)}`;

									return (
										<article
											key={customer.id}
											className="space-y-3 border-b p-4 last:border-b-0 md:rounded-2xl md:border md:bg-card md:p-5 md:shadow-sm md:last:border-b"
										>
											<div className="flex items-start gap-3">
												<button
													type="button"
													onClick={() => openDetailDialog(customer)}
													className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition-transform active:scale-[0.98]"
												>
													<span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
														<UserRound className="size-5" />
													</span>
													<span className="min-w-0">
														<span className="block truncate font-bold">
															{customer.fullName}
														</span>
														<span className="block text-xs text-muted-foreground">
															{customer.completedCount} visitas atendidas
														</span>
													</span>
												</button>
												{customer.birthday && (
													<Badge
														variant="outline"
														className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-800"
													>
														<Cake className="size-3 text-amber-600" />
														{customer.birthday.slice(5, 10)}
													</Badge>
												)}
											</div>

											<div className="divide-y rounded-xl bg-muted/35 px-3">
												<a
													href={`tel:${customer.phone}`}
													className="flex min-h-11 items-center gap-2 break-all text-xs text-muted-foreground transition-opacity active:opacity-60"
												>
													<Phone className="size-3.5 shrink-0" />
													{customer.phone}
												</a>
												{customer.email && (
													<a
														href={`mailto:${customer.email}`}
														className="flex min-h-11 items-center gap-2 break-all text-xs text-muted-foreground transition-opacity active:opacity-60"
													>
														<Mail className="size-3.5 shrink-0" />
														{customer.email}
													</a>
												)}
											</div>

											<div className="grid grid-cols-3 divide-x border-y py-2 text-center">
												<div className="px-1">
													<p className="text-sm font-bold text-primary">
														${customer.totalSpent.toFixed(2)}
													</p>
													<p className="text-[10px] text-muted-foreground">
														Gastado
													</p>
												</div>
												<div className="px-1">
													<p className="text-sm font-bold text-emerald-600">
														{customer.completedCount}
													</p>
													<p className="text-[10px] text-muted-foreground">
														Atendidas
													</p>
												</div>
												<div className="px-1">
													<p className="text-sm font-bold text-amber-600">
														{customer.noShowCount}
													</p>
													<p className="text-[10px] text-muted-foreground">
														No-shows
													</p>
												</div>
											</div>

											{customer.notes && (
												<p className="line-clamp-2 rounded-lg bg-muted/35 px-3 py-2 text-xs italic text-muted-foreground">
													Nota: {customer.notes}
												</p>
											)}

											<div className="grid grid-cols-2 gap-2 pt-1">
												<a
													href={whatsappUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-3 text-xs font-bold text-[#168a43] transition active:scale-[0.98] active:opacity-80"
												>
													{selectedTab === "birthdays" ? (
														<Cake className="size-4" />
													) : (
														<MessageSquare className="size-4" />
													)}
													{selectedTab === "birthdays"
														? "Felicitar"
														: "WhatsApp"}
												</a>
												<Button
													type="button"
													variant="outline"
													className="min-h-11 rounded-xl text-xs active:scale-[0.98]"
													onClick={() => openDetailDialog(customer)}
												>
													<CalendarClock className="size-4" /> Historial
												</Button>
											</div>
										</article>
									);
								})}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</div>

			<CustomerDetailsModal
				open={isDetailDialogOpen}
				onOpenChange={setIsDetailDialogOpen}
			>
				{selectedCustomer && (
					<div className="space-y-5 [&_input]:min-h-11">
						{errorMessage && (
							<p
								role="alert"
								className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive"
							>
								{errorMessage}
							</p>
						)}

						<div className="grid grid-cols-3 divide-x rounded-2xl border bg-muted/20 py-3 text-center">
							<div className="px-2">
								<p className="font-bold text-primary">
									${selectedCustomer.totalSpent.toFixed(2)}
								</p>
								<p className="text-[10px] text-muted-foreground">Gastado</p>
							</div>
							<div className="px-2">
								<p className="font-bold text-emerald-600">
									{selectedCustomer.completedCount}
								</p>
								<p className="text-[10px] text-muted-foreground">Visitas</p>
							</div>
							<div className="px-2">
								<p className="font-bold text-amber-600">
									{selectedCustomer.noShowCount}
								</p>
								<p className="text-[10px] text-muted-foreground">No-shows</p>
							</div>
						</div>

						<form
							onSubmit={handleUpdateCustomer}
							className="space-y-4 rounded-2xl border p-4"
						>
							<h4 className="border-b pb-3 text-sm font-bold">
								Datos personales y preferencias
							</h4>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="ed-name">Nombre completo</Label>
									<Input
										id="ed-name"
										value={editName}
										onChange={(event) => setEditName(event.target.value)}
										required
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="ed-phone">Teléfono / WhatsApp</Label>
									<Input
										id="ed-phone"
										value={editPhone}
										onChange={(event) => setEditPhone(event.target.value)}
										required
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="ed-email">Correo electrónico</Label>
									<Input
										id="ed-email"
										type="email"
										value={editEmail}
										onChange={(event) => setEditEmail(event.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="ed-bday">Cumpleaños</Label>
									<Input
										id="ed-bday"
										type="date"
										value={editBirthday}
										onChange={(event) => setEditBirthday(event.target.value)}
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="ed-notes">Notas / preferencias privadas</Label>
								<Input
									id="ed-notes"
									value={editNotes}
									onChange={(event) => setEditNotes(event.target.value)}
									placeholder="Preferencias, tintes, alergias..."
								/>
							</div>
							<Button
								type="submit"
								className="min-h-11 w-full active:scale-[0.98] sm:ml-auto sm:w-auto"
								disabled={isPending}
							>
								{isPending ? "Guardando..." : "Guardar cambios"}
							</Button>
						</form>

						<section
							className="space-y-3"
							aria-labelledby="customer-history-title"
						>
							<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
								<h4 id="customer-history-title" className="text-sm font-bold">
									Historial de citas ({selectedCustomer.appointments.length})
								</h4>
								{selectedCustomer.lastVisitDate && (
									<span className="text-xs text-muted-foreground">
										Última visita: {selectedCustomer.lastVisitDate}
									</span>
								)}
							</div>
							<div className="divide-y overflow-hidden rounded-2xl border bg-card">
								{selectedCustomer.appointments.length === 0 ? (
									<p className="p-6 text-center text-xs text-muted-foreground">
										Este cliente aún no tiene citas registradas.
									</p>
								) : (
									selectedCustomer.appointments.map((appointment) => (
										<div
											key={appointment.id}
											className="flex min-h-16 items-center justify-between gap-3 p-3 text-xs"
										>
											<div className="min-w-0">
												<p className="font-bold">
													{appointment.appointmentDate} ·{" "}
													{appointment.startTime}
												</p>
												<p className="truncate text-muted-foreground">
													{appointment.servicesList} ·{" "}
													{appointment.specialistName}
												</p>
											</div>
											<div className="shrink-0 space-y-1 text-right">
												<p className="font-bold text-primary">
													${appointment.totalPriceSnapshot.toFixed(2)}
												</p>
												<Badge
													variant={
														appointment.status === "completed"
															? "default"
															: appointment.status === "cancelled"
																? "destructive"
																: "secondary"
													}
												>
													{appointment.status}
												</Badge>
											</div>
										</div>
									))
								)}
							</div>
						</section>

						<div className="flex flex-col-reverse gap-2 border-t pt-4 min-[390px]:flex-row min-[390px]:justify-between">
							<Button
								variant="ghost"
								className="min-h-11 text-destructive active:scale-[0.98] hover:text-destructive"
								onClick={() => handleDeleteCustomer(selectedCustomer.id)}
								disabled={isPending}
							>
								<Trash2 className="size-4" /> Eliminar cliente
							</Button>
							<Button
								variant="outline"
								className="min-h-11 active:scale-[0.98]"
								onClick={() => setIsDetailDialogOpen(false)}
							>
								Cerrar
							</Button>
						</div>
					</div>
				)}
			</CustomerDetailsModal>
		</div>
	);
}
