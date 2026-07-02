import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { mockServices } from "@/lib/mock-data"

export default async function PublicBookingWizardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold capitalize">{slug.replace('-', ' ')}</h1>
          <p className="text-muted-foreground mt-2">Paso 1: Selecciona tus servicios</p>
        </div>

        {/* Pasos Mock */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Badge className="h-8 w-8 rounded-full flex items-center justify-center p-0">1</Badge>
          <div className="h-1 w-8 bg-border"></div>
          <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center p-0 text-muted-foreground">2</Badge>
          <div className="h-1 w-8 bg-border"></div>
          <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center p-0 text-muted-foreground">3</Badge>
        </div>

        {/* Lista de Servicios */}
        <Card>
          <CardHeader>
            <CardTitle>Servicios Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockServices.map((srv, idx) => (
              <div key={srv.id} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${idx === 0 ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {srv.name}
                    {idx === 0 && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </h3>
                  <p className="text-sm text-muted-foreground">{srv.duration} min</p>
                </div>
                <div className="font-bold">
                  ${srv.price.toFixed(2)}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Link href={`/book/${slug}/confirmacion`} className={buttonVariants({ className: "w-full", size: "lg" })}>
              Continuar a Confirmación
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
