"use client";

import { Mail, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
	extendSalonTrial,
	sendTrialExpirationNotice,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

const EXTENSION_OPTIONS = [7, 14, 30] as const;

export function TrialQuickActions({
	salonId,
	salonName,
}: {
	salonId: string;
	salonName: string;
}) {
	const router = useRouter();
	const [feedback, setFeedback] = useState<{
		tone: "success" | "error";
		message: string;
	} | null>(null);
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function extendTrial(days: (typeof EXTENSION_OPTIONS)[number]) {
		setFeedback(null);
		setPendingAction(`extend-${days}`);
		startTransition(async () => {
			try {
				const result = await extendSalonTrial(salonId, days);
				if (!result.ok) {
					setFeedback({ tone: "error", message: result.message });
					return;
				}

				setFeedback({
					tone: "success",
					message: `Trial extendido por ${days} días.`,
				});
				router.refresh();
			} catch {
				setFeedback({
					tone: "error",
					message: "No fue posible extender el período de prueba.",
				});
			} finally {
				setPendingAction(null);
			}
		});
	}

	function sendNotice() {
		setFeedback(null);
		setPendingAction("email");
		startTransition(async () => {
			try {
				const result = await sendTrialExpirationNotice(salonId);
				if (!result.ok) {
					setFeedback({ tone: "error", message: result.message });
					return;
				}

				setFeedback({
					tone: "success",
					message: "Notificación enviada.",
				});
			} catch {
				setFeedback({
					tone: "error",
					message: "No fue posible enviar la notificación.",
				});
			} finally {
				setPendingAction(null);
			}
		});
	}

	return (
		<div className="space-y-2" aria-busy={isPending}>
			<div className="flex flex-wrap gap-2">
				{EXTENSION_OPTIONS.map((days) => (
					<Button
						key={days}
						type="button"
						variant="outline"
						size="sm"
						disabled={isPending}
						onClick={() => extendTrial(days)}
						aria-label={`Extender el trial de ${salonName} por ${days} días`}
					>
						<Plus />
						{pendingAction === `extend-${days}`
							? "Procesando…"
							: `${days} días`}
					</Button>
				))}
				<Button
					type="button"
					size="sm"
					disabled={isPending}
					onClick={sendNotice}
					aria-label={`Enviar aviso de vencimiento a ${salonName}`}
				>
					<Mail />
					{pendingAction === "email" ? "Enviando…" : "Enviar correo"}
				</Button>
			</div>
			<p
				className={`min-h-4 text-xs ${
					feedback?.tone === "error" ? "text-destructive" : "text-emerald-600"
				}`}
				aria-live="polite"
			>
				{feedback?.message}
			</p>
		</div>
	);
}
