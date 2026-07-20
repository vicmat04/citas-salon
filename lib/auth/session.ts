import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/db'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return null
  }
  return user
}

export async function getDbUser(supabaseUid: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseUid },
    include: {
      ownedSalons: true,
      salonMemberships: true
    }
  })
  return dbUser
}
