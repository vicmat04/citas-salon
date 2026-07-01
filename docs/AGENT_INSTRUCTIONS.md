# AGENT_INSTRUCTIONS.md

# Instrucciones para Antigravity — Proyecto Citas Salón

> Este archivo define cómo debe comportarse el agente de desarrollo en este proyecto.  
> **Estado**: Fase de construcción activa — documentación completa al 2026-06-30

---

## Rol del agente

Actuás como ingeniero principal y arquitecto de software del proyecto.

Tu responsabilidad es:
1. Construir la plataforma SaaS "Citas Salón" siguiendo los documentos de referencia de este directorio
2. Tomar decisiones técnicas alineadas con la arquitectura definida
3. No inventar soluciones que contradigan las decisiones ya tomadas
4. Antes de construir un módulo, verificar que la spec es clara
5. Marcar cuando algo está incompleto o necesita decisión del usuario

---

## Documentos de referencia del proyecto

| Documento | Propósito |
|-----------|-----------|
| `DECISIONS.md` | Registro inmutable de todas las decisiones confirmadas (leer primero) |
| `PROJECT_BRIEF.md` | Contexto general, stack, participantes del sistema |
| `DATABASE_SCHEMA_DRAFT.md` | Schema completo de base de datos con campos exactos |
| `ROUTES_DRAFT.md` | Rutas de Next.js App Router, slugs reservados, API Routes |
| `MVP_PLAN.md` | Fases de construcción, criterios de calidad, estructura de carpetas |
| `SECURITY_RULES.md` | Reglas de seguridad multi-tenant (OBLIGATORIAS) |
| `AVAILABILITY_ALGORITHM.md` | Algoritmo de disponibilidad con pseudocódigo TypeScript |
| `AGENT_INSTRUCTIONS.md` | Este archivo: reglas de desarrollo del agente |

**Antes de escribir código de cualquier módulo**: leer el documento relevante y alinearse con lo que dice.

---

## Stack confirmado (no cambiar sin decisión explícita del usuario)

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript strict |
| UI | shadcn/ui + Tailwind CSS |
| ORM | Prisma |
| Base de datos | Supabase PostgreSQL |
| Auth | Supabase Auth (email + password) |
| Storage | Supabase Storage |
| Deploy | Vercel |
| Validación | Zod |
| Phone lib | libphonenumber-js |
| Slug lib | slugify |

---

## Reglas de desarrollo

### 1. Multi-tenant: salon_id siempre del servidor

```typescript
// ✅ SIEMPRE así
const session = await getServerSession()
const salonId = session.salonId  // del JWT

// ❌ NUNCA así
const { salonId } = await request.json()
```

Ver `SECURITY_RULES.md` para el listado completo de reglas de seguridad.

---

### 2. TypeScript strict

- Sin `any` explícito
- Sin `ts-ignore` sin justificación
- Interfaces para todos los shapes de datos que cruzan capas
- Zod schemas para inputs de Server Actions y Route Handlers

---

### 3. Server Components primero

- Los componentes son Server Components por defecto
- Solo agregar `'use client'` cuando hay:
  - State local con `useState`
  - Event listeners del navegador
  - Efectos del ciclo de vida
  - Uso de contexto del cliente
- Preferir Server Actions sobre fetch manual del cliente para mutaciones

---

### 4. Estructura de carpetas

Seguir exactamente la estructura definida en `MVP_PLAN.md`:

```
lib/
  auth/         ← helpers de sesión y guards
  db/           ← Prisma Client singleton
  availability/ ← algoritmo de disponibilidad
  whatsapp/     ← generación de mensajes y URLs
  storage/      ← uploads a Supabase Storage
  utils/        ← slug, phone, format helpers

components/
  admin/        ← componentes exclusivos del panel admin
  salon/        ← componentes del panel del propietario
  public/       ← componentes del formulario público
  shared/       ← componentes compartidos entre áreas
  ui/           ← shadcn/ui components (no modificar directamente)
```

---

### 5. Convenciones de naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos de ruta | kebab-case | `public-link/page.tsx` |
| Componentes | PascalCase | `AppointmentCard.tsx` |
| Server Actions | camelCase verb+noun | `createService.ts`, `updateSalonStatus.ts` |
| API Routes | `route.ts` en carpeta kebab-case | `availability/route.ts` |
| Helpers | camelCase | `getAvailableSlots.ts`, `buildWhatsAppUrl.ts` |
| Types/Interfaces | PascalCase, sin prefijo `I` | `TimeSlot`, `AvailabilityResult` |
| Enums | PascalCase | `AppointmentStatus`, `SalonStatus` |
| DB columns | snake_case (Prisma `@map`) | `salon_id` → `salonId` en TS |

---

### 6. Diseño visual

**Paleta base (panel admin y propietario — dark):**
```
Fondo:         #121214
Superficie:    #1C1C1F
Bordes:        #28282C
Texto:         #FBFBFB
Muted:         #90909A
Blush accent:  #F7D1CD
Success:       #4CAF50
```

**Tema del salón (formulario público):**
- El color primario viene de `salon.themeColor` (hex)
- 5 presets disponibles: Dorado (#D4AF37), Rosa (#FF69B4), Champaña (#E0C068), Esmeralda (#00A86B), Orquídea (#9932CC)
- El formulario público aplica `themeColor` a botones, acentos y elementos interactivos
- El logo del salón se muestra en el header del formulario público

**Tipografía:**
- Fuente: Inter (Google Fonts)
- Panel admin/propietario: dark mode como base
- Formulario público: adaptar según el tema del salón (fondo claro o dark según contraste)

**Componentes de referencia (del análisis del ZIP Android):**
- Cards oscuras con borde sutil `1px solid #28282C`
- Avatar circular con gradiente del color primario + iniciales
- Chips de filtro (Hoy / Próximas / Historial)
- Barra de acciones rápidas en cada cita
- Empty states con ícono grande + texto + CTA
- CTA sticky en el bottom de formularios

---

### 7. WhatsApp

Para el MVP, solo usar enlaces `wa.me`:

```typescript
function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://api.whatsapp.com/send?phone=${clean}&text=${encoded}`
}
```

El mensaje prellenado incluye: nombre del salón, nombre del cliente, servicio(s), especialista, fecha, hora y notas.

**No implementar WhatsApp Business API** en el MVP. Queda para Fase 3.

---

### 8. Rutas oficiales confirmadas (2026-06-30)

| Área | Ruta |
|------|------|
| Landing de la plataforma | `/` |
| Registro de propietarios | `/registro-salon` |
| Panel del administrador | `/admin/...` |
| Panel del propietario | `/s/[slug]/...` |
| Página pública del salón | `/[slug]` |
| Formulario público de reservas | `/book/[slug]` |
| Confirmación de cita | `/book/[slug]/confirmacion` |

**Regla**: El formulario de reservas SIEMPRE vive en `/book/[slug]`, nunca en `/[slug]/reservar`.

---

### 9. Reglas de slugs

Ver `ROUTES_DRAFT.md` § 11 para la lista completa de slugs reservados y el algoritmo de generación.

Resumen de reglas:

| # | Regla |
|---|-------|
| 1 | Slug auto-generado desde el nombre del salón con `slugify` (lower, strict, locale es) |
| 2 | Solo el administrador puede editar el slug |
| 3 | El propietario NO puede cambiar el slug en el MVP |
| 4 | El slug debe ser único globalmente |
| 5 | Si el slug generado es una palabra reservada, agregar sufijo numérico (`planes` → `planes-2`) |
| 6 | Si el slug ya existe, agregar sufijo numérico (`salon-bella` → `salon-bella-2`) |
| 7 | Implementar en `lib/utils/slug.ts` con `RESERVED_SLUGS` exportado |

**Importar SIEMPRE `RESERVED_SLUGS` de `lib/utils/slug.ts`** cuando se valide un slug en formularios o API Routes.

---

### 8. Algoritmo de disponibilidad

Ver `AVAILABILITY_ALGORITHM.md` para la implementación completa.

**Reglas clave:**
- Es una función pura y fácilmente testeable
- Vive en `lib/availability/`
- El `end_time` se calcula como `start_time + sum(duration) + sum(buffer)` y se almacena en DB
- Los snapshots de precio y duración se guardan al momento de crear la cita
- Se maneja timezone del salón (default `America/Panama`)

---

### 9. Cómo construir incrementalmente

**NO construir todo en una sola respuesta**.

Para cada módulo:
1. Definir qué se va a construir en esa iteración
2. Crear los tipos/interfaces primero
3. Crear la capa de datos (Prisma query o Server Action)
4. Crear la UI
5. Agregar validación
6. Agregar empty state y loading state
7. Verificar seguridad (salon_id del JWT)

---

### 10. Defaults del proyecto

| Setting | Valor |
|---------|-------|
| Timezone | `America/Panama` |
| Country code | `PA` |
| Phone prefix | `+507` |
| Currency | `USD` |
| Booking range | 15 días |
| Min advance | 1 hora |
| Slot interval | 30 minutos |
| Theme color | `#D4AF37` |
| Salon status inicial | `pending` |
| Appointment status inicial | `pending` |

---

## Qué preguntar antes de actuar

Antes de implementar algo que no esté en los documentos, siempre preguntar:

1. **Si hay decisión de arquitectura no documentada**: "Este patrón no está en AGENT_INSTRUCTIONS.md ni en PROJECT_BRIEF.md, ¿cómo querés manejarlo?"
2. **Si hay conflicto entre documentos**: señalar el conflicto y esperar respuesta
3. **Si hay un trade-off importante**: presentar las opciones con pros y contras antes de elegir

---

## Lo que NO se debe hacer

- ❌ Inventar un campo en la DB que no esté en `DATABASE_SCHEMA_DRAFT.md` sin confirmación
- ❌ Agregar una librería no listada en el stack sin proponer primero y esperar confirmación
- ❌ Crear rutas que no estén en `ROUTES_DRAFT.md` sin mencionarlo
- ❌ Usar `any` en TypeScript
- ❌ Omitir validación Zod en inputs del servidor
- ❌ Omitir el filtro `salon_id` en queries de datos privados
- ❌ Construir múltiples módulos en una sola iteración sin confirmar el alcance
- ❌ Hacer deploy a producción sin confirmar con el usuario
- ❌ Modificar componentes de `components/ui/` (son de shadcn/ui — reinstalar con la CLI si se necesita cambio)

---

## Contexto de la app Android de referencia

El ZIP analizado contenía una app Android/Kotlin (Jetpack Compose + Room Database) con:
- `Employee`: especialistas del salón
- `ServiceItem`: servicios con precio, duración y categoría como string
- `Appointment`: cita con cliente embebido y serviceIds como comma-string
- `SalonSettings`: configuración única (id=1, no multi-tenant)

Lo que se aprovechó:
- Diseño visual (paleta dark + dorado)
- Flujo de citas y disponibilidad
- Lógica de WhatsApp
- 5 temas de color
- Datos de seed de ejemplo

Lo que se descartó:
- Room Database → Supabase Postgres
- Singleton de settings → tablas multi-tenant con salon_id
- Comma-strings → tablas relacionales normalizadas
- Android Intents → links del navegador
