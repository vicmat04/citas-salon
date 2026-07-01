import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { mockSalonInfo } from "@/lib/mock-data"

export default function SalonSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">Ajustes generales de tu salón.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Pública</CardTitle>
          <CardDescription>Estos datos se mostrarán en tu página pública de reservas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Salón</Label>
            <Input id="name" defaultValue={mockSalonInfo.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slogan">Eslogan o descripción corta</Label>
            <Input id="slogan" defaultValue={mockSalonInfo.slogan} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de contacto</Label>
              <Input id="phone" defaultValue={mockSalonInfo.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme">Color del Tema</Label>
              <Input id="theme" defaultValue={mockSalonInfo.themeColor} disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección completa</Label>
            <Input id="address" defaultValue={mockSalonInfo.address} />
          </div>
        </CardContent>
        <CardFooter>
          <Button>Guardar Cambios</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
