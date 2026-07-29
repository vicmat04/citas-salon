import { ReactNode } from "react";
import Link from "next/link";
import {
	LayoutDashboard,
	Settings,
	Store,
	Users,
	Menu,
	LogOut,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/helpers";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

function NavLinks() {
	return (
		<nav className="p-4 space-y-2 flex-1">
			<Link
				href="/admin/dashboard"
				className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
			>
				<LayoutDashboard className="h-4 w-4" />
				Dashboard
			</Link>
			<Link
				href="/admin/salons"
				className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
			>
				<Store className="h-4 w-4" />
				Salones
			</Link>
			<Link
				href="/admin/users"
				className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground opacity-50 cursor-not-allowed"
			>
				<Users className="h-4 w-4" />
				Usuarios
			</Link>
			<Link
				href="/admin/settings"
				className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground opacity-50 cursor-not-allowed"
			>
				<Settings className="h-4 w-4" />
				Configuración
			</Link>
		</nav>
	);
}

export default async function AdminLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireAdmin();

	return (
		<div className="flex min-h-screen bg-background">
			{/* Desktop Sidebar */}
			<aside className="w-64 border-r bg-card hidden md:flex flex-col">
				<div className="h-16 flex items-center px-6 border-b">
					<span className="font-bold text-lg text-primary">
						Citas Glam Admin
					</span>
				</div>
				<NavLinks />
				<div className="p-4 border-t">
					<form action={signOut}>
						<Button
							variant="ghost"
							className="w-full justify-start gap-3"
							type="submit"
						>
							<LogOut className="h-4 w-4" />
							Cerrar Sesión
						</Button>
					</form>
				</div>
			</aside>

			{/* Main Content */}
			<main className="flex-1 flex flex-col">
				<header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6">
					<div className="flex items-center gap-4 md:hidden">
						<Sheet>
							<SheetTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
								<Menu className="h-5 w-5" />
								<span className="sr-only">Toggle navigation</span>
							</SheetTrigger>
							<SheetContent side="left" className="w-64 p-0 flex flex-col">
								<SheetHeader className="h-16 flex flex-row items-center px-6 border-b">
									<SheetTitle className="text-primary text-lg">
										Citas Glam Admin
									</SheetTitle>
								</SheetHeader>
								<NavLinks />
								<div className="p-4 border-t mt-auto">
									<form action={signOut}>
										<Button
											variant="ghost"
											className="w-full justify-start gap-3"
											type="submit"
										>
											<LogOut className="h-4 w-4" />
											Cerrar Sesión
										</Button>
									</form>
								</div>
							</SheetContent>
						</Sheet>
						<h1 className="text-lg font-semibold">Admin</h1>
					</div>

					<div className="ml-auto flex items-center gap-4">
						<div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
							AD
						</div>
					</div>
				</header>
				<div className="flex-1 p-4 md:p-6 overflow-auto">{children}</div>
			</main>
		</div>
	);
}
