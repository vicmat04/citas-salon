import { notFound, redirect } from 'next/navigation'

import { isInactiveSalonStatus, isOperationalSalonStatus } from '@/lib/salons/lifecycle'
import { getDbUser, getUser } from './session'

export async function requireAuth() {
  const user = await getUser()
  if (!user) redirect('/login')

  const dbUser = await getDbUser(user.id)
  if (!dbUser) redirect('/login')

  return { user, dbUser }
}

export async function requireAdmin() {
  const { user, dbUser } = await requireAuth()
  if (dbUser.role !== 'platform_admin') redirect('/login')

  return { user, dbUser }
}

export async function requireSalonOwner(slug: string) {
  const { user, dbUser } = await requireAuth()
  if (dbUser.role !== 'salon_owner') redirect('/login')

  const salon = dbUser.ownedSalons.find((candidate) => candidate.slug === slug)
  if (!salon) notFound()

  if (isInactiveSalonStatus(salon.status)) redirect(`/s/${slug}/inactive`)
  if (!isOperationalSalonStatus(salon.status)) notFound()

  return { user, dbUser, salon }
}
