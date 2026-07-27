'use client'

import type { Salon } from '@prisma/client'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { updateSalonSettings } from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SettingsForm({ salon, slug }: { salon: Salon; slug: string }) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateSalonSettings(formData, slug)
      if (result.error) toast.error(result.error)
      else toast.success('Configuración actualizada correctamente.')
    })
  }

  return (
    <Card>
      <form action={handleSubmit}>
        <CardHeader>
          <CardTitle>Información Pública</CardTitle>
          <CardDescription>Estos datos se mostrarán en tu página pública de reservas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Salón</Label>
            <Input id="name" name="name" defaultValue={salon.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slogan">Eslogan o descripción corta</Label>
            <Input id="slogan" name="slogan" defaultValue={salon.slogan || ''} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de contacto</Label>
              <Input id="phone" name="phone" defaultValue={salon.phone || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeColor">Color del Tema (Hex)</Label>
              <Input id="themeColor" name="themeColor" type="color" defaultValue={salon.themeColor} className="h-10 px-1 py-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección completa</Label>
            <Input id="address" name="address" defaultValue={salon.address || ''} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
