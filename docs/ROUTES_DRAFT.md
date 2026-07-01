# ROUTES_DRAFT.md

# Rutas de la aplicación — Citas Salón

> Framework: Next.js 15 (App Router)  
> Todas las rutas usan el sistema de archivos de `app/`

---

## 1. Área pública (sin autenticación)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `app/page.tsx` | Landing page de la plataforma (marketing) |
| `/registro-salon` | `app/registro-salon/page.tsx` | Formulario de alta de salón nuevo |
| `/salon-suspended` | `app/salon-suspended/page.tsx` | Página para salones suspendidos |

---

## 2. Área pública del salón (sin autenticación)

Estas rutas no requieren cuenta. El cliente final accede solo con el slug del salón.

### 2.1 Página pública del salón

Mini-landing del salón con información, servicios y CTA para reservar.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/[slug]` | `app/[slug]/page.tsx` | Mini-landing pública del salón: logo, nombre, slogan, servicios, botón "Reservar cita" |

### 2.2 Formulario público de reservas

Wizard de reserva separado de la página del salón. Esta es la ruta oficial confirmada.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/book/[slug]` | `app/book/[slug]/page.tsx` | Wizard multi-step de reserva |
| `/book/[slug]/confirmacion` | `app/book/[slug]/confirmacion/page.tsx` | Confirmación de cita + botón WhatsApp |

**Decisión confirmada (2026-06-30)**: Se usa `/book/[slug]` en lugar de `/[slug]/reservar` porque:
- Elimina ambigüedad entre la página del salón y el flujo de reserva
- Permite compartir enlaces directos de reserva (ej: `tuapp.com/book/mi-salon`)
- Separa claramente las responsabilidades de cada ruta
- Elimina conflictos futuros si la página del salón evoluciona con sub-rutas propias

---

## 3. Autenticación

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/admin/login` | `app/admin/login/page.tsx` | Login del administrador de plataforma |
| `/s/[slug]/login` | `app/s/[slug]/login/page.tsx` | Login del propietario del salón |
| `/s/[slug]/login/recuperar` | `app/s/[slug]/login/recuperar/page.tsx` | Recuperación de contraseña |

---

## 4. Panel del Administrador de Plataforma (`/admin/...`)

Acceso exclusivo para `role = 'platform_admin'`.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/admin` | `app/admin/page.tsx` | Redirect a `/admin/dashboard` |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Métricas globales: salones activos, citas del día, etc. |
| `/admin/salons` | `app/admin/salons/page.tsx` | Lista de todos los salones con filtros por estado |
| `/admin/salons/new` | `app/admin/salons/new/page.tsx` | Crear salón manualmente |
| `/admin/salons/[salonId]` | `app/admin/salons/[salonId]/page.tsx` | Detalle y edición del salón |
| `/admin/salons/[salonId]/appointments` | `app/admin/salons/[salonId]/appointments/page.tsx` | Ver citas del salón |
| `/admin/plans` | `app/admin/plans/page.tsx` | Gestionar planes de suscripción |
| `/admin/settings` | `app/admin/settings/page.tsx` | Configuración global de la plataforma |

---

## 5. Panel del Propietario (`/s/[slug]/...`)

Acceso para `role = 'salon_owner'` con `salonSlug === slug` en el JWT.  
Solo funciona si el salón tiene estado `active` o `trial`.

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/s/[slug]` | `app/s/[slug]/page.tsx` | Redirect a `/s/[slug]/dashboard` |
| `/s/[slug]/dashboard` | `app/s/[slug]/dashboard/page.tsx` | Citas del día + próximas + métricas rápidas |
| `/s/[slug]/appointments` | `app/s/[slug]/appointments/page.tsx` | Gestión completa de citas |
| `/s/[slug]/appointments/new` | `app/s/[slug]/appointments/new/page.tsx` | Crear cita manualmente |
| `/s/[slug]/appointments/[appointmentId]` | `app/s/[slug]/appointments/[appointmentId]/page.tsx` | Detalle y edición de cita |
| `/s/[slug]/customers` | `app/s/[slug]/customers/page.tsx` | Lista de clientes del salón |
| `/s/[slug]/customers/[customerId]` | `app/s/[slug]/customers/[customerId]/page.tsx` | Historial de citas del cliente |
| `/s/[slug]/services` | `app/s/[slug]/services/page.tsx` | Catálogo de servicios agrupados por categoría |
| `/s/[slug]/services/categories` | `app/s/[slug]/services/categories/page.tsx` | Gestión de categorías |
| `/s/[slug]/specialists` | `app/s/[slug]/specialists/page.tsx` | Lista de especialistas |
| `/s/[slug]/specialists/[specialistId]` | `app/s/[slug]/specialists/[specialistId]/page.tsx` | Editar especialista + horarios + servicios |
| `/s/[slug]/availability` | `app/s/[slug]/availability/page.tsx` | Horarios laborales + fechas/slots bloqueados |
| `/s/[slug]/settings` | `app/s/[slug]/settings/page.tsx` | Configuración del salón (info, logo, tema, etc.) |
| `/s/[slug]/public-link` | `app/s/[slug]/public-link/page.tsx` | Ver enlace público + QR + instrucciones de compartir |

---

## 6. API Routes

Todas las API Routes siguen el patrón `app/api/`.

### 6.1 API pública (sin auth, acceso por slug)

```
GET  /api/public/[slug]
     → Info pública del salón: nombre, logo, color, teléfono, servicios activos, especialistas activos

GET  /api/public/[slug]/availability
     → Query params: date, serviceIds (comma-separated), specialistId (optional)
     → Retorna: slots disponibles/no disponibles para esa fecha

POST /api/public/[slug]/appointments
     → Body: customerName, customerPhone, serviceIds, specialistId, date, startTime, customerNotes
     → Retorna: appointmentId, confirmación, datos para mensaje WhatsApp
     → Rate limited: 10 req / IP / hora
```

### 6.2 API del propietario (requiere auth + salon_id del JWT)

```
-- Salón
GET  /api/salon/info
PUT  /api/salon/info
POST /api/salon/logo   → upload de logo a Supabase Storage

-- Servicios
GET    /api/salon/services
POST   /api/salon/services
GET    /api/salon/services/[serviceId]
PUT    /api/salon/services/[serviceId]
DELETE /api/salon/services/[serviceId]

-- Categorías
GET    /api/salon/categories
POST   /api/salon/categories
PUT    /api/salon/categories/[categoryId]
DELETE /api/salon/categories/[categoryId]

-- Especialistas
GET    /api/salon/specialists
POST   /api/salon/specialists
GET    /api/salon/specialists/[specialistId]
PUT    /api/salon/specialists/[specialistId]
DELETE /api/salon/specialists/[specialistId]
POST   /api/salon/specialists/[specialistId]/photo  → upload de foto

-- Horarios
GET  /api/salon/business-hours
PUT  /api/salon/business-hours
GET  /api/salon/specialists/[specialistId]/hours
PUT  /api/salon/specialists/[specialistId]/hours

-- Bloqueos
GET    /api/salon/blocked-dates
POST   /api/salon/blocked-dates
DELETE /api/salon/blocked-dates/[blockedDateId]
GET    /api/salon/blocked-slots
POST   /api/salon/blocked-slots
DELETE /api/salon/blocked-slots/[blockedSlotId]

-- Citas
GET  /api/salon/appointments
POST /api/salon/appointments
GET  /api/salon/appointments/[appointmentId]
PUT  /api/salon/appointments/[appointmentId]
PUT  /api/salon/appointments/[appointmentId]/status

-- Clientes
GET  /api/salon/customers
GET  /api/salon/customers/[customerId]
PUT  /api/salon/customers/[customerId]
```

### 6.3 API del administrador (requiere role = 'platform_admin')

```
-- Salones
GET    /api/admin/salons
POST   /api/admin/salons
GET    /api/admin/salons/[salonId]
PUT    /api/admin/salons/[salonId]
PUT    /api/admin/salons/[salonId]/status
PUT    /api/admin/salons/[salonId]/slug     → único punto donde se puede editar el slug

-- Planes
GET    /api/admin/plans
POST   /api/admin/plans
PUT    /api/admin/plans/[planId]

-- Métricas globales
GET    /api/admin/metrics
```

---

## 7. Server Actions (alternativa a API Routes para formularios)

Para formularios del panel (propietario y admin), se pueden usar Server Actions en lugar de API Routes. Esto simplifica el código al eliminar el fetch del cliente.

```typescript
// app/s/[slug]/services/actions.ts
'use server'

import { z } from 'zod'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export async function createService(formData: FormData) {
  const session = await getServerSession()
  if (!session?.salonId) throw new Error('Unauthorized')

  // ... validar y guardar
}
```

**Regla**: las Server Actions son preferidas para:
- Formularios de creación/edición (sin necesidad de fetch manual)
- Acciones simples de cambio de estado (confirmar cita, toggle especialista, etc.)

Las API Routes son preferidas para:
- El formulario público (acceso sin auth desde el cliente)
- Consultas de disponibilidad (GET con query params)

---

## 8. Layouts por área

```
app/
  layout.tsx                         ← Layout raíz (fonts, providers globales)
  admin/
    layout.tsx                       ← AdminLayout: sidebar de admin + auth check
  s/
    [slug]/
      layout.tsx                     ← SalonLayout: sidebar del propietario + auth check + slug en contexto
  [slug]/
    layout.tsx                       ← PublicLayout: minimal, sin navbar, usa tema del salón
```

---

## 9. Middleware

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas del admin → verificar role = 'platform_admin'
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // verificar sesión con role platform_admin
  }

  // Rutas del propietario → verificar sesión + slug match + estado del salón
  if (pathname.startsWith('/s/')) {
    const slug = pathname.split('/')[2]
    // verificar sesión con salonSlug === slug y estado active|trial
  }

  // Todo lo demás → público (sin auth)
}

export const config = {
  // /book/ y /[slug] son rutas públicas — no tienen auth guard en el middleware
  // La verificación del estado del salón (active|trial) ocurre dentro de cada page/route
  matcher: ['/admin/:path*', '/s/:path*']
}
```

---

## 10. Arquitectura final de rutas y prioridad

**Decisión confirmada (2026-06-30)**. La estructura oficial es:

```
/                     → Landing de la plataforma
/registro-salon       → Registro de nuevos propietarios
/admin/...            → Panel del administrador
/s/[slug]/...         → Panel privado del propietario
/[slug]               → Página pública/mini-landing del salón
/book/[slug]          → Wizard público de reserva
/book/[slug]/confirmacion → Confirmación + botón WhatsApp
/salon-suspended      → Página para salones suspendidos/inactivos
```

Next.js prioriza rutas estáticas sobre dinámicas, por lo que `/admin`, `/s`, `/book` y `/registro-salon` nunca serán interceptados por `/[slug]`.

```
Prioridad de resolución:
  /admin/...          → estática, gana siempre
  /s/...              → estática, gana siempre
  /book/...           → estática, gana siempre
  /registro-salon     → estática, gana siempre
  /salon-suspended    → estática, gana siempre
  /[slug]             → dinámica, solo si ninguna ruta estática coincide
```

---

## 11. Slugs reservados

Ningún salón puede tener como slug ninguna de estas palabras, ya que colisionan con rutas del sistema.

```typescript
// lib/utils/slug.ts
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
```

### Reglas del slug (confirmadas 2026-06-30)

| # | Regla |
|---|-------|
| 1 | El slug se genera automáticamente desde el nombre del salón |
| 2 | Solo el administrador de plataforma puede editar el slug |
| 3 | El propietario NO puede cambiar el slug en el MVP |
| 4 | El slug debe ser único globalmente (constraint en DB) |
| 5 | El slug debe ser lowercase, sin espacios, sin caracteres especiales y URL-safe |
| 6 | Si un slug generado coincide con una palabra reservada, se agrega sufijo numérico |
| 7 | Si el slug cambia en el futuro, considerar redirects para no romper enlaces compartidos |
| 8 | El formulario de reserva vive en `/book/[slug]` |
| 9 | La página pública del salón vive en `/[slug]` |
| 10 | El panel privado del propietario vive en `/s/[slug]` |

### Algoritmo de generación de slug

```typescript
// lib/utils/slug.ts
import slugify from 'slugify'

export async function createUniqueSlug(
  salonName: string,
  prisma: PrismaClient
): Promise<string> {
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
```

### Ejemplos de generación de slug

| Nombre del salón | Slug generado | ¿Reservado? | Slug final |
|-----------------|--------------|-------------|------------|
| Gloss & Glow | `gloss-glow` | No | `gloss-glow` |
| Salón Bella | `salon-bella` | No | `salon-bella` |
| Planes | `planes` | ✅ Sí | `planes-2` |
| Admin Cuts | `admin-cuts` | No | `admin-cuts` |
| Admin | `admin` | ✅ Sí | `admin-2` |
| Salón Bella (dup) | `salon-bella` | No, pero existe | `salon-bella-2` |
| Café & Uñas | `cafe-unas` | No | `cafe-unas` |