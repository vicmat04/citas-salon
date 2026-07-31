import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/appointments", () => ({
	updateAppointmentStatus: vi.fn(),
}));

import {
	AppointmentsView,
	filterAppointmentsForAgenda,
} from "./appointments-view";

const today = new Date().toISOString().slice(0, 10);

const appointment = {
	id: "appt-1",
	appointmentDate: today,
	startTime: "09:00",
	endTime: "10:00",
	status: "confirmed",
	source: "public_booking",
	customerNotes: null,
	internalNotes: null,
	totalPriceSnapshot: 25,
	totalDurationMinutes: 60,
	customer: {
		id: "customer-1",
		fullName: "Ana Cliente",
		phone: "+50760000000",
		email: null,
	},
	specialist: {
		id: "specialist-1",
		name: "Luis",
	},
	appointmentServices: [
		{
			service: {
				id: "service-1",
				name: "Corte",
			},
			priceSnapshot: 25,
			durationSnapshot: 60,
		},
	],
	notifications: [],
};

describe("AppointmentsView", () => {
	it("filters all appointments without restricting to today's date", () => {
		const futureAppointment = {
			...appointment,
			id: "appt-2",
			appointmentDate: "2099-01-01",
			customer: {
				...appointment.customer,
				id: "customer-2",
				fullName: "Bea Cliente",
			},
		};

		expect(
			filterAppointmentsForAgenda({
				appointments: [appointment, futureAppointment],
				todayStr: today,
				selectedTab: "all",
				calendarDate: null,
				filterSpecialistId: "all",
				filterStatus: "all",
			}).map((item) => item.id),
		).toEqual(["appt-1", "appt-2"]);
	});

	it("keeps compact agenda controls including the all-appointments view", () => {
		const markup = renderToStaticMarkup(
			<AppointmentsView
				slug="acme"
				appointments={[appointment]}
				specialists={[{ id: "specialist-1", name: "Luis" }]}
				services={[
					{
						id: "service-1",
						name: "Corte",
						price: 25,
						durationMinutes: 60,
					},
				]}
			/>,
		);

		expect(markup).toContain("Citas de hoy");
		expect(markup).toContain("Próximas");
		expect(markup).toContain("Calendario");
		expect(markup).toContain("Todas");
		expect(markup).toContain("Filtros rápidos");
		expect(markup).toContain("Ana Cliente");
	});
});
