import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { mockSpecialists } from "@/lib/mock-data"

export default function SalonSpecialistsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Especialistas</h2>
          <p className="text-muted-foreground">Tu equipo de profesionales.</p>
        </div>
        <Button>Añadir Especialista</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockSpecialists.map(spc => (
          <Card key={spc.id}>
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {spc.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg">{spc.name}</h3>
                <p className="text-muted-foreground">{spc.specialty}</p>
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
