import Link from "next/link";
import {
	Calendar,
	CheckCircle,
	Clock,
	MapPin,
	MessageSquare,
	User,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { requireOperationalPublicSalon } from "@/lib/salons/lifecycle";
import prisma from "@/lib/db";
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
				.map((as) => as.service?.name || "Servicio")
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

	// Build WhatsApp Message sent by client from their phone
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
			`Envío este mensaje como constancia de mi reserva. ¡Muchas gracias!`,
	);

	const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`;

	return (
		<div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 flex items-center justify-center">
			<Card className="max-w-md w-full border-primary/20 shadow-lg">
				<CardHeader className="text-center pb-2">
					<div className="flex justify-center mb-4">
						<CheckCircle className="h-16 w-16 text-primary" />
					</div>
					<CardTitle className="text-2xl font-bold">
						¡Cita Confirmada!
					</CardTitle>
					<CardDescription>
						Tu reserva en{" "}
						<span className="font-semibold text-foreground capitalize">
							{salon.name}
						</span>{" "}
						fue registrada con éxito.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6 pt-4">
					<div className="bg-muted rounded-lg p-4 space-y-3 border">
						<div className="flex items-center gap-3">
							<Calendar className="h-5 w-5 text-primary" />
							<div>
								<p className="text-sm font-semibold capitalize">
									{formattedDate}
								</p>
								<p className="text-xs text-muted-foreground">Fecha reservada</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Clock className="h-5 w-5 text-primary" />
							<div>
								<p className="text-sm font-semibold">
									{formattedTime} hrs ({appointment?.totalDurationMinutes || 0}{" "}
									min)
								</p>
								<p className="text-xs text-muted-foreground">{serviceNames}</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<User className="h-5 w-5 text-primary" />
							<div>
								<p className="text-sm font-semibold">{specialistName}</p>
								<p className="text-xs text-muted-foreground">
									Profesional asignado
								</p>
							</div>
						</div>
						{salon.address && (
							<div className="flex items-center gap-3">
								<MapPin className="h-5 w-5 text-primary" />
								<div>
									<p className="text-sm font-semibold">{salon.address}</p>
									<p className="text-xs text-muted-foreground">
										Ubicación del salón
									</p>
								</div>
							</div>
						)}
						<div className="border-t pt-2 mt-2 flex justify-between items-center text-sm">
							<span className="font-medium text-muted-foreground">
								Total a pagar en el salón:
							</span>
							<span className="font-bold text-lg text-primary">
								${totalPriceNum.toFixed(2)}
							</span>
						</div>
					</div>

					<div className="text-center space-y-2">
						<p className="text-sm font-semibold">
							Envía la constancia por WhatsApp
						</p>
						<p className="text-xs text-muted-foreground">
							Haz clic en el botón para enviar los detalles de la cita
							directamente al WhatsApp del salón desde tu teléfono.
						</p>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col gap-3">
					<Link
						href={whatsappUrl}
						target="_blank"
						className={buttonVariants({
							size: "lg",
							className:
								"w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold",
						})}
					>
						<MessageSquare className="mr-2 h-5 w-5" />
						Enviar Constancia por WhatsApp
					</Link>
					<Link
						href={`/${slug}`}
						className={buttonVariants({
							variant: "ghost",
							className: "w-full",
						})}
					>
						Volver a la página del salón
					</Link>
				</CardFooter>
			</Card>
		</div>
	);
}
