'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createSpecialist } from '@/app/actions/owner'
import { toast } from 'sonner'

export function CreateSpecialistDialog({ salonId, slug }: { salonId: string, slug: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const res = await createSpecialist(formData, salonId, slug)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Especialista creado correctamente.")
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
        Añadir Especialista
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Especialista</DialogTitle>
          <DialogDescription>
            Registra un nuevo miembro del equipo en tu salón.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" name="name" required placeholder="Ej: Juan Pérez" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidad (Opcional)</Label>
            <Input id="specialty" name="specialty" placeholder="Ej: Barbero Senior" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo (Opcional)</Label>
            <Input id="email" name="email" type="email" placeholder="juan@ejemplo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (Opcional)</Label>
            <Input id="phone" name="phone" type="text" placeholder="6000-0000" />
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar Especialista'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
