'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import type { ActionResult } from '@/lib/actions/result'
import {
  ProvisioningError,
  provisionOwnerAndSalon,
} from '@/lib/salons/provision-owner'

const optionalPhone = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(40).optional(),
)

const registrationSchema = z.object({
  ownerName: z.string().trim().min(1, 'El nombre es requerido.').max(120),
  email: z.string().trim().toLowerCase().email('Ingresa un correo válido.'),
  phone: optionalPhone,
  password: z.string().min(1, 'La contraseña es requerida.').max(256),
  salonName: z.string().trim().min(1, 'El nombre del salón es requerido.').max(160),
  salonPhone: optionalPhone,
})

function formValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' ? value : undefined
}

export async function registerOwnerAndSalon(formData: FormData): Promise<ActionResult> {
  const parsed = registrationSchema.safeParse({
    ownerName: formValue(formData, 'ownerName'),
    email: formValue(formData, 'email'),
    phone: formValue(formData, 'phone'),
    password: formValue(formData, 'password'),
    salonName: formValue(formData, 'salonName'),
    salonPhone: formValue(formData, 'salonPhone'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'Revisa los datos del formulario.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  let slug: string
  try {
    const provisioned = await provisionOwnerAndSalon(parsed.data)
    slug = provisioned.slug
  } catch (error) {
    if (error instanceof ProvisioningError && error.code === 'CONFLICT') {
      return {
        ok: false,
        code: 'CONFLICT',
        message: 'No fue posible registrar esta cuenta. Intenta iniciar sesión.',
      }
    }

    return {
      ok: false,
      code: 'INTERNAL',
      message: 'No fue posible completar el registro. Inténtalo nuevamente.',
    }
  }

  redirect(`/s/${slug}/dashboard`)
}

export async function registerOwnerAndSalonAction(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return registerOwnerAndSalon(formData)
}
