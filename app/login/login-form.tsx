'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { loginWithEmailAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Ingresando…' : label}
    </Button>
  )
}

export function LoginForm({
  tenantSlug,
  next,
  submitLabel = 'Ingresar',
}: {
  tenantSlug?: string
  next?: string
  submitLabel?: string
}) {
  const [state, formAction] = useActionState(loginWithEmailAction, null)

  return (
    <form action={formAction} className="space-y-4">
      {tenantSlug && <input type="hidden" name="tenantSlug" value={tenantSlug} />}
      {next && <input type="hidden" name="next" value={next} />}
      {state && !state.ok && (
        <div
          role="alert"
          className="rounded-md bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300"
        >
          {state.message}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <SubmitButton label={submitLabel} />
    </form>
  )
}
