import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Scissors, Users, Link as LinkIcon } from "lucide-react"
import { mockAppointments, mockServices, mockSpecialists } from "@/lib/mock-data"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function SalonDashboardPage({ params }: { params: { slug: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inicio</h2>
          <p className="text-muted-foreground">Resumen de tu salón.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAppointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockServices.filter(s => s.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Especialistas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSpecialists.filter(s => s.isActive).length}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">Enlace Público</CardTitle>
            <LinkIcon className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Link href={`/book/${params.slug}`} target="_blank" className={buttonVariants({ variant: "secondary", className: "w-full mt-2" })}>
              Abrir reservas
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Citas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAppointments.map(app => (
                <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{app.customerName}</p>
                    <p className="text-sm text-muted-foreground">{app.serviceNames.join(', ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{app.startTime}</p>
                    <p className="text-sm text-muted-foreground capitalize">{app.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
