# MVP_PLAN.md

# Plan del MVP — Citas Salón

> **Objetivo**: Primera versión vendible de la plataforma SaaS de citas para salones.  
> **Duración estimada**: 4 semanas  
> **Resultado esperado**: Un propietario real puede configurar su salón, compartir su enlace y recibir citas desde el día 1.

---

## Lo que incluye el MVP

| # | Funcionalidad |
|---|--------------|
| 1 | Proyecto Next.js 15 configurado con TypeScript, Tailwind y shadcn/ui |
| 2 | Base de datos Supabase Postgres con Prisma |
| 3 | Autenticación con Supabase Auth (email + password) |
| 4 | Panel administrador de plataforma |
| 5 | Creación y gestión de salones desde el panel admin |
| 6 | Panel del propietario por slug |
| 7 | Configuración completa del salón (nombre, logo, tema, dirección, teléfono) |
| 8 | CRUD de categorías de servicios |
| 9 | CRUD de servicios (precio, duración, buffer, categoría) |
| 10 | CRUD de especialistas (foto, especialidad, disponibilidad) |
| 11 | Editor de horarios laborales por día de semana |
| 12 | Bloqueo de fechas completas |
| 13 | Bloqueo de horarios específicos |
| 14 | Formulario público de reservas (wizard multi-step) |
| 15 | Cálculo de disponibilidad (fechas + horarios) |
| 16 | Creación de cita desde formulario público |
| 17 | Creación manual de cita desde el panel del propietario |
| 18 | Estados de cita (pending, confirmed, cancelled, completed, no_show) |
| 19 | Confirmación por WhatsApp con mensaje prellenado |
| 20 | Enlace público único por salón |
| 21 | Código QR del enlace público |
| 22 | Vista de clientes del salón |
| 23 | UI responsive y mobile-first |

---

## Lo que NO incluye el MVP

| Funcionalidad | Fase |
|--------------|------|
| Pagos en línea | Fase 3 |
| WhatsApp Business API | Fase 3 |
| Recordatorios automáticos | Fase 2 |
| Correos transaccionales automáticos | Fase 2 |
| Magic link para propietarios | Fase 2 |
| Notificaciones push al propietario | Fase 2 |
| Reportes avanzados | Fase 2 |
| Exportación de citas | Fase 2 |
| Múltiples sucursales | Fase 3 |
| Roles internos del salón (manager, recepcionista) | Fase 2 |
| Disponibilidad de múltiples especialistas en paralelo | Fase 2 |
| Google Calendar sync | Fase 3 |
| PWA instalable | Fase 2 |
| App móvil nativa | Fuera de alcance |
| IA para respuestas | Fase 3 |

---

## Plan de construcción por fases

### Fase 1 — Base técnica (Semana 1, Días 1-3)

**Objetivo**: Proyecto funcionando, DB conectada, auth básica.

```
[x] Crear proyecto Next.js 15 con TypeScript
[x] Instalar y configurar Tailwind CSS
[x] Instalar y configurar shadcn/ui
[x] Conectar Supabase (Postgres + Auth + Storage)
[x] Instalar Prisma y configurar schema completo
[x] Ejecutar migraciones iniciales
[x] Crear seed: admin + 1 salón demo + datos de prueba
[x] Configurar Supabase Auth para email+password
[x] Variables de entorno (.env.local + .env.example)
[ ] Deploy inicial en Vercel (ambiente de desarrollo)
```

**Archivos clave:**
```
prisma/schema.prisma
prisma/seed.ts
lib/db.ts                    ← singleton de Prisma Client
lib/supabase/client.ts       ← cliente de Supabase (browser)
lib/supabase/server.ts       ← cliente de Supabase (server)
middleware.ts                ← auth guards por ruta
next.config.ts
.env.example
```

---

### Fase 2 — Multi-tenant core + Auth (Semana 1, Días 4-5)

**Objetivo**: Sistema de roles y aislamiento de datos funcionando correctamente.

```
[ ] Middleware: guard para /admin/** (role = platform_admin)
[ ] Middleware: guard para /s/[slug]/** (salon_owner + slug match + estado active|trial)
[ ] Helper getServerSession() que extrae salon_id del JWT
[ ] Helper requireAdmin() para Server Actions de admin
[ ] Helper requireSalonOwner(slug) para Server Actions del propietario
[ ] Página de login del admin (/admin/login)
[ ] Página de login del propietario (/s/[slug]/login)
[ ] Callback de auth de Supabase → crear/sincronizar registro en users
```

**Regla de seguridad a verificar:**
- El `salon_id` NUNCA viene del body — siempre del JWT
- El `salonSlug` en la URL DEBE coincidir con el `salonSlug` del JWT

---

### Fase 3 — Panel Admin (Semana 2, Días 1-2)

**Objetivo**: El administrador puede gestionar todos los salones.

```
[ ] Layout del admin con sidebar y navegación
[ ] Dashboard admin: métricas globales (conteo de salones, estados)
[ ] Lista de salones con filtros por estado
[ ] Crear salón manualmente (form completo)
[ ] Ver detalle de salón (info + estado + plan + enlace público)
[ ] Editar salón (incluyendo slug — solo admin puede hacerlo)
[ ] Cambiar estado del salón: activar / suspender / cancelar
[ ] Ver citas de un salón específico (solo lectura)
[ ] Ver enlace público de cada salón + botón de copiar
```

---

### Fase 4 — Panel del Propietario: Configuración (Semana 2, Días 3-5)

**Objetivo**: El propietario puede configurar su salón completamente.

```
[ ] Layout del propietario con sidebar y slug en contexto
[ ] Dashboard del salón (citas de hoy + próximas N citas)
[ ] Configuración del salón:
    [ ] Nombre, slogan, teléfono, email, dirección
    [ ] Upload de logo a Supabase Storage
    [ ] Selector de color de tema (5 presets)
[ ] CRUD de categorías
[ ] CRUD de servicios (nombre, precio, duración, buffer, categoría)
[ ] CRUD de especialistas (nombre, especialidad, teléfono, foto)
    [ ] Toggle de disponibilidad por especialista
    [ ] Upload de foto a Supabase Storage
[ ] Asignar servicios a especialistas
```

---

### Fase 5 — Panel del Propietario: Horarios y Citas (Semana 3, Días 1-3)

**Objetivo**: El propietario puede configurar disponibilidad y gestionar citas.

```
[ ] Editor de horarios laborales por día de semana
[ ] Horarios individuales por especialista (override)
[ ] Bloquear fechas completas (selector de fecha + motivo)
[ ] Bloquear horarios específicos (fecha + inicio + fin + motivo)
[ ] Lista de citas con filtros: Hoy / Próximas / Historial
[ ] Búsqueda de citas (nombre, teléfono, servicio)
[ ] Cambiar estado de cita (confirmar, cancelar, completar, no-show)
[ ] Ver detalle de cita
[ ] Crear cita manualmente desde el panel
[ ] Botón "Enviar recordatorio por WhatsApp" desde la cita
[ ] Vista de clientes del salón
```

---

### Fase 6 — Formulario Público de Reservas (Semana 3, Día 4 — Semana 4, Día 2)

**Objetivo**: El cliente final puede reservar una cita sin necesidad de cuenta.

```
[ ] Página pública del salón (/[slug]):
    [ ] Header con logo + nombre + slogan del salón
    [ ] Color de tema aplicado (botones, acentos)
    [ ] Lista de servicios disponibles por categoría
    [ ] Botón "Reservar cita"

[ ] Wizard de reserva (/[slug]/reservar):
    Step 1: Selección de servicio(s)
    [ ] Grid de servicios con nombre, precio y duración
    [ ] Resaltar servicios seleccionados

    Step 2: Selección de especialista (opcional)
    [ ] Grid de especialistas disponibles para el servicio
    [ ] Opción "Sin preferencia"

    Step 3: Selección de fecha
    [ ] Strip horizontal de días disponibles (respeta días laborales + fechas bloqueadas)
    [ ] Deshabilitar fechas fuera del booking_range_days

    Step 4: Selección de horario
    [ ] Grid de slots disponibles/no disponibles
    [ ] Mostrar duración total del servicio seleccionado

    Step 5: Datos del cliente
    [ ] Nombre completo (requerido)
    [ ] Teléfono (requerido, default +507)
    [ ] Notas opcionales

    Step 6: Confirmación + WhatsApp
    [ ] Resumen de la cita (servicio, especialista, fecha, hora, precio)
    [ ] Guardar cita en DB con estado 'pending'
    [ ] Botón "Confirmar por WhatsApp" → abre wa.me con mensaje prellenado

[ ] API de disponibilidad (GET /api/public/[slug]/availability)
[ ] API de creación de cita (POST /api/public/[slug]/appointments)
[ ] Rate limiting en endpoints públicos
```

---

### Fase 7 — Pulido y QR (Semana 4, Días 3-5)

**Objetivo**: Experiencia pulida, lista para mostrar a un cliente real.

```
[ ] Empty states en todas las secciones (con ícono + texto + CTA)
[ ] Loading states / skeletons en listas y formularios
[ ] Toast notifications para acciones exitosas y errores
[ ] Validaciones visuales en todos los formularios (mensajes de error claros)
[ ] Responsive móvil en el formulario público (mobile-first)
[ ] Responsive en el panel del propietario
[ ] Página de enlace público (/s/[slug]/public-link):
    [ ] Mostrar la URL pública del salón
    [ ] Botón copiar
    [ ] QR generado con qrcode.react
    [ ] Instrucciones para compartir
[ ] Manejo de errores global (not-found, salon-suspended, etc.)
[ ] Meta tags SEO básicos en la página pública del salón
[ ] Revisión de seguridad: salon_id siempre del servidor
[ ] Prueba end-to-end del flujo completo de reserva
```

---

## Orden de prioridad por módulo

Si hay restricción de tiempo, el orden de corte es:

```
Prioridad 1 (BLOQUEANTE — no se puede lanzar sin esto):
  - Auth (admin + propietario)
  - Multi-tenant (salon_id en todas las queries)
  - Formulario público de reservas
  - Algoritmo de disponibilidad
  - Creación y confirmación de cita
  - WhatsApp con mensaje prellenado

Prioridad 2 (ESENCIAL para el propietario):
  - Panel del propietario: citas + estado
  - Servicios + especialistas
  - Horarios + bloqueos
  - Configuración del salón (nombre, logo, tema)

Prioridad 3 (IMPORTANTE pero no bloqueante):
  - Panel admin completo
  - Clientes
  - QR del enlace público
  - Empty states y skeletons

Prioridad 4 (POLISH):
  - Búsqueda de citas
  - Creación manual de cita desde el panel
  - Historial de cliente
  - Métricas del admin
```

---

## Criterios de calidad para cada módulo

Antes de dar por completado cualquier módulo:

- [ ] TypeScript sin errores (`tsc --noEmit`)
- [ ] Validación Zod en todos los inputs del servidor
- [ ] El `salon_id` viene del JWT, no del body
- [ ] Empty state implementado
- [ ] Loading state implementado
- [ ] Funciona en móvil (viewport < 640px)
- [ ] Funciona en desktop (viewport > 1024px)
- [ ] No hay console.error en producción

---

## Estructura de carpetas del proyecto

```
citas-salon/
  app/
    (admin)/
      layout.tsx
      login/page.tsx
      dashboard/page.tsx
      salons/
        page.tsx
        new/page.tsx
        [salonId]/page.tsx
    (salon)/
      s/[slug]/
        layout.tsx
        login/page.tsx
        dashboard/page.tsx
        appointments/
          page.tsx
          new/page.tsx
          [appointmentId]/page.tsx
        customers/page.tsx
        services/
          page.tsx
          categories/page.tsx
        specialists/
          page.tsx
          [specialistId]/page.tsx
        availability/page.tsx
        settings/page.tsx
        public-link/page.tsx
    (public)/
      page.tsx                    ← landing de la plataforma
      registro-salon/page.tsx
      [slug]/
        page.tsx                  ← página pública del salón
        reservar/
          page.tsx
          confirmacion/page.tsx
    api/
      admin/[...]/route.ts
      salon/[...]/route.ts
      public/[slug]/
        route.ts
        availability/route.ts
        appointments/route.ts
  components/
    admin/
    salon/
    public/
    shared/
    ui/                           ← shadcn/ui components
  lib/
    auth/
      session.ts
      helpers.ts
    db/
      index.ts                    ← Prisma Client singleton
    availability/
      get-available-slots.ts
      time-utils.ts
    whatsapp/
      generate-message.ts
      build-url.ts
    storage/
      upload-logo.ts
      upload-photo.ts
    utils/
      slug.ts
      phone.ts
      format.ts
  prisma/
    schema.prisma
    seed.ts
    migrations/
  public/
    icons/
  middleware.ts
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  .env.local
  .env.example
```