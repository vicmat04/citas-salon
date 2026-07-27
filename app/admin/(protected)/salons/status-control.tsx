'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  updateSalonStatus,
  type AdminMutableSalonStatus,
} from '@/app/actions/admin'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: Array<{
  value: AdminMutableSalonStatus
  label: string
  variant: 'default' | 'outline' | 'destructive'
}> = [
  { value: 'trial', label: 'Poner en Prueba', variant: 'outline' },
  { value: 'active', label: 'Activar', variant: 'default' },
  { value: 'suspended', label: 'Suspender', variant: 'destructive' },
]

export function StatusControl({
  salonId,
  currentStatus,
}: {
  salonId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function changeStatus(nextStatus: AdminMutableSalonStatus) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateSalonStatus(salonId, nextStatus)
        if (!result.ok) {
          setError(result.message)
          return
        }
        router.refresh()
      } catch {
        setError('No fue posible actualizar el estado del salón.')
      }
    })
  }

  return (
    <div className="flex min-w-52 flex-col items-end gap-2" aria-busy={isPending}>
      <div className="flex flex-wrap justify-end gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={isPending || currentStatus === option.value}
            onClick={() => changeStatus(option.value)}
            className={cn(buttonVariants({ variant: option.variant, size: 'sm' }))}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="min-h-4 text-xs text-destructive" aria-live="polite">
        {error}
      </p>
    </div>
  )
}
