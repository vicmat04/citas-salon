'use server'

import prisma from '@/lib/db'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth/helpers'
import { revalidatePath } from 'next/cache'

// Note: We use the service role key here to bypass RLS and allow creating users
// Since this is a server action, the service role key is never exposed to the client.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function createSalon(formData: FormData) {
  // 1. Verify admin permissions
  await requireAdmin()

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !slug || !email || !password) {
    return { error: 'Todos los campos son obligatorios' }
  }

  // 2. Check if slug or email already exists in DB
  const existingSalon = await prisma.salon.findUnique({ where: { slug } })
  if (existingSalon) {
    return { error: 'El slug ya está en uso' }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  
  let supabaseUid = existingUser?.supabaseUid
  let dbUser = existingUser

  if (!existingUser) {
    // 3. Create user in Supabase Auth using Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'salon_owner' }
    })

    if (authError) {
      return { error: authError.message }
    }

    supabaseUid = authData.user.id

    // 4. Create user in Prisma DB
    dbUser = await prisma.user.create({
      data: {
        name: `Dueño de ${name}`,
        email,
        role: 'salon_owner',
        supabaseUid
      }
    })
  }

  if (!dbUser) {
    return { error: 'Error inesperado al crear o recuperar usuario.' }
  }

  // 5. Create Salon in Prisma
  await prisma.salon.create({
    data: {
      name,
      slug,
      ownerId: dbUser.id,
      status: 'trial'
    }
  })

  // 6. Refresh admin salons page
  revalidatePath('/admin/salons')
  
  return { success: true }
}
