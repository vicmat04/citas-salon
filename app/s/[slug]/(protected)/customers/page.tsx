import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";
import { dateToTimeString } from "@/lib/salons/schedules";
import { CustomersView } from "./customers-view";

export default async function SalonCustomersPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const { salon } = await requireSalonOwner(slug);

	const customers = await prisma.customer.findMany({
		where: { salonId: salon.id },
		include: {
			appointments: {
				include: {
					specialist: { select: { name: true } },
					appointmentServices: {
						include: { service: { select: { name: true } } },
					},
				},
				orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
			},
		},
		orderBy: { fullName: "asc" },
	});

	const formattedCustomers = customers.map((cust) => {
		// 1. Calculate totalSpent ONLY from completed appointments
		let totalSpent = 0;
		let completedCount = 0;
		let noShowCount = 0;
		let lastVisitDate: string | null = null;

		const formattedAppointments = cust.appointments.map((appt) => {
			const priceNum =
				typeof appt.totalPriceSnapshot === "object" &&
				"toNumber" in appt.totalPriceSnapshot
					? appt.totalPriceSnapshot.toNumber()
					: Number(appt.totalPriceSnapshot);

			if (appt.status === "completed") {
				totalSpent += priceNum;
				completedCount += 1;
			} else if (appt.status === "no_show") {
				noShowCount += 1;
			}

			const dateStr = appt.appointmentDate.toISOString().slice(0, 10);
			if (
				!lastVisitDate &&
				(appt.status === "completed" || appt.status === "confirmed")
			) {
				lastVisitDate = dateStr;
			}

			const servicesList =
				appt.appointmentServices
					.map((as) => as.service?.name)
					.filter(Boolean)
					.join(", ") || "Servicio";

			return {
				id: appt.id,
				appointmentDate: dateStr,
				startTime: dateToTimeString(appt.startTime),
				status: appt.status,
				totalPriceSnapshot: priceNum,
				specialistName: appt.specialist?.name || "Especialista",
				servicesList,
			};
		});

		return {
			id: cust.id,
			fullName: cust.fullName,
			phone: cust.phone,
			email: cust.email,
			birthday: cust.birthday ? cust.birthday.toISOString() : null,
			notes: cust.notes,
			totalSpent,
			completedCount,
			noShowCount,
			lastVisitDate,
			appointments: formattedAppointments,
		};
	});

	return (
		<CustomersView
			slug={slug}
			salonName={salon.name}
			customers={formattedCustomers}
		/>
	);
}
