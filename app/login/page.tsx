import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, ShieldCheck } from "lucide-react"
import Link from "next/link"

export default function GeneralLoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Citas Salón</CardTitle>
          <CardDescription>Selecciona tu portal de acceso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/admin/login" className={buttonVariants({ variant: "outline", className: "w-full h-16 flex items-center justify-start gap-4" })}>
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div className="text-left">
              <div className="font-semibold">Administrador</div>
              <div className="text-xs text-muted-foreground">Plataforma SaaS</div>
            </div>
          </Link>

          <Link href="/s/demo/login" className={buttonVariants({ variant: "outline", className: "w-full h-16 flex items-center justify-start gap-4" })}>
            <Store className="h-6 w-6 text-primary" />
            <div className="text-left">
              <div className="font-semibold">Propietario de Salón</div>
              <div className="text-xs text-muted-foreground">Ejemplo: /s/demo/login</div>
            </div>
          </Link>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-6 mt-2">
          <p className="text-sm text-muted-foreground text-center">
            ¿Eres cliente buscando reservar? <br/> Pídele a tu salón su enlace personalizado.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
