import { requireOperationalPublicSalon } from "@/lib/salons/lifecycle";
import prisma from "@/lib/db";
import { BookingWizard } from "./booking-wizard";

export default async function PublicBookingWizardPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const salon = await requireOperationalPublicSalon(slug);

	const [services, specialists] = await Promise.all([
		prisma.service.findMany({
			where: { salonId: salon.id, isActive: true, price: { gt: 0 } },
			orderBy: { name: "asc" },
		}),
		prisma.specialist.findMany({
			where: { salonId: salon.id, isActive: true },
			select: { id: true, name: true, specialty: true },
			orderBy: { name: "asc" },
		}),
	]);

	const serializedServices = services.map((s) => ({
		...s,
		price: s.price.toNumber(),
	}));

	return (
		<BookingWizard
			slug={slug}
			salonName={salon.name}
			bookingRangeDays={salon.bookingRangeDays || 15}
			services={serializedServices}
			specialists={specialists}
		/>
	);
}
