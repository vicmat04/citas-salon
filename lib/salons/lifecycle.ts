import 'server-only'

import type { Salon } from '@prisma/client'
import { notFound, redirect } from 'next/navigation'

import prisma from '@/lib/db'

export type OperationalSalonStatus = 'trial' | 'active'
export type InactiveSalonStatus = 'suspended' | 'cancelled'

export function isOperationalSalonStatus(
  status: string,
): status is OperationalSalonStatus {
  return status === 'trial' || status === 'active'
}

export function isInactiveSalonStatus(status: string): status is InactiveSalonStatus {
  return status === 'suspended' || status === 'cancelled'
}

export async function requireOperationalPublicSalon(slug: string): Promise<Salon> {
  const salon = await prisma.salon.findUnique({ where: { slug } })

  if (!salon) notFound()
  if (isOperationalSalonStatus(salon.status)) return salon
  if (isInactiveSalonStatus(salon.status)) redirect(`/s/${slug}/inactive`)

  notFound()
}
