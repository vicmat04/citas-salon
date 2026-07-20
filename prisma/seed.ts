import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
;(globalThis as any).WebSocket = WebSocket

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting seed...')

  // 1. Create Plans
  console.log('Creating plans...')
  const plansData = [
    { name: 'Free Trial', price: 0, maxSpecialists: 3, maxAppointmentsPerMonth: 50, hasReports: false },
    { name: 'Básico', price: 29.99, maxSpecialists: 5, maxAppointmentsPerMonth: 200, hasReports: false },
    { name: 'Pro', price: 59.99, maxSpecialists: null, maxAppointmentsPerMonth: null, hasReports: true, hasWhatsappAutomation: true },
  ]
  
  for (const p of plansData) {
    const existing = await prisma.plan.findFirst({ where: { name: p.name } })
    if (!existing) {
      await prisma.plan.create({ data: p })
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!adminEmail || !adminPassword || !supabaseUrl || !supabaseServiceKey) {
    console.log('Skipping admin and demo salon creation: missing env vars (SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 2. Admin User
  let supabaseUid = ''
  const { data: users, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Error fetching Auth users:', error)
    return
  }
  
  const existingAuthAdmin = users.users.find(u => u.email === adminEmail)
  if (existingAuthAdmin) {
    supabaseUid = existingAuthAdmin.id
  } else {
    const { data: newAuthAdmin, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    })
    if (createError) {
      console.error('Error creating Auth user:', createError)
      return
    }
    supabaseUid = newAuthAdmin.user.id
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: 'Platform Admin',
        email: adminEmail,
        role: 'platform_admin',
        supabaseUid
      }
    })
    console.log(`Admin user created: ${adminEmail}`)
  } else {
    console.log(`Admin user already exists: ${adminEmail}`)
  }
  
  console.log('Seed finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
