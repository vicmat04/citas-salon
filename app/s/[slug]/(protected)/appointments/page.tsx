import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";
import { projectAppointmentNotificationEvents } from "@/lib/notifications/observability";
import { dateToTimeString } from "@/lib/salons/schedules";
import { AppointmentsView } from "./appointments-view";

export default async function SalonAppointmentsPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const { salon } = await requireSalonOwner(slug);

	const [appointments, specialists, services] = await Promise.all([
		prisma.appointment.findMany({
			where: { salonId: salon.id },
			include: {
				customer: true,
				specialist: { select: { id: true, name: true } },
				appointmentServices: {
					include: {
						service: { select: { id: true, name: true } },
					},
				},
				notificationEvents: {
					orderBy: { createdAt: "desc" },
					take: 5,
					select: {
						type: true,
						createdAt: true,
						deliveries: {
							select: {
								roles: true,
								status: true,
								resultCode: true,
								recipientMasked: true,
								updatedAt: true,
							},
						},
					},
				},
			},
			orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
		}),
		prisma.specialist.findMany({
			where: { salonId: salon.id, isActive: true },
			select: { id: true, name: true },
			orderBy: { name: "asc" },
		}),
		prisma.service.findMany({
			where: { salonId: salon.id, isActive: true },
			select: { id: true, name: true, price: true, durationMinutes: true },
			orderBy: { name: "asc" },
		}),
	]);

	const formattedAppointments = appointments.map((appt) => {
		const { notificationEvents, ...appointment } = appt;
		return {
			...appointment,
			appointmentDate: appt.appointmentDate.toISOString(),
			startTime: dateToTimeString(appt.startTime),
			endTime: dateToTimeString(appt.endTime),
			totalPriceSnapshot:
				typeof appt.totalPriceSnapshot === "object" &&
				"toNumber" in appt.totalPriceSnapshot
					? appt.totalPriceSnapshot.toNumber()
					: Number(appt.totalPriceSnapshot),
			appointmentServices: appt.appointmentServices.map((as) => ({
				...as,
				priceSnapshot:
					typeof as.priceSnapshot === "object" && "toNumber" in as.priceSnapshot
						? as.priceSnapshot.toNumber()
						: Number(as.priceSnapshot),
			})),
			notifications: projectAppointmentNotificationEvents(notificationEvents),
		};
	});

	const formattedServices = services.map((s) => ({
		...s,
		price:
			typeof s.price === "object" && "toNumber" in s.price
				? s.price.toNumber()
				: Number(s.price),
	}));

	return (
		<AppointmentsView
			slug={slug}
			appointments={formattedAppointments}
			specialists={specialists}
			services={formattedServices}
		/>
	);
}
