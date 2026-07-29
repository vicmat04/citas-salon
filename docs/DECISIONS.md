# DECISIONS.md

# Decisiones del proyecto — Citas Salón SaaS

> Registro cronológico e inmutable de decisiones técnicas y de producto.  
> Este archivo es de solo lectura para los agentes de desarrollo.  
> Para agregar una decisión, añadirla al final con fecha y contexto.

---

## Decisiones confirmadas al 2026-06-30

---

### D-01 · El ZIP Android es solo referencia

**Fecha:** 2026-06-30  
**Tipo:** Producto

La app Android (Kotlin + Jetpack Compose + Room Database) es material de referencia visual, funcional y conceptual. **No es la base de código del nuevo producto.** El nuevo producto es una plataforma web SaaS construida desde cero.

Lo que se aprovecha: paleta de colores, flujo de citas, lógica de disponibilidad, estructura de servicios y especialistas, lógica de WhatsApp.

---

### D-02 · El producto es un SaaS web multi-tenant

**Fecha:** 2026-06-30  
**Tipo:** Producto / Arquitectura

El nuevo producto no es una app de salón individual. Es una plataforma SaaS donde:

- El administrador de la plataforma gestiona todos los salones
- Cada propietario tiene su propio espacio aislado
- Los clientes finales acceden sin cuenta a través de un enlace público

**Regla de oro**: todo dato operativo debe estar ligado a `salon_id`.

---

### D-03 · Stack tecnológico

**Fecha:** 2026-06-30  
**Tipo:** Técnica

| Capa | Tecnología | Razón |
| ------ | ----------- | ------- |
| Framework | Next.js 15 (App Router) | SSR, Server Components, Server Actions nativo |
| Lenguaje | TypeScript strict | Seguridad de tipos en toda la codebase |
| UI | shadcn/ui + Tailwind CSS | Componentes accesibles + utilidades CSS |
| ORM | Prisma | Migraciones automáticas, relaciones complejas, DX superior |
| Base de datos | Supabase PostgreSQL | Postgres + Auth + Storage en un producto |
| Auth | Supabase Auth | Incluido con Supabase, sin overhead adicional |
| Storage | Supabase Storage | Incluido con Supabase, CDN integrado |
| Deploy | Vercel | Edge network, integración nativa con Next.js |
| Validación | Zod | Runtime validation + inferencia de tipos TypeScript |

Drizzle fue evaluado como alternativa a Prisma. Se eligió Prisma por mejor soporte de relaciones complejas y migraciones automáticas para el modelo de datos de 18+ tablas.

---

### D-04 · Auth: Supabase Auth directamente, no NextAuth

**Fecha:** 2026-06-30  
**Tipo:** Técnica

Se usa **Supabase Auth directamente**, sin NextAuth. Razones:

- Supabase Auth está incluido en el bundle de Supabase
- Elimina una dependencia adicional
- Integración más directa con la base de datos y RLS
- Suficiente para los requisitos del MVP

NextAuth queda descartado en MVP. Podría evaluarse en Fase 3 si se agregan proveedores OAuth externos.

---

### D-05 · Login MVP: email + password

**Fecha:** 2026-06-30  
**Tipo:** Producto / Técnica

El login de propietarios en el MVP usa **email + contraseña** a través de Supabase Auth.

Magic link queda **para Fase 2**. Es más amigable para propietarios no técnicos, pero requiere configurar un servicio de email transaccional, lo cual se pospone para no bloquear el MVP.

El login del administrador de plataforma también usa email + contraseña con rol `platform_admin`.

---

### D-06 · Base de datos: Supabase Postgres

**Fecha:** 2026-06-30  
**Tipo:** Técnica

Se usa **PostgreSQL alojado en Supabase**.

Neon fue evaluado como alternativa. Se eligió Supabase porque incluye Auth + Storage + Postgres en un solo producto, reduciendo la cantidad de servicios externos a gestionar en el MVP.

---

### D-07 · Storage: Supabase Storage

**Fecha:** 2026-06-30  
**Tipo:** Técnica

Las imágenes (logos de salones, fotos de especialistas) se almacenan en **Supabase Storage**.

Las URLs resultantes son públicas para logos/fotos y se almacenan como `TEXT` en la base de datos.

---

### D-08 · Deploy: Vercel

**Fecha:** 2026-06-30  
**Tipo:** Técnica

El deploy objetivo es **Vercel**, que ofrece integración nativa con Next.js, edge network global y preview deployments por rama.

---

### D-09 · Ruta formulario público de reservas: `/book/[slug]`

**Fecha:** 2026-06-30  
**Tipo:** Producto / Técnica

La ruta oficial para el wizard de reserva es **`/book/[slug]`**, no `/[slug]/reservar`.

Razones:

- Elimina ambigüedad entre la página del salón y el flujo de reserva
- Permite compartir enlaces directos de reserva (`tuapp.com/book/mi-salon`)
- Separa claramente responsabilidades entre página pública y wizard
- Elimina posibles conflictos futuros si `/[slug]` evoluciona con sub-rutas

---

### D-10 · Página pública del salón: `/[slug]`

**Fecha:** 2026-06-30  
**Tipo:** Producto / Técnica

La ruta de la mini-landing pública de cada salón es **`/[slug]`**.

Muestra: logo, nombre, slogan, servicios activos, botón "Reservar cita" (→ `/book/[slug]`).

No requiere autenticación. Carga los datos por `slug` desde el servidor.

---

### D-11 · Panel del propietario: `/s/[slug]`

**Fecha:** 2026-06-30  
**Tipo:** Técnica

El panel privado del propietario vive en **`/s/[slug]/...`**.

Requiere sesión de Supabase Auth con rol `salon_owner` y `salonSlug === slug` en el JWT.

El prefijo `/s/` es una ruta estática que Next.js prioriza sobre el catch-all `/[slug]`, eliminando conflictos.

---

### D-12 · Panel del administrador: `/admin`

**Fecha:** 2026-06-30  
**Tipo:** Técnica

El panel del administrador de la plataforma vive en **`/admin/...`**.

Requiere sesión con `role === 'platform_admin'`. Es la única área sin restricción de `salon_id`.

---

### D-13 · Slug: generación automática

**Fecha:** 2026-06-30  
**Tipo:** Producto / Técnica

El slug de cada salón se **genera automáticamente** desde el nombre del salón usando `slugify` con opciones `{ lower: true, strict: true, locale: 'es' }`.

El propietario **no puede elegir su slug** en el MVP. Solo el administrador de plataforma puede editar el slug.

---

### D-14 · Solo el admin puede editar el slug

**Fecha:** 2026-06-30  
**Tipo:** Producto

El slug es el identificador público del salón. Una vez generado y compartido, cambiarlo rompe los enlaces existentes. Por eso, únicamente el administrador de plataforma puede modificarlo, y solo cuando sea estrictamente necesario.

**Consideración futura**: si el slug cambia, implementar redirects 301 desde el slug anterior al nuevo.

---

### D-15 · Slug único globalmente

**Fecha:** 2026-06-30  
**Tipo:** Técnica

El slug tiene un constraint `UNIQUE` en la tabla `salons`. Si el slug generado ya existe, se agrega sufijo numérico (`salon-bella` → `salon-bella-2`). El algoritmo itera hasta encontrar un slug libre.

---

### D-16 · Slugs reservados

**Fecha:** 2026-06-30  
**Tipo:** Técnica / Seguridad

Existe una lista de slugs que ningún salón puede usar porque colisionan con rutas del sistema. La lista completa está en `ROUTES_DRAFT.md § 11` y en `lib/utils/slug.ts` como `RESERVED_SLUGS`.

Ejemplos: `admin`, `s`, `api`, `book`, `login`, `registro-salon`, `planes`, `precios`, `dashboard`, etc.

Si el slug generado coincide con una palabra reservada, se agrega sufijo numérico automáticamente.

---

### D-17 · Timezone por defecto: `America/Panama`

**Fecha:** 2026-06-30  
**Tipo:** Producto / Técnica

El timezone por defecto de todos los salones nuevos es **`America/Panama`** (UTC-5, sin cambio de horario de verano).

Todas las fechas y horas se almacenan en **UTC** en la base de datos. La conversión al timezone del salón ocurre en la capa de aplicación, nunca en la DB.

Cada salón tiene su propio campo `timezone` que puede ser modificado por el admin o el propietario.

---

### D-18 · País por defecto: `PA` (Panamá)

**Fecha:** 2026-06-30  
**Tipo:** Producto

El campo `country_code` de todos los salones nuevos tiene valor por defecto `'PA'`.

---

### D-19 · Código telefónico por defecto: `+507`

**Fecha:** 2026-06-30  
**Tipo:** Producto

El campo `phone_country_code` de todos los salones nuevos tiene valor por defecto `'+507'`.

Los números de teléfono se normalizan con `libphonenumber-js` al guardar en la base de datos (formato E.164).

---

### D-20 · Moneda por defecto: `USD`

**Fecha:** 2026-06-30  
**Tipo:** Producto

El campo `currency` de todos los salones nuevos tiene valor por defecto `'USD'`.

Los precios se almacenan como `DECIMAL(10,2)`. No hay conversión de moneda en el MVP.

---

### D-21 · No pagos en línea en el MVP

**Fecha:** 2026-06-30  
**Tipo:** Producto

El MVP **no incluye pagos en línea**.

El estado y plan de cada salón se gestionan **manualmente** desde el panel del administrador de plataforma. No se integra Stripe ni ningún gateway de pago en la Fase 1.

Los pagos quedan planificados para Fase 3.

---

### D-22 · WhatsApp en MVP: solo enlace prellenado

**Fecha:** 2026-06-30  
**Tipo:** Producto / Técnica

En el MVP, WhatsApp funciona mediante **enlaces `wa.me` con mensaje prellenado**. El cliente hace clic, se abre WhatsApp, y envía el mensaje manualmente al número del salón.

```
https://api.whatsapp.com/send?phone={phone}&text={encodedMessage}
```

WhatsApp Business API (automatización de mensajes) queda para **Fase 3**.

---

### D-23 · `salon_id` obligatorio en todas las queries privadas

**Fecha:** 2026-06-30  
**Tipo:** Arquitectura / Seguridad

Toda query Prisma que acceda a datos operativos (citas, servicios, especialistas, clientes, horarios, bloqueos) **DEBE** incluir `where: { salonId }`.

Esta regla aplica a:

- Server Actions del panel del propietario
- API Routes del panel del propietario
- Cualquier lectura o escritura de datos que pertenezca a un salón específico

El administrador de plataforma es la única excepción (puede consultar cualquier salón explícitamente).

---

### D-24 · `salon_id` nunca del body del cliente

**Fecha:** 2026-06-30  
**Tipo:** Arquitectura / Seguridad

El `salon_id` usado en las queries **siempre proviene del token de sesión del servidor (JWT)**. Nunca del body, query params o headers de la request del cliente.

```typescript
// ✅ CORRECTO
const session = await getServerSession()
const salonId = session.salonId  // extraído del JWT firmado

// ❌ INCORRECTO — vulnerabilidad de inyección de salon_id
const { salonId } = await request.json()
```

Esta regla previene que un atacante pueda acceder a datos de otro salón simplemente modificando el body de una request.

---

### D-25 · Snapshots de precio y duración en citas

**Fecha:** 2026-06-30  
**Tipo:** Técnica

Al crear una cita, se guardan **copias inmutables** de los precios y duraciones en el momento de la reserva:

- `appointment_services.price_snapshot` — precio del servicio al momento de la cita
- `appointment_services.duration_snapshot` — duración en minutos al momento de la cita
- `appointments.total_price_snapshot` — suma de todos los precios de los servicios
- `appointments.total_duration_minutes` — suma de todas las duraciones (sin buffers)

Esto garantiza que si el propietario cambia los precios o duraciones de sus servicios después, las citas históricas no se ven afectadas.

---

### D-26 · Recordatorios operacionales mediante endpoint cron portable

**Fecha:** 2026-07-29
**Tipo:** Técnica / Arquitectura / Seguridad

Los recordatorios de citas se ejecutan cada 15 minutos mediante
`GET /api/cron/notifications`, con runtime Node y autenticación
`Authorization: Bearer <CRON_SECRET>`. Vercel invoca el endpoint según
`vercel.json`; si el plan desplegado no admite esa frecuencia, un scheduler externo
puede invocar exactamente el mismo endpoint y contrato, sin crear una segunda ruta.

El rollout se realiza después de aplicar la migración del outbox: desplegar primero
con `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED=false` y
`APPOINTMENT_REMINDERS_ENABLED=false`, validar autenticación, consulta temporal,
contadores sanitizados y backlog, activar envíos operacionales y por último los
recordatorios. `APPOINTMENT_REMINDER_HOURS` permanece fijado en `24` durante esta
fase y `NOTIFICATION_RETENTION_DAYS` controla la purga por lotes.

Rollback: establecer `APPOINTMENT_REMINDERS_ENABLED=false` para detener nuevos
recordatorios y, ante riesgo del proveedor, también
`OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED=false`. No se revierten citas ni se
reintentan entregas `unknown_after_send`; el outbox se conserva para trazabilidad.
La rotación de `CRON_SECRET` invalida de inmediato schedulers antiguos.

---

## Plantilla para nuevas decisiones

Cuando se tome una decisión, agregarla con el siguiente formato:

```markdown
### D-XX · Título de la decisión

**Fecha:** YYYY-MM-DD  
**Tipo:** Producto | Técnica | Arquitectura | Seguridad | UX

Descripción de qué se decidió, por qué y qué alternativas se descartaron.

Impacto en el código / archivos afectados (si aplica).
```
