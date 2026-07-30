import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Scissors, CalendarCheck, TrendingUp } from "lucide-react";

export default function PlatformLandingPage() {
	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Navbar */}
			<header className="h-16 border-b flex items-center justify-between px-6 lg:px-12 bg-card">
				<div className="flex items-center gap-2 font-bold text-xl text-primary">
					<Scissors className="h-6 w-6" />
					<span>Citas Glam</span>
				</div>
				<nav className="flex items-center gap-4">
					<Link
						href="/login"
						className="text-sm font-medium hover:underline text-muted-foreground"
					>
						Ingresar
					</Link>
					<Link
						href="/registro-salon"
						className={buttonVariants({ variant: "default" })}
					>
						Registrar mi Salón
					</Link>
				</nav>
			</header>

			{/* Hero Section */}
			<main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-24 bg-gradient-to-b from-primary/10 to-background">
				<h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6">
					La forma inteligente de gestionar tu{" "}
					<span className="text-primary">Salón</span>
				</h1>
				<p className="text-xl text-muted-foreground max-w-2xl mb-10">
					Digitaliza tu agenda, automatiza recordatorios por WhatsApp y haz
					crecer tu negocio de belleza, barbería o estética con nuestra
					plataforma All-in-One.
				</p>
				<div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
					<Link
						href="/registro-salon"
						className={buttonVariants({
							size: "lg",
							className: "w-full sm:w-auto rounded-full px-8",
						})}
					>
						Empieza Gratis Hoy
					</Link>
					<Link
						href="/login"
						className={buttonVariants({
							variant: "outline",
							size: "lg",
							className: "w-full sm:w-auto rounded-full px-8",
						})}
					>
						Ya tengo una cuenta
					</Link>
				</div>

				{/* Feature Highlights */}
				<div className="grid sm:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto text-left">
					<div className="space-y-3 bg-card p-6 rounded-xl border shadow-sm">
						<div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
							<CalendarCheck className="h-6 w-6 text-primary" />
						</div>
						<h3 className="font-bold text-lg">Agenda 24/7</h3>
						<p className="text-muted-foreground text-sm">
							Tus clientes pueden reservar a cualquier hora desde su celular con
							tu enlace personalizado.
						</p>
					</div>
					<div className="space-y-3 bg-card p-6 rounded-xl border shadow-sm">
						<div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
							<Scissors className="h-6 w-6 text-primary" />
						</div>
						<h3 className="font-bold text-lg">Especialistas y Servicios</h3>
						<p className="text-muted-foreground text-sm">
							Organiza tu menú de servicios y los horarios de todo tu equipo en
							un solo lugar.
						</p>
					</div>
					<div className="space-y-3 bg-card p-6 rounded-xl border shadow-sm">
						<div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
							<TrendingUp className="h-6 w-6 text-primary" />
						</div>
						<h3 className="font-bold text-lg">Crece tu Negocio</h3>
						<p className="text-muted-foreground text-sm">
							Reduce las ausencias con recordatorios automatizados y mantén tu
							agenda siempre llena.
						</p>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="border-t py-8 text-center text-sm text-muted-foreground">
				<p>
					&copy; {new Date().getFullYear()} Citas Glam. Todos los derechos
					reservados.
				</p>
			</footer>
		</div>
	);
}
