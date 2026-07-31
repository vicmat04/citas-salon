import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Scissors, Users } from "lucide-react";
import {
	mockAppointments,
	mockServices,
	mockSpecialists,
} from "@/lib/mock-data";
import { PublicLinkActions } from "./public-link-actions";

export default async function SalonDashboardPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Inicio</h2>
					<p className="text-muted-foreground">Resumen de tu salón.</p>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Citas de hoy</CardTitle>
						<Calendar className="h-4 w-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{mockAppointments.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total de servicios
						</CardTitle>
						<Scissors className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{mockServices.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total de especialistas
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{mockSpecialists.length}</div>
					</CardContent>
				</Card>
			</div>

			<div className="flex justify-end">
				<PublicLinkActions href={`/book/${slug}`} />
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				<Card className="col-span-4">
					<CardHeader>
						<CardTitle>Citas Recientes</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{mockAppointments.map((app) => (
								<div
									key={app.id}
									className="flex items-center justify-between p-4 border rounded-lg"
								>
									<div>
										<p className="font-medium">{app.customerName}</p>
										<p className="text-sm text-muted-foreground">
											{app.serviceNames.join(", ")}
										</p>
									</div>
									<div className="text-right">
										<p className="font-bold">{app.startTime}</p>
										<p className="text-sm text-muted-foreground capitalize">
											{app.status}
										</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
