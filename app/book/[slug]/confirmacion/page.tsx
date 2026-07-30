import {
	Calendar,
	CheckCircle,
	Clock,
	MapPin,
	MessageSquare,
	User,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import prisma from "@/lib/db";
import { requireOperationalPublicSalon } from "@/lib/salons/lifecycle";
import { dateToTimeString } from "@/lib/salons/schedules";

export default async function PublicConfirmationPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams?: Promise<{ appointmentId?: string }>;
}) {
	const { slug } = await params;
	const resolvedSearchParams = searchParams ? await searchParams : {};
	const { appointmentId } = resolvedSearchParams;
	const salon = await requireOperationalPublicSalon(slug);

	let appointment = null;
	if (appointmentId) {
		appointment = await prisma.appointment.findFirst({
			where: { id: appointmentId, salonId: salon.id },
			include: {
				customer: true,
				specialist: true,
				appointmentServices: {
					include: { service: true },
				},
			},
		});
	}

	const formattedDate = appointment
		? new Date(appointment.appointmentDate).toLocaleDateString("es-ES", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: "Fecha de la cita";
	const formattedTime = appointment
		? dateToTimeString(appointment.startTime)
		: "10:00";
	const serviceNames = appointment
		? appointment.appointmentServices
				.map((appointmentService) =>
					appointmentService.service?.name
						? appointmentService.service.name
						: "Servicio",
				)
				.join(", ")
		: "Servicio";
	const totalPriceNum = appointment
		? typeof appointment.totalPriceSnapshot === "object" &&
			"toNumber" in appointment.totalPriceSnapshot
			? appointment.totalPriceSnapshot.toNumber()
			: Number(appointment.totalPriceSnapshot)
		: 0;
	const customerName = appointment?.customer?.fullName || "Cliente";
	const specialistName =
		appointment?.specialist?.name || "Especialista asignado";

	const whatsappPhone =
		`${salon.phoneCountryCode || "+507"}${salon.phone || "60000000"}`.replace(
			/[^0-9]/g,
			"",
		);
	const whatsappMessage = encodeURIComponent(
		`¡Hola ${salon.name}! Acabo de agendar mi cita en línea (Ref #${appointmentId ? appointmentId.slice(0, 8) : ""}).\n` +
			`📅 Fecha: ${formattedDate} a las ${formattedTime}\n` +
			`💇 Servicio(s): ${serviceNames}\n` +
			`👤 Cliente: ${customerName}\n` +
			"Envío este mensaje como constancia de mi reserva. ¡Muchas gracias!",
	);
	const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`;

	const details = [
		{
			label: "Fecha reservada",
			value: formattedDate,
			icon: Calendar,
			capitalize: true,
		},
		{
			label: serviceNames,
			value: `${formattedTime} hrs (${appointment?.totalDurationMinutes || 0} min)`,
			icon: Clock,
		},
		{
			label: "Profesional asignado",
			value: specialistName,
			icon: User,
		},
	];

	return (
		<div className="flex h-dvh w-full flex-col overflow-hidden bg-muted/30">
			<header className="shrink-0 border-b bg-background/95 pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
				<div className="mx-auto max-w-lg">
					<p className="truncate text-lg font-bold capitalize">{salon.name}</p>
					<p className="text-xs text-muted-foreground">
						Confirmación de reserva
					</p>
				</div>
			</header>

			<main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6 sm:py-8">
				<div className="mx-auto max-w-lg space-y-5">
					<section className="text-center" aria-labelledby="confirmation-title">
						<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
							<CheckCircle className="h-12 w-12 text-primary" />
						</div>
						<h1 id="confirmation-title" className="mt-4 text-2xl font-bold">
							¡Cita confirmada!
						</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Tu reserva fue registrada correctamente. Guarda estos detalles
							para tu visita.
						</p>
					</section>

					<Card className="overflow-hidden border-0 shadow-sm sm:border">
						<CardContent className="p-0">
							<div className="divide-y">
								{details.map(({ label, value, icon: Icon, capitalize }) => (
									<div
										key={label}
										className="flex min-h-16 items-center gap-3 px-4 py-3"
									>
										<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
											<Icon className="h-5 w-5" />
										</span>
										<span className="min-w-0">
											<span
												className={`block break-words text-sm font-semibold ${capitalize ? "capitalize" : ""}`}
											>
												{value}
											</span>
											<span className="block break-words text-xs text-muted-foreground">
												{label}
											</span>
										</span>
									</div>
								))}
								{salon.address && (
									<div className="flex min-h-16 items-center gap-3 px-4 py-3">
										<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
											<MapPin className="h-5 w-5" />
										</span>
										<span className="min-w-0">
											<span className="block break-words text-sm font-semibold">
												{salon.address}
											</span>
											<span className="text-xs text-muted-foreground">
												Ubicación del salón
											</span>
										</span>
									</div>
								)}
							</div>
							<div className="flex min-h-16 items-center justify-between gap-3 border-t bg-primary/5 px-4 py-3">
								<span className="text-sm font-medium text-muted-foreground">
									Total a pagar en el salón
								</span>
								<span className="shrink-0 text-xl font-bold text-primary">
									${totalPriceNum.toFixed(2)}
								</span>
							</div>
						</CardContent>
					</Card>

					<p className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center text-sm">
						Si proporcionaste un correo válido, la confirmación está en proceso.
						También puedes enviar la constancia por WhatsApp.
					</p>
				</div>
			</main>

			<footer className="shrink-0 border-t bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
				<div className="mx-auto grid max-w-lg gap-2 min-[420px]:grid-cols-[1fr_auto]">
					<Link
						href={whatsappUrl}
						target="_blank"
						className={buttonVariants({
							size: "lg",
							className:
								"min-h-11 w-full bg-[#25D366] text-center font-bold whitespace-normal text-white hover:bg-[#20bd5a] active:scale-[0.98]",
						})}
					>
						<MessageSquare className="mr-2 h-5 w-5" />
						Enviar por WhatsApp
					</Link>
					<Link
						href={`/${slug}`}
						className={buttonVariants({
							variant: "outline",
							className: "min-h-11 w-full active:scale-[0.98]",
						})}
					>
						Volver al salón
					</Link>
				</div>
			</footer>
		</div>
	);
}
