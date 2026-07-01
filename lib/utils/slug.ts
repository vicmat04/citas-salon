import slugify from 'slugify'
import prisma from '@/lib/db'

export const RESERVED_SLUGS = new Set([
  // Rutas del sistema
  'admin',
  's',
  'api',
  'book',
  'registro-salon',
  'salon-suspended',
  'login',
  'logout',
  'signup',

  // Rutas de marketing / plataforma
  'planes',
  'precios',
  'demo',
  'contacto',
  'ayuda',
  'soporte',
  'blog',
  'terminos',
  'privacidad',

  // Rutas de cuenta / plataforma
  'settings',
  'dashboard',
  'account',
  'profile',
  'billing',
  'checkout',

  // Rutas técnicas
  'webhook',
  'auth',
  'public',
  'static',
  'assets',

  // Archivos especiales
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase())
}

export async function createUniqueSlug(salonName: string): Promise<string> {
  const base = slugify(salonName, {
    lower: true,
    strict: true,   // elimina caracteres especiales
    locale: 'es'    // manejo correcto de ñ, tildes, etc.
  })

  // Empezar desde sufijo 2 si la base es reservada
  let slug = base
  let counter = 2

  while (
    isReservedSlug(slug) ||
    await prisma.salon.findUnique({ where: { slug } })
  ) {
    slug = `${base}-${counter}`
    counter++
  }

  return slug
}
