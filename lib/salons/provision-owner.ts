import 'server-only'

import slugify from 'slugify'

import prisma from '@/lib/db'
import { addCalendarDays, getCalendarDateInTimezone, getTrialConfig } from '@/lib/salons/trial'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const PROVISIONING_SOURCE = 'citas-salon-owner-registration'
const DEFAULT_TIMEZONE = 'America/Panama'
const MAX_SLUG_ATTEMPTS = 25
const RESERVED_SLUGS = new Set([
  '_next',
  'admin',
  'api',
  'auth',
  'book',
  'favicon.ico',
  'login',
  'my-salons',
  'registro-salon',
  'robots.txt',
  's',
  'sitemap.xml',
])

export type RegistrationInput = {
  ownerName: string
  email: string
  phone?: string
  password: string
  salonName: string
  salonPhone?: string
}

export type ProvisionedOwnerSalon = {
  authUserId: string
  dbUserId: string
  salonId: string
  slug: string
}

export type ProvisioningErrorCode = 'CONFIG' | 'CONFLICT' | 'PROVIDER' | 'INTERNAL'

export class ProvisioningError extends Error {
  constructor(public readonly code: ProvisioningErrorCode) {
    super('Owner provisioning failed')
    this.name = 'ProvisioningError'
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function generateSalonSlugBase(name: string): string {
  const generated = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  }) || 'salon'

  return RESERVED_SLUGS.has(generated) ? `${generated}-salon` : generated
}

export function slugCandidate(base: string, attempt: number): string {
  return attempt === 0 ? base : `${base}-${attempt + 1}`
}

function isIdentityConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; status?: unknown; message?: unknown }
  const code = typeof candidate.code === 'string' ? candidate.code.toLowerCase() : ''
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : ''
  return (
    candidate.status === 422 ||
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    message.includes('already')
  )
}

function isSlugCollision(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; meta?: { target?: unknown } }
  if (candidate.code !== 'P2002') return false
  return JSON.stringify(candidate.meta?.target ?? '').toLowerCase().includes('slug')
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'P2002')
}

async function findPendingIdentity(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return null

  return data.users.find((user) =>
    user.email?.trim().toLowerCase() === email &&
    user.user_metadata?.provisioning_source === PROVISIONING_SOURCE &&
    user.user_metadata?.provisioning_state === 'pending'
  ) ?? null
}

async function compensateIdentity(
  authUserId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
  try {
    await supabase.auth.signOut()
  } catch {
    // Best effort: a missing DB user still cannot authorize application access.
  }

  try {
    await supabaseAdmin.auth.admin.deleteUser(authUserId)
  } catch {
    // A verified pending identity remains retryable if provider cleanup is unavailable.
  }
}

function logProvisioningFailure(correlationId: string): void {
  console.error('Owner provisioning failed', { correlationId })
}

export async function provisionOwnerAndSalon(
  input: RegistrationInput,
): Promise<ProvisionedOwnerSalon> {
  const correlationId = crypto.randomUUID()
  let trialConfig: ReturnType<typeof getTrialConfig>

  try {
    trialConfig = getTrialConfig()
  } catch {
    throw new ProvisioningError('CONFIG')
  }

  let plan: { id: string } | null
  try {
    plan = await prisma.plan.findFirst({
      where: { name: trialConfig.planName, isActive: true },
      select: { id: true },
    })
  } catch {
    logProvisioningFailure(correlationId)
    throw new ProvisioningError('INTERNAL')
  }
  if (!plan) throw new ProvisioningError('CONFIG')

  const email = normalizeEmail(input.email)
  let existingDbUser: { id: string } | null
  try {
    existingDbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
  } catch {
    logProvisioningFailure(correlationId)
    throw new ProvisioningError('INTERNAL')
  }
  if (existingDbUser) throw new ProvisioningError('CONFLICT')

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    logProvisioningFailure(correlationId)
    throw new ProvisioningError('INTERNAL')
  }

  let authUserId: string
  let recoveredIdentity = false

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        provisioning_source: PROVISIONING_SOURCE,
        provisioning_state: 'pending',
      },
    })

    if (!error && data.user) {
      authUserId = data.user.id
    } else if (isIdentityConflict(error)) {
      const pendingIdentity = await findPendingIdentity(email)
      if (!pendingIdentity) throw new ProvisioningError('CONFLICT')

      const identityDbUser = await prisma.user.findUnique({
        where: { supabaseUid: pendingIdentity.id },
        select: { id: true },
      })
      if (identityDbUser) throw new ProvisioningError('CONFLICT')

      authUserId = pendingIdentity.id
      recoveredIdentity = true
    } else {
      throw new ProvisioningError('PROVIDER')
    }
  } catch (error) {
    if (error instanceof ProvisioningError) throw error
    logProvisioningFailure(correlationId)
    throw new ProvisioningError('PROVIDER')
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    })
    if (error || !data.user || data.user.id !== authUserId) {
      await compensateIdentity(authUserId, supabase)
      throw new ProvisioningError(recoveredIdentity ? 'CONFLICT' : 'PROVIDER')
    }
  } catch (error) {
    if (error instanceof ProvisioningError) throw error
    await compensateIdentity(authUserId, supabase)
    logProvisioningFailure(correlationId)
    throw new ProvisioningError(recoveredIdentity ? 'CONFLICT' : 'PROVIDER')
  }

  const startDate = getCalendarDateInTimezone(new Date(), DEFAULT_TIMEZONE)
  const endDate = addCalendarDays(startDate, trialConfig.durationDays)
  const baseSlug = generateSalonSlugBase(input.salonName)

  try {
    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
      const slug = slugCandidate(baseSlug, attempt)
      try {
        return await prisma.$transaction(async (transaction) => {
          const dbUser = await transaction.user.create({
            data: {
              name: input.ownerName,
              email,
              phone: input.phone,
              role: 'salon_owner',
              supabaseUid: authUserId,
            },
            select: { id: true },
          })
          const salon = await transaction.salon.create({
            data: {
              ownerId: dbUser.id,
              name: input.salonName,
              slug,
              phone: input.salonPhone,
              status: 'trial',
              planId: plan.id,
            },
            select: { id: true, slug: true },
          })
          await transaction.subscription.create({
            data: {
              salonId: salon.id,
              planId: plan.id,
              status: 'trial',
              startDate,
              endDate,
            },
          })

          return {
            authUserId,
            dbUserId: dbUser.id,
            salonId: salon.id,
            slug: salon.slug,
          }
        })
      } catch (error) {
        if (isSlugCollision(error) && attempt < MAX_SLUG_ATTEMPTS - 1) continue
        if (isUniqueConflict(error)) throw new ProvisioningError('CONFLICT')
        throw error
      }
    }
    throw new Error('Slug candidates exhausted')
  } catch (error) {
    await compensateIdentity(authUserId, supabase)
    if (error instanceof ProvisioningError) throw error
    logProvisioningFailure(correlationId)
    throw new ProvisioningError('INTERNAL')
  }
}
