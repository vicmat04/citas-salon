import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { mockServices } from "@/lib/mock-data"

export default function SalonServicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Servicios</h2>
          <p className="text-muted-foreground">Catálogo de servicios de tu salón.</p>
        </div>
        <Button>Añadir Servicio</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockServices.map(srv => (
          <Card key={srv.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{srv.name}</CardTitle>
                <Badge variant={srv.isActive ? 'default' : 'secondary'}>
                  {srv.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{srv.category}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-4">
                <p className="text-2xl font-bold text-primary">${srv.price.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{srv.duration} min</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
