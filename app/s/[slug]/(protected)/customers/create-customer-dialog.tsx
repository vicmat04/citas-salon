"use client";

import { useState } from "react";
import { UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCustomer } from "@/app/actions/customers";

export function CreateCustomerDialog({
	slug,
	onSelectExisting,
}: {
	slug: string;
	onSelectExisting?: (customerId: string) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [conflictCustomerId, setConflictCustomerId] = useState<string | null>(
		null,
	);

	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [birthday, setBirthday] = useState("");
	const [notes, setNotes] = useState("");

	function resetForm() {
		setFullName("");
		setPhone("");
		setEmail("");
		setBirthday("");
		setNotes("");
		setErrorMessage(null);
		setConflictCustomerId(null);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsPending(true);
		setErrorMessage(null);
		setConflictCustomerId(null);

		const formData = new FormData();
		formData.set("fullName", fullName);
		formData.set("phone", phone);
		formData.set("email", email);
		formData.set("birthday", birthday);
		formData.set("notes", notes);

		const result = await createCustomer(formData, slug);
		setIsPending(false);

		if (result.conflict) {
			setErrorMessage(
				result.message || "Ya existe un cliente con este teléfono o correo.",
			);
			if (result.existingCustomerId) {
				setConflictCustomerId(result.existingCustomerId);
			}
		} else if (result.error) {
			setErrorMessage(result.error);
		} else {
			setIsOpen(false);
			resetForm();
		}
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				setIsOpen(open);
				if (!open) resetForm();
			}}
		>
			<DialogTrigger>
				<Button className="gap-2 font-bold" type="button">
					<UserPlus className="h-4 w-4" />
					Nuevo Cliente
				</Button>
			</DialogTrigger>

			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Registrar Nuevo Cliente</DialogTitle>
				</DialogHeader>

				{errorMessage && (
					<div className="rounded-md bg-amber-500/15 border border-amber-500/30 p-4 space-y-2 text-sm text-amber-900 font-medium">
						<div className="flex items-start gap-2">
							<AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
							<span>{errorMessage}</span>
						</div>
						{conflictCustomerId && onSelectExisting && (
							<Button
								size="sm"
								variant="outline"
								className="w-full mt-2 font-bold border-amber-500/40 text-amber-900"
								onClick={() => {
									setIsOpen(false);
									onSelectExisting(conflictCustomerId);
								}}
							>
								Abrir Ficha de Cliente Existente
							</Button>
						)}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div>
						<Label htmlFor="c-name">Nombre Completo *</Label>
						<Input
							id="c-name"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="ej: Laura Martínez"
							required
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<Label htmlFor="c-phone">Teléfono / WhatsApp *</Label>
							<Input
								id="c-phone"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder="+507 6000 0000"
								required
							/>
						</div>

						<div>
							<Label htmlFor="c-birthday">Cumpleaños (opcional)</Label>
							<Input
								id="c-birthday"
								type="date"
								value={birthday}
								onChange={(e) => setBirthday(e.target.value)}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="c-email">Correo Electrónico (opcional)</Label>
						<Input
							id="c-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="laura@ejemplo.com"
						/>
					</div>

					<div>
						<Label htmlFor="c-notes">Notas / Preferencias (opcional)</Label>
						<Input
							id="c-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="ej: Alergias, tinte favorito..."
						/>
					</div>

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={isPending}
							className="font-bold gap-2"
						>
							{isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							Guardar Cliente
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
