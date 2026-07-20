import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { mockAppointments } from "@/lib/mock-data"

export default function SalonAppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Citas</h2>
          <p className="text-muted-foreground">Gestiona tus reservaciones.</p>
        </div>
        <Button>Nueva Cita</Button>
      </div>

      <div className="grid gap-4">
        {mockAppointments.map(app => (
          <Card key={app.id}>
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{app.customerName}</h3>
                  <Badge variant={app.status === 'confirmed' ? 'default' : 'secondary'}>{app.status}</Badge>
                </div>
                <p className="text-muted-foreground">{app.customerPhone}</p>
                <p className="text-sm">Servicios: {app.serviceNames.join(', ')}</p>
              </div>
              
              <div className="flex flex-col items-start md:items-end space-y-1">
                <p className="font-semibold text-lg">{app.date} a las {app.startTime}</p>
                <p className="text-muted-foreground">Especialista: {app.specialistName}</p>
                <p className="text-primary font-bold">${app.totalPrice.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
