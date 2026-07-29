import Link from "next/link";
import { MapPin, Phone, Scissors, Clock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOperationalPublicSalon } from "@/lib/salons/lifecycle";
import prisma from "@/lib/db";

export default async function PublicSalonLandingPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const salon = await requireOperationalPublicSalon(slug);

	const [categories, services] = await Promise.all([
		prisma.serviceCategory.findMany({
			where: { salonId: salon.id },
			orderBy: { sortOrder: "asc" },
		}),
		prisma.service.findMany({
			where: { salonId: salon.id, isActive: true, price: { gt: 0 } },
			orderBy: { name: "asc" },
		}),
	]);

	return (
		<div className="min-h-screen bg-background">
			{/* Hero Section */}
			<div
				className="py-16 px-4 text-center border-b"
				style={{ backgroundColor: `${salon.themeColor || "#D4AF37"}15` }}
			>
				<div
					className="h-24 w-24 mx-auto rounded-full flex items-center justify-center mb-6"
					style={{ backgroundColor: `${salon.themeColor || "#D4AF37"}30` }}
				>
					{salon.logoUrl ? (
						// The logo URL is tenant-provided and may not match configured Next Image hosts.
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={salon.logoUrl}
							alt={salon.name}
							className="h-20 w-20 rounded-full object-cover"
						/>
					) : (
						<Scissors className="h-10 w-10 text-primary" />
					)}
				</div>
				<h1 className="text-4xl font-extrabold tracking-tight mb-3 capitalize">
					{salon.name}
				</h1>
				{salon.slogan && (
					<p className="text-lg text-muted-foreground max-w-lg mx-auto mb-6">
						{salon.slogan}
					</p>
				)}
				<Link
					href={`/book/${slug}`}
					className={buttonVariants({
						size: "lg",
						className: "rounded-full px-8 font-bold",
					})}
				>
					Reservar Cita Ahora
				</Link>
			</div>

			{/* Info Section */}
			<div className="max-w-4xl mx-auto py-12 px-4 space-y-10">
				<div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
					{salon.address && (
						<div className="flex items-center gap-2">
							<MapPin className="h-4 w-4 text-primary" />
							<span>{salon.address}</span>
						</div>
					)}
					{salon.phone && (
						<div className="flex items-center gap-2">
							<Phone className="h-4 w-4 text-primary" />
							<span>
								{salon.phoneCountryCode} {salon.phone}
							</span>
						</div>
					)}
				</div>

				{/* Services Highlight */}
				<div>
					<h2 className="text-2xl font-bold text-center mb-8">
						Nuestros Servicios
					</h2>

					{services.length === 0 ? (
						<Card className="p-8 text-center text-muted-foreground">
							Este salón aún no ha publicado servicios con precio.
						</Card>
					) : (
						<div className="space-y-6">
							{categories.map((cat) => {
								const catServices = services.filter(
									(s) => s.categoryId === cat.id,
								);
								if (catServices.length === 0) return null;
								return (
									<div key={cat.id} className="space-y-3">
										<h3 className="text-lg font-bold border-b pb-1 text-primary">
											{cat.name}
										</h3>
										<div className="grid gap-3 sm:grid-cols-2">
											{catServices.map((srv) => {
												const priceNum =
													typeof srv.price === "object" &&
													"toNumber" in srv.price
														? srv.price.toNumber()
														: Number(srv.price);
												return (
													<Card
														key={srv.id}
														className="border border-border/60"
													>
														<CardContent className="p-4 flex items-center justify-between">
															<div>
																<h4 className="font-semibold">{srv.name}</h4>
																{srv.description && (
																	<p className="text-xs text-muted-foreground line-clamp-1">
																		{srv.description}
																	</p>
																)}
																<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
																	<Clock className="h-3 w-3" />{" "}
																	{srv.durationMinutes} min
																</p>
															</div>
															<div className="font-bold text-lg text-primary">
																${priceNum.toFixed(2)}
															</div>
														</CardContent>
													</Card>
												);
											})}
										</div>
									</div>
								);
							})}

							{/* Uncategorized Services */}
							{services.some((s) => !s.categoryId) && (
								<div className="space-y-3">
									<h3 className="text-lg font-bold border-b pb-1 text-primary">
										Otros Servicios
									</h3>
									<div className="grid gap-3 sm:grid-cols-2">
										{services
											.filter((s) => !s.categoryId)
											.map((srv) => {
												const priceNum =
													typeof srv.price === "object" &&
													"toNumber" in srv.price
														? srv.price.toNumber()
														: Number(srv.price);
												return (
													<Card
														key={srv.id}
														className="border border-border/60"
													>
														<CardContent className="p-4 flex items-center justify-between">
															<div>
																<h4 className="font-semibold">{srv.name}</h4>
																<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
																	<Clock className="h-3 w-3" />{" "}
																	{srv.durationMinutes} min
																</p>
															</div>
															<div className="font-bold text-lg text-primary">
																${priceNum.toFixed(2)}
															</div>
														</CardContent>
													</Card>
												);
											})}
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				<div className="text-center pt-4">
					<Link
						href={`/book/${slug}`}
						className={buttonVariants({
							size: "lg",
							className: "rounded-full px-8 w-full sm:w-auto font-bold",
						})}
					>
						Agenda tu visita
					</Link>
				</div>
			</div>
		</div>
	);
}
