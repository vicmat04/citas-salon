import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Scissors } from "lucide-react"
import Link from "next/link"
import { mockSalonInfo, mockServices } from "@/lib/mock-data"

export default function PublicSalonLandingPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-primary/10 py-16 px-4 text-center">
        <div className="h-24 w-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Scissors className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 capitalize">
          {params.slug.replace('-', ' ')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto mb-8">
          {mockSalonInfo.slogan}
        </p>
        <Link href={`/book/${params.slug}`} className={buttonVariants({ size: "lg", className: "rounded-full px-8" })}>
          Reservar Cita Ahora
        </Link>
      </div>

      {/* Info Section */}
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <MapPin className="h-5 w-5" />
          <span>{mockSalonInfo.address}</span>
        </div>

        {/* Services Highlight */}
        <div>
          <h2 className="text-2xl font-bold text-center mb-8">Nuestros Servicios</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {mockServices.map(srv => (
              <Card key={srv.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{srv.name}</h3>
                    <p className="text-sm text-muted-foreground">{srv.duration} min</p>
                  </div>
                  <div className="font-bold text-primary">
                    ${srv.price.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link href={`/book/${params.slug}`} className={buttonVariants({ size: "lg", className: "rounded-full px-8 w-full sm:w-auto" })}>
            Agenda tu visita
          </Link>
        </div>
      </div>
    </div>
  )
}
