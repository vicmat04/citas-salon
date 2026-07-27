import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";
import { SpecialistsView } from "./specialists-view";

export default async function SalonSpecialistsPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const { salon } = await requireSalonOwner(slug);

	const specialists = await prisma.specialist.findMany({
		where: { salonId: salon.id },
		include: {
			specialistServices: {
				select: { serviceId: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});

	const services = await prisma.service.findMany({
		where: { salonId: salon.id, isActive: true },
		orderBy: { name: "asc" },
	});

	const serializedServices = services.map((s) => ({
		...s,
		price: s.price.toNumber(),
	}));

	return (
		<SpecialistsView
			slug={slug}
			specialists={specialists}
			services={serializedServices}
		/>
	);
}
