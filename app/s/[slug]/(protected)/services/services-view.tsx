"use client";

import { useState } from "react";
import {
	Plus,
	Trash2,
	Edit,
	FolderPlus,
	CheckCircle,
	XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
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

	// Dialog states
	const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [categoryName, setCategoryName] = useState("");

	const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
	const [editingService, setEditingService] = useState<Service | null>(null);

	// Service form fields
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

	function openEditCategoryDialog(cat: Category) {
		setEditingCategory(cat);
		setCategoryName(cat.name);
		setErrorMessage(null);
		setIsCategoryDialogOpen(true);
	}

	async function handleCategorySubmit(e: React.FormEvent) {
		e.preventDefault();
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

	async function handleDeleteCategory(catId: string) {
		if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;
		setIsPending(true);
		setErrorMessage(null);

		const result = await deleteCategory(catId, slug);
		setIsPending(false);

		if (result.error) {
			setErrorMessage(result.error);
		}
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

	function openEditServiceDialog(srv: Service) {
		setEditingService(srv);
		setServiceName(srv.name);
		setServiceDescription(srv.description || "");
		const priceNum =
			typeof srv.price === "object" && "toNumber" in srv.price
				? srv.price.toNumber()
				: Number(srv.price);
		setServicePrice(String(priceNum));
		setServiceDuration(String(srv.durationMinutes));
		setServiceBuffer(String(srv.bufferMinutes));
		setServiceCategory(srv.categoryId || "");
		setErrorMessage(null);
		setIsServiceDialogOpen(true);
	}

	async function handleServiceSubmit(e: React.FormEvent) {
		e.preventDefault();
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

	async function handleToggleActive(srvId: string) {
		setIsPending(true);
		await toggleServiceActive(srvId, slug);
		setIsPending(false);
	}

	async function handleDeleteService(srvId: string) {
		if (!confirm("¿Eliminar este servicio?")) return;
		setIsPending(true);
		await deleteService(srvId, slug);
		setIsPending(false);
	}

	const filteredServices = selectedCategoryId
		? services.filter((s) => s.categoryId === selectedCategoryId)
		: services;

	return (
		<div className="space-y-6">
			{errorMessage && (
				<div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive font-medium flex justify-between items-center">
					<span>{errorMessage}</span>
					<button
						onClick={() => setErrorMessage(null)}
						className="text-xs underline"
					>
						Cerrar
					</button>
				</div>
			)}

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Catálogo de Servicios
					</h2>
					<p className="text-muted-foreground">
						Administra las categorías, precios y duraciones de tus servicios.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={openNewCategoryDialog}
						className="gap-2"
					>
						<FolderPlus className="h-4 w-4" />
						Nueva Categoría
					</Button>
					<Button onClick={openNewServiceDialog} className="gap-2">
						<Plus className="h-4 w-4" />
						Nuevo Servicio
					</Button>
				</div>
			</div>

			{/* Category Tabs */}
			<div className="flex flex-wrap items-center gap-2 border-b pb-3">
				<button
					onClick={() => setSelectedCategoryId(null)}
					className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
						selectedCategoryId === null
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground hover:bg-accent"
					}`}
				>
					Todos ({services.length})
				</button>

				{categories.map((cat) => {
					const count = services.filter((s) => s.categoryId === cat.id).length;
					const isSelected = selectedCategoryId === cat.id;
					return (
						<div key={cat.id} className="flex items-center gap-1">
							<button
								onClick={() => setSelectedCategoryId(cat.id)}
								className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
									isSelected
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground hover:bg-accent"
								}`}
							>
								{cat.name} ({count})
							</button>
							<button
								onClick={() => openEditCategoryDialog(cat)}
								className="text-muted-foreground hover:text-foreground p-1"
								title="Editar categoría"
							>
								<Edit className="h-3.5 w-3.5" />
							</button>
							<button
								onClick={() => handleDeleteCategory(cat.id)}
								className="text-muted-foreground hover:text-destructive p-1"
								title="Eliminar categoría"
							>
								<Trash2 className="h-3.5 w-3.5" />
							</button>
						</div>
					);
				})}
			</div>

			{/* Services Grid */}
			{filteredServices.length === 0 ? (
				<Card className="p-8 text-center">
					<p className="text-muted-foreground">
						No hay servicios registrados en esta categoría.
					</p>
					<Button onClick={openNewServiceDialog} className="mt-4 gap-2">
						<Plus className="h-4 w-4" />
						Crear primer servicio
					</Button>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{filteredServices.map((srv) => {
						const priceNum =
							typeof srv.price === "object" && "toNumber" in srv.price
								? srv.price.toNumber()
								: Number(srv.price);
						const categoryName =
							categories.find((c) => c.id === srv.categoryId)?.name ||
							"Sin Categoría";

						return (
							<Card
								key={srv.id}
								className={!srv.isActive ? "opacity-70 bg-muted/30" : ""}
							>
								<CardHeader className="pb-2">
									<div className="flex items-start justify-between gap-2">
										<div>
											<CardTitle className="text-lg font-bold">
												{srv.name}
											</CardTitle>
											<span className="text-xs text-muted-foreground font-medium">
												{categoryName}
											</span>
										</div>
										<Badge variant={srv.isActive ? "default" : "secondary"}>
											{srv.isActive ? "Activo" : "Inactivo"}
										</Badge>
									</div>
									{srv.description && (
										<p className="text-sm text-muted-foreground line-clamp-2 mt-1">
											{srv.description}
										</p>
									)}
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center justify-between border-t pt-3">
										<div>
											<p className="text-2xl font-bold text-primary">
												${priceNum.toFixed(2)}
											</p>
											{priceNum === 0 && (
												<span className="text-[10px] text-destructive font-semibold">
													No se muestra al cliente
												</span>
											)}
										</div>
										<div className="text-right text-xs text-muted-foreground">
											<p>
												<span className="font-semibold text-foreground">
													{srv.durationMinutes} min
												</span>{" "}
												servicio
											</p>
											<p>
												<span className="font-semibold text-foreground">
													{srv.bufferMinutes} min
												</span>{" "}
												descanso
											</p>
										</div>
									</div>

									<div className="flex items-center justify-end gap-2 border-t pt-2">
										<Button
											size="sm"
											variant="ghost"
											onClick={() => handleToggleActive(srv.id)}
											disabled={isPending}
											title={srv.isActive ? "Desactivar" : "Activar"}
										>
											{srv.isActive ? (
												<XCircle className="h-4 w-4 text-muted-foreground" />
											) : (
												<CheckCircle className="h-4 w-4 text-emerald-600" />
											)}
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => openEditServiceDialog(srv)}
											disabled={isPending}
										>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											size="sm"
											variant="ghost"
											className="text-destructive hover:text-destructive"
											onClick={() => handleDeleteService(srv.id)}
											disabled={isPending}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Category Dialog */}
			<Dialog
				open={isCategoryDialogOpen}
				onOpenChange={setIsCategoryDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingCategory ? "Editar Categoría" : "Nueva Categoría"}
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCategorySubmit} className="space-y-4">
						<div>
							<Label htmlFor="cat-name">Nombre de Categoría</Label>
							<Input
								id="cat-name"
								value={categoryName}
								onChange={(e) => setCategoryName(e.target.value)}
								placeholder="ej: Cortes, Coloración, Manicura"
								required
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCategoryDialogOpen(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={isPending}>
								{editingCategory ? "Guardar Cambios" : "Crear Categoría"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Service Dialog */}
			<Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editingService ? "Editar Servicio" : "Nuevo Servicio"}
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleServiceSubmit} className="space-y-4">
						<div>
							<Label htmlFor="srv-name">Nombre del Servicio *</Label>
							<Input
								id="srv-name"
								value={serviceName}
								onChange={(e) => setServiceName(e.target.value)}
								placeholder="ej: Corte Caballero, Balayage"
								required
							/>
						</div>

						<div>
							<Label htmlFor="srv-cat">Categoría</Label>
							<select
								id="srv-cat"
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								value={serviceCategory}
								onChange={(e) => setServiceCategory(e.target.value)}
							>
								<option value="">-- Sin Categoría --</option>
								{categories.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<Label htmlFor="srv-desc">Descripción</Label>
							<Input
								id="srv-desc"
								value={serviceDescription}
								onChange={(e) => setServiceDescription(e.target.value)}
								placeholder="Detalle o productos incluidos..."
							/>
						</div>

						<div className="grid grid-cols-3 gap-3">
							<div>
								<Label htmlFor="srv-price">Precio ($)</Label>
								<Input
									id="srv-price"
									type="number"
									step="0.01"
									min="0"
									value={servicePrice}
									onChange={(e) => setServicePrice(e.target.value)}
									required
								/>
							</div>

							<div>
								<Label htmlFor="srv-dur">Duración (min)</Label>
								<Input
									id="srv-dur"
									type="number"
									min="1"
									value={serviceDuration}
									onChange={(e) => setServiceDuration(e.target.value)}
									required
								/>
							</div>

							<div>
								<Label htmlFor="srv-buf">Descanso (min)</Label>
								<Input
									id="srv-buf"
									type="number"
									min="0"
									value={serviceBuffer}
									onChange={(e) => setServiceBuffer(e.target.value)}
									required
								/>
							</div>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsServiceDialogOpen(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={isPending}>
								{editingService ? "Guardar Cambios" : "Crear Servicio"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
