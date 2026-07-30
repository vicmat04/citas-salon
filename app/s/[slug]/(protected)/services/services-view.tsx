"use client";

import { useState } from "react";
import {
	CheckCircle,
	Edit,
	FolderPlus,
	Plus,
	Trash2,
	XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	createCategory,
	createService,
	deleteCategory,
	deleteService,
	toggleServiceActive,
	updateCategory,
	updateService,
} from "@/app/actions/services";

interface Category {
	id: string;
	name: string;
	sortOrder: number;
}

interface Service {
	id: string;
	categoryId: string | null;
	name: string;
	description: string | null;
	price: number | { toNumber(): number } | string;
	durationMinutes: number;
	bufferMinutes: number;
	isActive: boolean;
}

export function ServicesView({
	slug,
	categories,
	services,
}: {
	slug: string;
	categories: Category[];
	services: Service[];
}) {
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
		null,
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [categoryName, setCategoryName] = useState("");
	const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
	const [editingService, setEditingService] = useState<Service | null>(null);
	const [serviceName, setServiceName] = useState("");
	const [serviceDescription, setServiceDescription] = useState("");
	const [servicePrice, setServicePrice] = useState("0");
	const [serviceDuration, setServiceDuration] = useState("30");
	const [serviceBuffer, setServiceBuffer] = useState("10");
	const [serviceCategory, setServiceCategory] = useState<string>("");

	function resetCategoryForm() {
		setCategoryName("");
		setEditingCategory(null);
		setErrorMessage(null);
	}

	function openNewCategoryDialog() {
		resetCategoryForm();
		setIsCategoryDialogOpen(true);
	}

	function openEditCategoryDialog(category: Category) {
		setEditingCategory(category);
		setCategoryName(category.name);
		setErrorMessage(null);
		setIsCategoryDialogOpen(true);
	}

	async function handleCategorySubmit(event: React.FormEvent) {
		event.preventDefault();
		setIsPending(true);
		setErrorMessage(null);

		const formData = new FormData();
		formData.set("name", categoryName);
		const result = editingCategory
			? await updateCategory(editingCategory.id, formData, slug)
			: await createCategory(formData, slug);

		setIsPending(false);
		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setIsCategoryDialogOpen(false);
			resetCategoryForm();
		}
	}

	async function handleDeleteCategory(categoryId: string) {
		if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;
		setIsPending(true);
		setErrorMessage(null);
		const result = await deleteCategory(categoryId, slug);
		setIsPending(false);
		if (result.error) setErrorMessage(result.error);
	}

	function resetServiceForm() {
		setServiceName("");
		setServiceDescription("");
		setServicePrice("0");
		setServiceDuration("30");
		setServiceBuffer("10");
		setServiceCategory("");
		setEditingService(null);
		setErrorMessage(null);
	}

	function openNewServiceDialog() {
		resetServiceForm();
		setIsServiceDialogOpen(true);
	}

	function openEditServiceDialog(service: Service) {
		setEditingService(service);
		setServiceName(service.name);
		setServiceDescription(service.description || "");
		const price =
			typeof service.price === "object" && "toNumber" in service.price
				? service.price.toNumber()
				: Number(service.price);
		setServicePrice(String(price));
		setServiceDuration(String(service.durationMinutes));
		setServiceBuffer(String(service.bufferMinutes));
		setServiceCategory(service.categoryId || "");
		setErrorMessage(null);
		setIsServiceDialogOpen(true);
	}

	async function handleServiceSubmit(event: React.FormEvent) {
		event.preventDefault();
		setIsPending(true);
		setErrorMessage(null);

		const formData = new FormData();
		formData.set("name", serviceName);
		formData.set("description", serviceDescription);
		formData.set("price", servicePrice);
		formData.set("durationMinutes", serviceDuration);
		formData.set("bufferMinutes", serviceBuffer);
		formData.set("categoryId", serviceCategory);
		const result = editingService
			? await updateService(editingService.id, formData, slug)
			: await createService(formData, slug);

		setIsPending(false);
		if (result.error) {
			setErrorMessage(result.error);
		} else {
			setIsServiceDialogOpen(false);
			resetServiceForm();
		}
	}

	async function handleToggleActive(serviceId: string) {
		setIsPending(true);
		await toggleServiceActive(serviceId, slug);
		setIsPending(false);
	}

	async function handleDeleteService(serviceId: string) {
		if (!confirm("¿Eliminar este servicio?")) return;
		setIsPending(true);
		await deleteService(serviceId, slug);
		setIsPending(false);
	}

	const filteredServices = selectedCategoryId
		? services.filter((service) => service.categoryId === selectedCategoryId)
		: services;

	return (
		<div className="space-y-5 sm:space-y-6">
			{errorMessage && (
				<div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-destructive/15 px-4 py-2 text-sm font-medium text-destructive">
					<span>{errorMessage}</span>
					<button
						type="button"
						onClick={() => setErrorMessage(null)}
						className="press-scale min-h-11 shrink-0 rounded-lg px-3 underline"
					>
						Cerrar
					</button>
				</div>
			)}

			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Catálogo de Servicios
					</h2>
					<p className="text-sm text-muted-foreground sm:text-base">
						Administra las categorías, precios y duraciones de tus servicios.
					</p>
				</div>
				<div className="grid grid-cols-2 gap-2 sm:flex">
					<Button
						variant="outline"
						onClick={openNewCategoryDialog}
						className="min-h-11 gap-2 active:scale-[0.98]"
					>
						<FolderPlus className="h-4 w-4" />
						<span className="truncate">Categoría</span>
					</Button>
					<Button
						onClick={openNewServiceDialog}
						className="min-h-11 gap-2 active:scale-[0.98]"
					>
						<Plus className="h-4 w-4" />
						<span className="truncate">Servicio</span>
					</Button>
				</div>
			</header>

			<section aria-labelledby="service-categories-title" className="space-y-2">
				<h3
					id="service-categories-title"
					className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
				>
					Categorías
				</h3>
				<div className="smooth-scroll -mx-1 overflow-x-auto px-1 pb-1">
					<div className="flex w-max min-w-full gap-2 rounded-2xl bg-muted/60 p-2">
						<button
							type="button"
							onClick={() => setSelectedCategoryId(null)}
							aria-pressed={selectedCategoryId === null}
							className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition active:scale-[0.98] ${
								selectedCategoryId === null
									? "bg-background text-foreground shadow-sm ring-1 ring-border"
									: "text-muted-foreground hover:bg-background/70"
							}`}
						>
							Todos ({services.length})
						</button>
						{categories.map((category) => {
							const count = services.filter(
								(service) => service.categoryId === category.id,
							).length;
							const isSelected = selectedCategoryId === category.id;
							return (
								<div
									key={category.id}
									className={`flex overflow-hidden rounded-xl ring-1 ${
										isSelected
											? "bg-background ring-border shadow-sm"
											: "ring-transparent"
									}`}
								>
									<button
										type="button"
										onClick={() => setSelectedCategoryId(category.id)}
										aria-pressed={isSelected}
										className="min-h-11 px-4 text-sm font-semibold text-muted-foreground transition active:scale-[0.98] aria-pressed:text-foreground"
									>
										{category.name} ({count})
									</button>
									<button
										type="button"
										onClick={() => openEditCategoryDialog(category)}
										className="min-h-11 min-w-11 border-l border-border/70 text-muted-foreground transition hover:text-foreground active:scale-[0.98]"
										aria-label={`Editar categoría ${category.name}`}
									>
										<Edit className="mx-auto h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => handleDeleteCategory(category.id)}
										disabled={isPending}
										className="min-h-11 min-w-11 border-l border-border/70 text-muted-foreground transition hover:text-destructive active:scale-[0.98]"
										aria-label={`Eliminar categoría ${category.name}`}
									>
										<Trash2 className="mx-auto h-4 w-4" />
									</button>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{filteredServices.length === 0 ? (
				<div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
					<p className="text-muted-foreground">
						No hay servicios registrados en esta categoría.
					</p>
					<Button
						onClick={openNewServiceDialog}
						className="mt-4 min-h-11 gap-2 active:scale-[0.98]"
					>
						<Plus className="h-4 w-4" />
						Crear primer servicio
					</Button>
				</div>
			) : (
				<section aria-label="Servicios" className="space-y-2">
					<h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
						Servicios
					</h3>
					<div className="overflow-hidden rounded-2xl border bg-card shadow-sm md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:shadow-none lg:grid-cols-3">
						{filteredServices.map((service) => {
							const price =
								typeof service.price === "object" && "toNumber" in service.price
									? service.price.toNumber()
									: Number(service.price);
							const categoryName =
								categories.find(
									(category) => category.id === service.categoryId,
								)?.name || "Sin categoría";

							return (
								<article
									key={service.id}
									className={`border-b p-4 last:border-b-0 md:rounded-2xl md:border md:bg-card md:p-5 md:shadow-sm ${
										service.isActive ? "" : "bg-muted/30 opacity-75"
									}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<h4 className="truncate text-base font-bold sm:text-lg">
												{service.name}
											</h4>
											<p className="text-xs font-medium text-muted-foreground">
												{categoryName}
											</p>
										</div>
										<Badge variant={service.isActive ? "default" : "secondary"}>
											{service.isActive ? "Activo" : "Inactivo"}
										</Badge>
									</div>
									{service.description && (
										<p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
											{service.description}
										</p>
									)}
									<div className="mt-4 flex items-end justify-between gap-3 border-t pt-3">
										<div>
											<p className="text-xl font-bold text-primary sm:text-2xl">
												${price.toFixed(2)}
											</p>
											{price === 0 && (
												<span className="text-[10px] font-semibold text-destructive">
													No se muestra al cliente
												</span>
											)}
										</div>
										<div className="text-right text-xs text-muted-foreground">
											<p>
												<strong className="text-foreground">
													{service.durationMinutes} min
												</strong>{" "}
												servicio
											</p>
											<p>
												<strong className="text-foreground">
													{service.bufferMinutes} min
												</strong>{" "}
												descanso
											</p>
										</div>
									</div>
									<div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
										<Button
											type="button"
											variant="ghost"
											onClick={() => handleToggleActive(service.id)}
											disabled={isPending}
											className="min-h-11 gap-1 px-2 text-xs active:scale-[0.98]"
										>
											{service.isActive ? (
												<XCircle className="h-4 w-4" />
											) : (
												<CheckCircle className="h-4 w-4 text-emerald-600" />
											)}
											{service.isActive ? "Pausar" : "Activar"}
										</Button>
										<Button
											type="button"
											variant="ghost"
											onClick={() => openEditServiceDialog(service)}
											disabled={isPending}
											className="min-h-11 gap-1 px-2 text-xs active:scale-[0.98]"
										>
											<Edit className="h-4 w-4" /> Editar
										</Button>
										<Button
											type="button"
											variant="ghost"
											onClick={() => handleDeleteService(service.id)}
											disabled={isPending}
											className="min-h-11 gap-1 px-2 text-xs text-destructive hover:text-destructive active:scale-[0.98]"
										>
											<Trash2 className="h-4 w-4" /> Eliminar
										</Button>
									</div>
								</article>
							);
						})}
					</div>
				</section>
			)}

			<Dialog
				open={isCategoryDialogOpen}
				onOpenChange={setIsCategoryDialogOpen}
			>
				<DialogContent className="max-w-md rounded-t-2xl sm:rounded-lg">
					<DialogHeader>
						<DialogTitle>
							{editingCategory ? "Editar Categoría" : "Nueva Categoría"}
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCategorySubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="cat-name">Nombre de Categoría</Label>
							<Input
								id="cat-name"
								value={categoryName}
								onChange={(event) => setCategoryName(event.target.value)}
								placeholder="ej: Cortes, Coloración, Manicura"
								className="min-h-11"
								required
							/>
						</div>
						<DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCategoryDialogOpen(false)}
								className="min-h-11 active:scale-[0.98]"
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								disabled={isPending}
								className="min-h-11 active:scale-[0.98]"
							>
								{editingCategory ? "Guardar Cambios" : "Crear Categoría"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
				<DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-t-2xl sm:rounded-lg">
					<DialogHeader>
						<DialogTitle>
							{editingService ? "Editar Servicio" : "Nuevo Servicio"}
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleServiceSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="srv-name">Nombre del Servicio *</Label>
							<Input
								id="srv-name"
								value={serviceName}
								onChange={(event) => setServiceName(event.target.value)}
								placeholder="ej: Corte Caballero, Balayage"
								className="min-h-11"
								required
							/>
						</div>

						<fieldset className="space-y-2">
							<legend className="text-sm font-medium">Categoría</legend>
							<div
								className="smooth-scroll flex gap-2 overflow-x-auto pb-1"
								aria-label="Seleccionar categoría"
							>
								<button
									type="button"
									onClick={() => setServiceCategory("")}
									aria-pressed={serviceCategory === ""}
									className="min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition active:scale-[0.98] aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
								>
									Sin categoría
								</button>
								{categories.map((category) => (
									<button
										key={category.id}
										type="button"
										onClick={() => setServiceCategory(category.id)}
										aria-pressed={serviceCategory === category.id}
										className="min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition active:scale-[0.98] aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
									>
										{category.name}
									</button>
								))}
							</div>
						</fieldset>

						<div className="space-y-2">
							<Label htmlFor="srv-desc">Descripción</Label>
							<Input
								id="srv-desc"
								value={serviceDescription}
								onChange={(event) => setServiceDescription(event.target.value)}
								placeholder="Detalle o productos incluidos..."
								className="min-h-11"
							/>
						</div>

						<div className="grid gap-3 sm:grid-cols-3">
							<div className="space-y-2">
								<Label htmlFor="srv-price">Precio ($)</Label>
								<Input
									id="srv-price"
									type="number"
									step="0.01"
									min="0"
									value={servicePrice}
									onChange={(event) => setServicePrice(event.target.value)}
									className="min-h-11"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="srv-dur">Duración (min)</Label>
								<Input
									id="srv-dur"
									type="number"
									min="1"
									value={serviceDuration}
									onChange={(event) => setServiceDuration(event.target.value)}
									className="min-h-11"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="srv-buf">Descanso (min)</Label>
								<Input
									id="srv-buf"
									type="number"
									min="0"
									value={serviceBuffer}
									onChange={(event) => setServiceBuffer(event.target.value)}
									className="min-h-11"
									required
								/>
							</div>
						</div>

						<DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsServiceDialogOpen(false)}
								className="min-h-11 active:scale-[0.98]"
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								disabled={isPending}
								className="min-h-11 active:scale-[0.98]"
							>
								{editingService ? "Guardar Cambios" : "Crear Servicio"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
