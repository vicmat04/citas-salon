# PROJECT_BRIEF.md

# Proyecto: Citas Salón — Plataforma SaaS de citas para salones

> **Estado:** Documentación completa — Lista para iniciar construcción  
> **Versión:** 3.0 (decisiones finales confirmadas 2026-06-30)  
> **Nombre provisional:** Citas Salón

---

## 1. Origen del proyecto

Este proyecto nace de una app Android/Kotlin (Jetpack Compose + Room Database) usada como referencia visual, funcional y conceptual. Esa app gestionaba citas para un único salón local.

El nuevo objetivo es reconstruir el producto como una **plataforma web SaaS multi-tenant**: muchos salones, una sola plataforma, cada salón completamente aislado.

La app Android original fue analizada y sirvió para extraer:
- Diseño visual y paleta de colores
- Flujo de citas y disponibilidad
- Catálogo de servicios y especialistas
- Configuración de horarios y bloqueos
- Lógica de WhatsApp con mensaje prellenado

---

## 2. Participantes del sistema

### 2.1 Administrador de la plataforma

Hay un único administrador: el dueño del negocio SaaS.

Accede mediante `/admin/login` con email y contraseña.

Puede:
- Ver y gestionar todos los salones
- Crear salones manualmente
- Activar, suspender o cancelar salones
- Editar el slug de cualquier salón
- Ver métricas globales (citas totales, salones activos, etc.)
- Regenerar acceso a propietarios
- Ver y editar planes de suscripción (manualmente, sin pagos online en MVP)
- Gestionar el estado y plan de cada salón manualmente

El administrador **no tiene restricciones de `salon_id`**.

---

### 2.2 Propietario del salón

Es el cliente del SaaS. Gestiona su negocio desde su panel privado.

Accede mediante `/s/[slug]/login` con email y contraseña (Supabase Auth).

Puede configurar:
- Información del salón: nombre, slogan, teléfono, correo, dirección, logo, color de tema
- Categorías de servicios
- Servicios: nombre, descripción, precio, duración, categoría, buffer
- Especialistas: nombre, teléfono, email, especialidad, foto, disponibilidad
- Relación especialista ↔ servicio (qué especialista hace qué servicio)
- Horarios laborales por día de semana
- Horarios individuales por especialista (override del horario general)
- Fechas bloqueadas (día completo, para salón o para especialista)
- Horarios bloqueados (slots específicos, para salón o especialista)

Puede gestionar:
- Citas: ver, crear manualmente, editar, cambiar estado
- Clientes: ver historial, editar datos
- Enlace público: copiar URL + descargar QR

El propietario **solo puede ver datos de su propio salón**. Esta restricción se aplica en backend, base de datos y middleware.

---

### 2.3 Cliente final del salón

Es quien reserva la cita. **No necesita cuenta**.

Accede al enlace público compartido por el propietario: `https://app.com/[slug]`

Puede:
1. Ver información del salón
2. Seleccionar servicio
3. Seleccionar especialista (si aplica)
4. Seleccionar fecha disponible
5. Seleccionar horario disponible
6. Ingresar nombre completo, teléfono y notas opcionales
7. Confirmar cita → se guarda en DB → se abre WhatsApp con mensaje prellenado

---

## 3. Stack técnico (confirmado)

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript (strict) |
| UI Components | shadcn/ui |
| Estilos | Tailwind CSS |
| ORM | Prisma |
| Base de datos | Supabase PostgreSQL |
| Autenticación | Supabase Auth |
| Storage | Supabase Storage (logos, fotos) |
| Deploy | Vercel |
| Validación | Zod |
| PWA | Pendiente (Fase 2) |

---

## 4. Decisiones técnicas confirmadas

| Tema | Decisión |
|------|---------|
| Auth de propietarios | Email + contraseña (Supabase Auth). Magic link queda para Fase 2 |
| Auth de admin | Email + contraseña con rol `platform_admin` |
| Pagos | No en MVP. Estado y plan se gestionan manualmente desde el panel admin |
| ORM | Prisma (sobre Drizzle por relaciones complejas y migraciones automáticas) |
| DB | Supabase Postgres (incluye Auth + Storage en un solo producto) |
| Slug | Auto-generado desde el nombre del salón. Solo el admin puede editarlo. El propietario NO puede cambiarlo en el MVP |
| Slugs reservados | Lista definida en `ROUTES_DRAFT.md` § 11 y en `lib/utils/slug.ts` |
| Ruta página pública del salón | `/[slug]` |
| Ruta formulario de reservas | `/book/[slug]` — decisión confirmada el 2026-06-30 |
| Ruta panel del propietario | `/s/[slug]/...` |
| Ruta panel del administrador | `/admin/...` |
| Timezone por defecto | `America/Panama` |
| Código de país por defecto | PA |
| Prefijo telefónico por defecto | +507 |
| Moneda por defecto | USD |
| Nombre provisional | Citas Salón |
| Tema visual en form público | El formulario público usa el color, logo y nombre del salón |

---

## 5. Principio multi-tenant (regla fundamental)

Todos los datos operativos tienen `salon_id`.

```
services.salon_id
specialists.salon_id
appointments.salon_id
customers.salon_id
service_categories.salon_id
blocked_dates.salon_id
blocked_slots.salon_id
business_hours.salon_id
specialist_hours.salon_id
specialist_services.salon_id
```

El `salon_id` **siempre viene del token de sesión del servidor**, nunca del body de la request.

```typescript
// ✅ Correcto
const session = await getServerSession()
const salonId = session.salonId  // del JWT firmado

// ❌ Incorrecto
const { salonId } = await request.json() // vulnerable
```

---

## 6. Entidades de negocio

### Derivadas del análisis del ZIP Android + expansión para SaaS:

| Entidad | Descripción |
|---------|-------------|
| `users` | Administrador de plataforma y propietarios de salones |
| `salons` | Cada salón registrado en la plataforma |
| `salon_members` | Relación usuario ↔ salón con rol interno |
| `service_categories` | Categorías de servicios por salón |
| `services` | Servicios ofrecidos por el salón |
| `specialists` | Especialistas del salón |
| `specialist_services` | Qué especialista puede hacer qué servicio |
| `business_hours` | Horarios laborales del salón por día de semana |
| `specialist_hours` | Horarios individuales por especialista (override) |
| `blocked_dates` | Fechas bloqueadas (salón completo o especialista) |
| `blocked_slots` | Horarios bloqueados específicos |
| `customers` | Clientes de cada salón |
| `appointments` | Citas agendadas |
| `appointment_services` | Servicios incluidos en una cita (multi-servicio) |
| `plans` | Planes de suscripción de la plataforma |
| `subscriptions` | Suscripción activa de cada salón |
| `access_tokens` | Tokens de invitación y recuperación de acceso |
| `audit_logs` | Log de acciones importantes |

---

## 7. Estados de la plataforma

### Estados de salón
| Estado | Descripción |
|--------|-------------|
| `pending` | Registrado, esperando revisión del admin |
| `trial` | En período de prueba activo |
| `active` | Activo y pagado (o manual) |
| `suspended` | Suspendido temporalmente |
| `cancelled` | Cancelado definitivamente |

### Estados de cita
| Estado | Descripción |
|--------|-------------|
| `pending` | Solicitada, pendiente de confirmación del salón |
| `confirmed` | Confirmada por el salón |
| `cancelled` | Cancelada |
| `completed` | Realizada |
| `no_show` | Cliente no asistió |
| `rescheduled` | Reagendada |

### Fuentes de cita
| Fuente | Descripción |
|--------|-------------|
| `public_form` | Creada desde el formulario público por el cliente final |
| `owner_panel` | Creada manualmente por el propietario |
| `admin_panel` | Creada desde el panel admin |

---

## 8. WhatsApp (MVP)

En el MVP, WhatsApp funciona mediante enlaces prellenados.

Flujo:
1. Cliente completa el formulario y confirma la cita
2. La cita se guarda en la base de datos con estado `pending`
3. Se genera la URL: `https://api.whatsapp.com/send?phone={phone}&text={encodedMessage}`
4. Se abre WhatsApp en el navegador o app del cliente
5. El cliente envía el mensaje manualmente al número del salón

Formato del mensaje prellenado:
```
*¡Hola, {NOMBRE_SALON}!* 🌸✨

Quiero confirmar mi cita:

💅 *Servicio:* {SERVICIO(S)}
💇 *Especialista:* {ESPECIALISTA}
📅 *Fecha:* {FECHA}
⏰ *Hora:* {HORA}
👤 *Nombre:* {NOMBRE_CLIENTE}
📱 *Teléfono:* {TELEFONO_CLIENTE}

{NOTAS_OPCIONALES}

Gracias.
```

**Fase 2**: WhatsApp Business API para notificaciones automáticas.

---

## 9. Diseño visual

### Referencia de la app Android
- Fondo oscuro profundo: `#121214`
- Superficie: `#1C1C1F`
- Bordes sutiles: `#28282C`
- Texto principal: `#FBFBFB`
- Texto secundario: `#90909A`
- Accent blush (labels de categoría): `#F7D1CD`
- Color de éxito: `#4CAF50`
- Dorado default: `#D4AF37`

### 5 temas de color para salones
| Tema | Color primario |
|------|--------------|
| Dorado Clásico | `#D4AF37` |
| Rosa Glamour | `#FF69B4` |
| Champaña Royal | `#E0C068` |
| Esmeralda Chic | `#00A86B` |
| Orquídea Moderna | `#9932CC` |

### Principios de UI
- Dark mode como base del panel (admin y propietario)
- Formulario público: usa el color del tema del salón + logo + nombre
- Mobile-first: formulario público optimizado para móvil
- shadcn/ui como sistema de componentes base
- Tipografía moderna: Inter o similar desde Google Fonts

---

## 10. Lo que se descarta de la app Android

| Elemento | Razón |
|----------|-------|
| Room Database | Reemplazado por Supabase Postgres |
| `SalonSettings.id = 1` | Un solo salón — incompatible con multi-tenant |
| `blockedDates` como comma-string | Reemplazado por tabla `blocked_dates` |
| `workDaysString` como comma-string | Reemplazado por tabla `business_hours` |
| `serviceIdsString` como comma-string | Reemplazado por tabla `appointment_services` |
| Android Intents / LocalContext | No aplica en web |
| StateFlow / Flow / Coroutines | Reemplazado por React state / React Query |
| ViewModel Android | Reemplazado por Server Components + Server Actions |
| Imágenes como URI local | Reemplazado por Supabase Storage URLs |

---

## 11. Fases del proyecto

### Fase 1 — MVP (4 semanas)
Ver `MVP_PLAN.md`

### Fase 2 — Expansión
- Magic link para propietarios
- Correos transaccionales automáticos
- Notificaciones al propietario cuando llega una nueva cita
- Reportes del salón (citas por día, ingresos estimados, clientes recurrentes)
- PWA instalable
- Historial completo de clientes
- Múltiples especialistas por servicio con disponibilidad individual

### Fase 3 — Escala
- WhatsApp Business API
- Pagos en línea (Stripe)
- Múltiples sucursales
- Campañas promocionales
- Google Calendar sync
- IA para respuestas automáticas
- Marketplace de plantillas visuales

---

## 12. Convenciones de desarrollo

- TypeScript strict en todo el proyecto
- Zod para validación de inputs en Server Actions y API Routes
- Componentes server-first: solo marcar `'use client'` cuando haya interactividad real
- Rutas API prefijadas con `/api/` para endpoints externos
- Server Actions para formularios del panel admin y propietario
- Nombres de archivos: `kebab-case` para rutas, `PascalCase` para componentes
- Separación clara de capas: `lib/db/`, `lib/auth/`, `lib/availability/`, `components/`
- El formulario público nunca usa datos del session — carga todo por `slug` público

### Documentos de referencia

Antes de construir cualquier módulo, leer los documentos correspondientes:

| Documento | Cuándo leerlo |
|-----------|---------------|
| `DECISIONS.md` | Al inicio de cada sesión de trabajo. Registro inmutable de decisiones |
| `SECURITY_RULES.md` | Antes de cualquier Server Action, API Route o query |
| `DATABASE_SCHEMA_DRAFT.md` | Antes de crear o modificar cualquier tabla o modelo Prisma |
| `ROUTES_DRAFT.md` | Antes de crear rutas, incluyendo rutas de API |
| `AVAILABILITY_ALGORITHM.md` | Antes de implementar cualquier lógica de disponibilidad |
| `MVP_PLAN.md` | Para verificar qué está en el MVP y qué no |
