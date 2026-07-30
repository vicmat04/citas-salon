import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getDbUser, getUser } from "@/lib/auth/session";

export default async function GeneralLoginPage() {
	const user = await getUser();
	if (user) {
		const dbUser = await getDbUser(user.id);
		if (dbUser?.role === "platform_admin") redirect("/admin/dashboard");
		if (dbUser?.role === "salon_owner") redirect("/my-salons");
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-[400px]">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold text-primary">
						Citas Glam
					</CardTitle>
					<CardDescription>Acceso para propietarios de salones</CardDescription>
				</CardHeader>
				<CardContent>
					<LoginForm submitLabel="Ingresar a mis salones" />
				</CardContent>
				<CardFooter className="flex flex-col gap-3">
					<Link
						href="/registro-salon"
						className={buttonVariants({ variant: "outline" })}
					>
						Registrar mi salón
					</Link>
					<Link
						href="/admin/login"
						className="text-sm text-muted-foreground hover:underline"
					>
						Acceso de administrador
					</Link>
				</CardFooter>
			</Card>
		</div>
	);
}
