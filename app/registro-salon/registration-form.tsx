'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { registerOwnerAndSalonAction } from '@/app/actions/registration'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? 'Creando tu salón…' : 'Crear mi salón'}
    </Button>
  )
}

export function RegistrationForm() {
  const [state, action] = useActionState(registerOwnerAndSalonAction, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  const fieldError = (name: string) => errors?.[name]?.[0]

  return (
    <form action={action} className="space-y-6">
      {state && !state.ok && (
        <div role="alert" className="rounded-md bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {state.message}
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="mb-3 text-base font-semibold">Tus datos</legend>
        <div className="space-y-2">
          <Label htmlFor="ownerName">Nombre completo</Label>
          <Input id="ownerName" name="ownerName" autoComplete="name" required aria-describedby="ownerName-error" />
          {fieldError('ownerName') && <p id="ownerName-error" className="text-sm text-destructive">{fieldError('ownerName')}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required aria-describedby="email-error" />
            {fieldError('email') && <p id="email-error" className="text-sm text-destructive">{fieldError('email')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required aria-describedby="password-error" />
          {fieldError('password') && <p id="password-error" className="text-sm text-destructive">{fieldError('password')}</p>}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-base font-semibold">Tu salón</legend>
        <div className="space-y-2">
          <Label htmlFor="salonName">Nombre del salón</Label>
          <Input id="salonName" name="salonName" required aria-describedby="salonName-error" />
          {fieldError('salonName') && <p id="salonName-error" className="text-sm text-destructive">{fieldError('salonName')}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="salonPhone">Teléfono del salón (opcional)</Label>
          <Input id="salonPhone" name="salonPhone" type="tel" />
        </div>
      </fieldset>

      <SubmitButton />
    </form>
  )
}
