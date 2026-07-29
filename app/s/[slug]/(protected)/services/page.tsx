import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";
import { ServicesView } from "./services-view";

export default async function SalonServicesPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const { salon } = await requireSalonOwner(slug);

	const [categories, services] = await Promise.all([
		prisma.serviceCategory.findMany({
			where: { salonId: salon.id },
			orderBy: { sortOrder: "asc" },
		}),
		prisma.service.findMany({
			where: { salonId: salon.id },
			orderBy: { createdAt: "desc" },
		}),
	]);

	// Convert Prisma Decimal fields to plain numbers or string for client serializability
	const serializedServices = services.map((srv) => ({
		...srv,
		price: srv.price.toNumber(),
	}));

	return (
		<ServicesView
			slug={slug}
			categories={categories}
			services={serializedServices}
		/>
	);
}
