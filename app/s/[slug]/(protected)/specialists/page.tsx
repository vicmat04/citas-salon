import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { CreateSpecialistDialog } from "./create-specialist-dialog"

export default async function SalonSpecialistsPage({ params }: { params: { slug: string } }) {
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
    include: { specialists: { orderBy: { createdAt: 'desc' } } }
  })

  if (!salon) return notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Especialistas</h2>
          <p className="text-muted-foreground">Tu equipo de profesionales.</p>
        </div>
        <CreateSpecialistDialog salonId={salon.id} slug={params.slug} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {salon.specialists.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No tienes especialistas registrados. Añade uno para comenzar a recibir citas.
          </div>
        )}
        {salon.specialists.map(spc => (
          <Card key={spc.id}>
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {spc.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg">{spc.name}</h3>
                <p className="text-muted-foreground">{spc.specialty || 'Sin especialidad'}</p>
              </div>
              <Badge variant={spc.isActive ? 'default' : 'secondary'}>
                {spc.isActive ? 'Disponible' : 'No disponible'}
              </Badge>
              <Button variant="outline" className="w-full">Gestionar Horarios</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
