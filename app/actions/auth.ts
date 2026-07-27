'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import type { ActionResult } from '@/lib/actions/result'
import { getDbUser } from '@/lib/auth/session'
import { sanitizeTenantNext } from '@/lib/auth/tenant-next'
import {
  isInactiveSalonStatus,
  isOperationalSalonStatus,
} from '@/lib/salons/lifecycle'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  tenantSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  next: z.string().optional(),
})

function optionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function loginWithEmail(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: optionalString(formData, 'email'),
    password: optionalString(formData, 'password'),
    tenantSlug: optionalString(formData, 'tenantSlug'),
    next: optionalString(formData, 'next'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'Revisa el correo y la contraseña.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return { ok: false, code: 'INTERNAL', message: 'No fue posible iniciar sesión.' }
  }

  const safeSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Authentication cleanup is best-effort and never exposes provider details.
    }
  }

  let authUserId: string | undefined
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })
    if (error || !data.user) {
      return {
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'Correo o contraseña incorrectos.',
      }
    }
    authUserId = data.user.id
  } catch {
    return {
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Correo o contraseña incorrectos.',
    }
  }

  let dbUser: Awaited<ReturnType<typeof getDbUser>>
  try {
    dbUser = await getDbUser(authUserId)
  } catch {
    await safeSignOut()
    return { ok: false, code: 'INTERNAL', message: 'No fue posible iniciar sesión.' }
  }

  if (!dbUser) {
    await safeSignOut()
    return { ok: false, code: 'UNAUTHORIZED', message: 'No fue posible iniciar sesión.' }
  }

  if (dbUser.role === 'platform_admin') redirect('/admin/dashboard')

  if (dbUser.role !== 'salon_owner') {
    await safeSignOut()
    return { ok: false, code: 'UNAUTHORIZED', message: 'No fue posible iniciar sesión.' }
  }

  const { tenantSlug, next } = parsed.data
  if (!tenantSlug) redirect('/my-salons')

  const salon = dbUser.ownedSalons.find((candidate) => candidate.slug === tenantSlug)
  if (!salon) {
    await safeSignOut()
    return {
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'No fue posible iniciar sesión para este salón.',
    }
  }

  if (isInactiveSalonStatus(salon.status)) redirect(`/s/${tenantSlug}/inactive`)
  if (!isOperationalSalonStatus(salon.status)) redirect('/my-salons')

  redirect(sanitizeTenantNext(next ?? null, tenantSlug))
}

export async function loginWithEmailAction(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return loginWithEmail(formData)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
