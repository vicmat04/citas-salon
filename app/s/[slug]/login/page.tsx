import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default async function SalonLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary capitalize">{slug.replace('-', ' ')}</CardTitle>
          <CardDescription>Acceso para propietarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="propietario@salon.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Link href={`/s/${slug}/dashboard`} className={buttonVariants({ className: "w-full" })}>
            Ingresar al panel
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            Volver a la plataforma
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
