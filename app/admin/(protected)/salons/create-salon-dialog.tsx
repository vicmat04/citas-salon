'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createSalon } from '@/app/actions/admin'

export function CreateSalonDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = async (formData: FormData) => {
    setError('')
    startTransition(async () => {
      const res = await createSalon(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
        Registrar Salón
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Salón</DialogTitle>
          <DialogDescription>
            Crea el salón y la cuenta de su propietario en un solo paso.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm font-medium">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Salón</Label>
            <Input id="name" name="name" required placeholder="Ej: Beauty Studio" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Enlace Corto (Slug)</Label>
            <Input id="slug" name="slug" required placeholder="ej: beauty-studio" />
            <p className="text-xs text-muted-foreground">Sus clientes visitarán: citassalon.app/s/beauty-studio</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo del Dueño</Label>
            <Input id="email" name="email" type="email" required placeholder="owner@beautystudio.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña Temporal</Label>
            <Input id="password" name="password" type="text" required placeholder="Mínimo 6 caracteres" />
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creando...' : 'Crear Salón'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
