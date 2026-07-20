import { redirect } from 'next/navigation'
import { getUser, getDbUser } from './session'

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  
  const dbUser = await getDbUser(user.id)
  if (!dbUser) {
    redirect('/login')
  }

  return { user, dbUser }
}

export async function requireAdmin() {
  const { user, dbUser } = await requireAuth()

  if (dbUser.role !== 'platform_admin') {
    redirect('/login')
  }

  return { user, dbUser }
}

export async function requireSalonOwner(slug: string) {
  const { user, dbUser } = await requireAuth()

  if (dbUser.role !== 'salon_owner') {
    redirect('/login') // o no autorizado
  }

  const ownsSalon = dbUser.ownedSalons.some(salon => salon.slug === slug)
  if (!ownsSalon) {
    redirect('/login') // Si no le pertenece el salon
  }

  const salon = dbUser.ownedSalons.find(s => s.slug === slug)

  return { user, dbUser, salon }
}
