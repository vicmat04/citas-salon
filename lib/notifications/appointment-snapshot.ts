import "server-only";

import type { AppointmentNotificationSnapshot } from "./types";

interface SnapshotInput {
	salonName: string;
	timezone: string;
	customerName: string;
	appointmentDate: Date;
	startTime: Date;
	endTime: Date;
	services: Array<{
		name: string;
		price: { toString(): string } | number | string;
	}>;
	specialistName?: string | null;
	total: { toString(): string } | number | string;
	cancellationReason?: string | null;
}

export function buildAppointmentSnapshot(
	input: SnapshotInput,
): AppointmentNotificationSnapshot {
	const date = new Intl.DateTimeFormat("es-PA", {
		dateStyle: "long",
		timeZone: input.timezone,
	}).format(input.appointmentDate);
	const time = (value: Date) =>
		new Intl.DateTimeFormat("es-PA", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: "UTC",
		}).format(value);
	const money = (value: SnapshotInput["total"]) =>
		new Intl.NumberFormat("es-PA", {
			style: "currency",
			currency: "USD",
		}).format(Number(value));

	return {
		salonName: input.salonName,
		customerName: input.customerName,
		appointmentDate: date,
		startTime: time(input.startTime),
		endTime: time(input.endTime),
		services: input.services.map((service) => ({
			name: service.name,
			price: money(service.price),
		})),
		specialistName: input.specialistName || undefined,
		total: money(input.total),
		cancellationReason: input.cancellationReason || undefined,
	};
}
