import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { mockSalons } from "@/lib/mock-data"

export default function AdminSalonsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Salones</h2>
          <p className="text-muted-foreground">Gestión de todos los salones de la plataforma.</p>
        </div>
        <Button>Registrar Salón</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Salones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSalons.map((salon) => (
                <TableRow key={salon.id}>
                  <TableCell className="font-medium">{salon.name}</TableCell>
                  <TableCell>{salon.slug}</TableCell>
                  <TableCell>
                    <Badge variant={salon.status === 'active' ? 'default' : salon.status === 'trial' ? 'secondary' : 'destructive'}>
                      {salon.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{salon.plan}</TableCell>
                  <TableCell>{new Date(salon.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Ver</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
