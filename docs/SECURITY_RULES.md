# SECURITY_RULES.md

# Reglas de seguridad — Plataforma Citas Salón

> Estas reglas son OBLIGATORIAS en toda la codebase. No son sugerencias.  
> Si una query, Server Action o Route Handler no cumple estas reglas, debe rechazarse en code review.

---

## 1. Principio fundamental: salon_id siempre del servidor

El `salon_id` de todas las queries **SIEMPRE** debe provenir del token de sesión del servidor.

```typescript
// ✅ CORRECTO
import { getServerSession } from '@/lib/auth/session'

export async function getServices(request: Request) {
  const session = await getServerSession()
  if (!session?.salonId) return unauthorized()

  const services = await prisma.service.findMany({
    where: { salonId: session.salonId, isActive: true }
  })
  return services
}

// ❌ INCORRECTO — nunca confiar en datos del cliente
export async function getServices(request: Request) {
  const { salonId } = await request.json() // VULNERABLE
  const services = await prisma.service.findMany({
    where: { salonId } // cualquiera puede poner el salonId que quiera
  })
  return services
}
```

---

## 2. Capas de seguridad por área

### 2.1 Panel del Administrador (`/admin/...`)

| Capa | Implementación |
|------|---------------|
| Middleware | Verifica `role === 'platform_admin'` en el JWT |
| Layout | Redirige a `/admin/login` si no hay sesión válida |
| Server Actions | Verifican rol `platform_admin` antes de cualquier operación |
| Queries | Sin restricción de `salon_id` (el admin ve todo) |

```typescript
// middleware.ts
if (pathname.startsWith('/admin')) {
  const session = await getSession(request)
  if (!session || session.role !== 'platform_admin') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
}
```

---

### 2.2 Panel del Propietario (`/s/[slug]/...`)

| Capa | Implementación |
|------|---------------|
| Middleware | Verifica sesión válida + rol `salon_owner` o `salon_staff` |
| Middleware | Verifica que el `salonId` del JWT corresponde al `slug` de la URL |
| Middleware | Verifica que el salón tiene estado `active` o `trial` |
| Layout | Redirige a `/s/[slug]/login` si no hay sesión |
| Server Actions | Extraen `salonId` del JWT, nunca del body |
| Queries | Siempre incluyen `WHERE salon_id = :salonId` |

```typescript
// middleware.ts
if (pathname.startsWith('/s/')) {
  const slug = pathname.split('/')[2]
  const session = await getSession(request)

  if (!session) {
    return NextResponse.redirect(new URL(`/s/${slug}/login`, request.url))
  }

  // Verificar que el slug del JWT coincide con la URL
  if (session.salonSlug !== slug) {
    return NextResponse.redirect(new URL(`/s/${slug}/login`, request.url))
  }

  // Verificar estado del salón
  if (!['active', 'trial'].includes(session.salonStatus)) {
    return NextResponse.redirect(new URL('/salon-suspended', request.url))
  }
}
```

---

### 2.3 Formulario Público (`/[slug]` y `/[slug]/reservar`)

| Capa | Implementación |
|------|---------------|
| Sin autenticación | El cliente final no tiene sesión |
| Datos por slug | Todos los datos se cargan por `slug` (NO por `salon_id` recibido del cliente) |
| Verificación de estado | Si el salón no está `active` o `trial`, se muestra mensaje de no disponible |
| Creación de cita | El `salon_id` se resuelve en el servidor desde el `slug` de la URL |
| Rate limiting | Aplicar rate limit en `POST /api/public/[slug]/appointments` |

```typescript
// app/api/public/[slug]/appointments/route.ts
export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  // El salon_id se resuelve del slug en el servidor
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug, status: { in: ['active', 'trial'] } }
  })

  if (!salon) return notFound()

  // A partir de aquí, usamos salon.id — nunca del body
  const body = await request.json()
  const appointment = await createAppointment({
    salonId: salon.id, // ← del servidor
    ...body
  })
}
```

---

## 3. Validación de inputs

Toda Server Action y Route Handler que recibe datos del cliente **DEBE** validar con Zod.

```typescript
import { z } from 'zod'

const CreateAppointmentSchema = z.object({
  customerId: z.string().uuid().optional(),
  specialistId: z.string().uuid().optional(),
  serviceIds: z.array(z.string().uuid()).min(1),
  appointmentDate: z.string().date(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(6).max(20),
  customerNotes: z.string().max(500).optional()
})

// En la Server Action o Route Handler:
const parsed = CreateAppointmentSchema.safeParse(body)
if (!parsed.success) {
  return { error: parsed.error.flatten() }
}
```

**Campos que NUNCA deben aceptarse del cliente:**
- `salonId`
- `role`
- `status` (del salón)
- `createdByUserId`
- `id` (UUIDs autogenerados)

---

## 4. Slug del salón

- El slug es público e inmutable una vez que el propietario lo comparte
- Solo el administrador de plataforma puede editar el slug
- Al editar un slug, el sistema debe crear un redirect desde el slug anterior
- El slug debe ser URL-safe: solo letras minúsculas, números y guiones

```typescript
import slugify from 'slugify'

function generateSlug(salonName: string): string {
  return slugify(salonName, {
    lower: true,
    strict: true,    // elimina caracteres especiales
    locale: 'es'     // manejo correcto de ñ, tildes, etc.
  })
}

async function createUniqueSlug(salonName: string): Promise<string> {
  const base = generateSlug(salonName)
  let slug = base
  let counter = 1

  while (await prisma.salon.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`
    counter++
  }

  return slug
}
```

---

## 5. Manejo de contraseñas y tokens

- Las contraseñas son gestionadas por **Supabase Auth** — no se almacenan ni procesan en la aplicación
- Los tokens de `access_tokens` se almacenan como **hash** (nunca el token en claro)
- Los tokens de invitación tienen expiración máxima de 48 horas
- Los tokens de magic link (Fase 2) tienen expiración de 15 minutos
- Al usar un token, se marca con `used_at` y no puede reutilizarse

```typescript
import { createHash } from 'crypto'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
```

---

## 6. Sanitización de números de teléfono

Los números de WhatsApp requieren formato internacional sin caracteres especiales.

```typescript
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

function sanitizePhone(phone: string, defaultCountry = 'PA'): string {
  try {
    if (!isValidPhoneNumber(phone, defaultCountry)) {
      // Intentar limpiar y agregar código de país por defecto
      const digits = phone.replace(/\D/g, '')
      return `+507${digits}` // fallback para Panamá
    }
    const parsed = parsePhoneNumber(phone, defaultCountry)
    return parsed.format('E.164') // ej: +50764001234
  } catch {
    return phone.replace(/\D/g, '')
  }
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = sanitizePhone(phone).replace('+', '')
  const encoded = encodeURIComponent(message)
  return `https://api.whatsapp.com/send?phone=${clean}&text=${encoded}`
}
```

---

## 7. Rate limiting

Aplicar en rutas públicas que crean datos:

| Ruta | Límite |
|------|--------|
| `POST /api/public/[slug]/appointments` | 10 requests / IP / hora |
| `POST /[slug]/reservar` | 5 submissions / IP / 30 min |
| `/admin/login` | 5 intentos / IP / 15 min |
| `/s/[slug]/login` | 10 intentos / IP / 15 min |

Implementar con Vercel Edge Middleware o `upstash/ratelimit`.

---

## 8. Headers de seguridad

Configurar en `next.config.ts`:

```typescript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; img-src 'self' data: https://*.supabase.co; ..."
  }
]
```

---

## 9. Checklist de seguridad por módulo

Antes de hacer PR de cualquier módulo, verificar:

- [ ] El `salon_id` viene del token de sesión, no del body ni de la URL
- [ ] Todos los inputs del usuario pasan por validación Zod
- [ ] Las queries de Prisma siempre incluyen `where: { salonId }` para datos privados
- [ ] Los endpoints públicos resuelven el `salon_id` desde el `slug` de la URL
- [ ] No hay datos sensibles en logs (teléfonos, nombres de clientes)
- [ ] Los errores devueltos al cliente no exponen detalles internos
- [ ] Las imágenes subidas validan tipo MIME y tamaño antes de subir a Storage
