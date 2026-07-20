import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import prisma from "@/lib/db"
import { CreateSalonDialog } from "./create-salon-dialog"

export default async function AdminSalonsPage() {
  const salons = await prisma.salon.findMany({
    include: { owner: true, plan: true },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Salones</h2>
          <p className="text-muted-foreground">Gestión de todos los salones de la plataforma.</p>
        </div>
        <CreateSalonDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Salones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Enlace (Slug)</TableHead>
                  <TableHead>Dueño</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay salones registrados.
                    </TableCell>
                  </TableRow>
                )}
                {salons.map((salon) => (
                  <TableRow key={salon.id}>
                    <TableCell className="font-medium whitespace-nowrap">{salon.name}</TableCell>
                    <TableCell className="whitespace-nowrap">/s/{salon.slug}</TableCell>
                    <TableCell className="whitespace-nowrap">{salon.owner.email}</TableCell>
                    <TableCell>
                      <Badge variant={salon.status === 'active' ? 'default' : salon.status === 'trial' ? 'secondary' : 'destructive'}>
                        {salon.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{salon.plan?.name || 'Prueba'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="outline" size="sm">Ver Detalles</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
