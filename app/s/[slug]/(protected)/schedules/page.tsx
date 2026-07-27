import { requireSalonOwner } from "@/lib/auth/helpers";
import prisma from "@/lib/db";
import { dateToTimeString } from "@/lib/salons/schedules";
import { SchedulesView } from "./schedules-view";

export default async function SalonSchedulesPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const { salon } = await requireSalonOwner(slug);

	const businessHours = await prisma.businessHours.findMany({
		where: { salonId: salon.id },
	});

	const specialistHours = await prisma.specialistHours.findMany({
		where: { salonId: salon.id },
	});

	const specialists = await prisma.specialist.findMany({
		where: { salonId: salon.id },
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});

	const blockedDates = await prisma.blockedDate.findMany({
		where: { salonId: salon.id },
		orderBy: { date: "asc" },
	});

	const blockedSlots = await prisma.blockedSlot.findMany({
		where: { salonId: salon.id },
		orderBy: { date: "asc" },
	});

	const formattedBusinessHours = businessHours.map((bh) => ({
		...bh,
		openTime: dateToTimeString(bh.openTime),
		closeTime: dateToTimeString(bh.closeTime),
	}));

	const formattedSpecialistHours = specialistHours.map((sh) => ({
		...sh,
		openTime: dateToTimeString(sh.openTime),
		closeTime: dateToTimeString(sh.closeTime),
	}));

	const formattedBlockedDates = blockedDates.map((bd) => ({
		...bd,
		date: bd.date.toISOString(),
	}));

	const formattedBlockedSlots = blockedSlots.map((bs) => ({
		...bs,
		date: bs.date.toISOString(),
		startTime: dateToTimeString(bs.startTime),
		endTime: dateToTimeString(bs.endTime),
	}));

	return (
		<SchedulesView
			slug={slug}
			businessHours={formattedBusinessHours}
			specialistHours={formattedSpecialistHours}
			specialists={specialists}
			blockedDates={formattedBlockedDates}
			blockedSlots={formattedBlockedSlots}
		/>
	);
}
