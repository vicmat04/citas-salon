import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginWithEmail } from "@/app/actions/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Citas Salón</CardTitle>
          <CardDescription>Panel de Administrador</CardDescription>
        </CardHeader>
        <form action={loginWithEmail}>
          <input type="hidden" name="next" value="/admin/dashboard" />
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="admin@citassalon.app" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full">
              Ingresar
            </Button>
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              Volver a la plataforma
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

