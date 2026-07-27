import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { CheckCircle, Calendar, Clock, MapPin, MessageSquare } from "lucide-react"
import Link from "next/link"
import { mockSalonInfo } from "@/lib/mock-data"
import { requireOperationalPublicSalon } from "@/lib/salons/lifecycle"

export default async function PublicConfirmationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const salon = await requireOperationalPublicSalon(slug)

  // This confirmation is mock-only. A future booking submission must re-read
  // operational status inside the same authoritative transaction as its writes.
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 flex items-center justify-center">
      <Card className="max-w-md w-full border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl">¡Cita Pre-Reservada!</CardTitle>
          <CardDescription>
            Tu reserva en <span className="font-semibold text-foreground capitalize">{salon.name}</span> casi está lista.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Jueves, 2 de Julio</p>
                <p className="text-xs text-muted-foreground">Fecha seleccionada</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">10:00 AM</p>
                <p className="text-xs text-muted-foreground">Corte de Cabello (45 min)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{mockSalonInfo.address}</p>
                <p className="text-xs text-muted-foreground">Ubicación del salón</p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Confirma por WhatsApp para finalizar</p>
            <p className="text-xs text-muted-foreground">
              El propietario necesita confirmar tu cita. Haz clic en el botón de abajo para enviar los detalles.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Link href="https://wa.me/50760000000?text=Hola!%20Quiero%20confirmar%20mi%20cita%20para%20Corte%20de%20Cabello%20el%20Jueves%20a%20las%2010:00%20AM." target="_blank" className={buttonVariants({ size: "lg", className: "w-full bg-[#25D366] hover:bg-[#20bd5a] text-white" })}>
            <MessageSquare className="mr-2 h-5 w-5" />
            Confirmar por WhatsApp
          </Link>
          <Link href={`/${slug}`} className={buttonVariants({ variant: "ghost", className: "w-full" })}>
            Volver al salón
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
