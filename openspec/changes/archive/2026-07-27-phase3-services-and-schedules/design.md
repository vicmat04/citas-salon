# Technical Design: Service Catalog, Specialist Assignment, and Schedules (Phase 3)

## Architecture & Data Flow

This change implements dynamic service management, category organization, specialist service mapping, business operating hours, and blocked time schedules for salon tenants.

```text
+-----------------------------------------------------------------------------------+
|                            Next.js App Router UI                                  |
|  /s/[slug]/services   /s/[slug]/specialists   /s/[slug]/schedules (or settings)   |
+-----------------------------------------------------------------------------------+
                                         |
                                (Server Actions)
                                         v
+-----------------------------------------------------------------------------------+
|  app/actions/services.ts      app/actions/schedules.ts     app/actions/owner.ts   |
|  - Category CRUD              - BusinessHours              - Specialist-Service   |
|  - Service CRUD               - SpecialistHours              Assignments          |
|  - Active Toggles             - BlockedDates / Slots                              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                     lib/auth/helpers.ts (requireSalonOwner)                       |
|                       Enforces Tenant Isolation & Security                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       Prisma ORM & PostgreSQL Database                            |
| (ServiceCategory, Service, SpecialistService, BusinessHours, SpecialistHours, etc)|
+-----------------------------------------------------------------------------------+
```

---

## File Structure & Module Responsibilities

### 1. Server Actions

#### `app/actions/services.ts`

- `createCategory(formData: FormData, slug: string)`
- `updateCategory(categoryId: string, formData: FormData, slug: string)`
- `deleteCategory(categoryId: string, slug: string)`
  - *Validation Guard:* Queries `prisma.service.count({ where: { categoryId, salonId: salon.id } })`. If `count > 0`, fails with error message without deleting.
- `createService(formData: FormData, slug: string)`
  - *Defaults:* Sets `bufferMinutes = 10` if omitted or invalid.
- `updateService(serviceId: string, formData: FormData, slug: string)`
- `deleteService(serviceId: string, slug: string)`
- `toggleServiceActive(serviceId: string, slug: string)`

#### `app/actions/schedules.ts`

- `updateBusinessHours(hours: BusinessHoursInput[], slug: string)`
  - Validates `openTime < closeTime` for active days.
- `updateSpecialistHours(specialistId: string, hours: SpecialistHoursInput[], slug: string)`
- `addBlockedDate(formData: FormData, slug: string)`
- `deleteBlockedDate(blockedDateId: string, slug: string)`
- `addBlockedSlot(formData: FormData, slug: string)`
- `deleteBlockedSlot(blockedSlotId: string, slug: string)`

#### `app/actions/owner.ts` (extended)

- `updateSpecialistServices(specialistId: string, serviceIds: string[], slug: string)`
  - Replaces `SpecialistService` records atomically for `(specialistId, salonId)`.

---

### 2. Business Logic Helpers (`lib/salons/schedules.ts`)

- `resolveEffectiveSpecialistSchedule(salonId: string, specialistId: string, dayOfWeek: number)`
  - Checks if `SpecialistHours` exist for that day.
  - If exists and `isAvailable === false`, returns unavailable.
  - If non-existent, falls back to `BusinessHours` for the salon.
- `isSlotBlocked(salonId: string, date: Date, time: string, specialistId?: string)`
  - Checks `BlockedDate` for full-day blocks.
  - Checks `BlockedSlot` for partial-day time range overlaps.

---

### 3. UI Components & Pages

#### `app/s/[slug]/(protected)/services/page.tsx`

- Fetches `ServiceCategory` list and `Service` list for the salon via Prisma.
- UI elements:
  - Header with "Nueva Categoría" and "Nuevo Servicio" trigger dialogs.
  - Category tabs for filtering services.
  - Service cards displaying price, duration, buffer time, assigned category, active badge, and quick action menu (Editar / Desactivar / Eliminar).

#### `app/s/[slug]/(protected)/specialists/page.tsx`

- Extended to display a "Servicios que realiza" section per specialist.
- Dialog for checking/unchecking services assigned to that specialist.

#### `app/s/[slug]/(protected)/schedules/page.tsx` (or `settings/hours-form.tsx`)

- Tab 1: **Horarios del Salón** (Lunes a Domingo, switches para abierto/cerrado, selecciones de hora apertura y cierre).
- Tab 2: **Horarios por Especialista** (Selector de especialista, configuración de turnos).
- Tab 3: **Bloqueos de Fechas y Horarios** (Formulario para agregar bloqueos por festivos, mantenimientos o compromisos y lista con botón para eliminar bloqueos existentes).

---

## Data Migration & Test Plan

- No schema migrations are required because all database models (`ServiceCategory`, `Service`, `SpecialistService`, `BusinessHours`, `SpecialistHours`, `BlockedDate`, `BlockedSlot`) are already present in `schema.prisma`.
- Unit & integration tests to add:
  - `app/actions/services.test.ts`: Test category CRUD, deletion prevention when services exist, service CRUD, price/duration validations, and default 10-minute buffer.
  - `app/actions/schedules.test.ts`: Test `updateBusinessHours` validation (`openTime < closeTime`), `BlockedDate`, and `BlockedSlot` creation/deletion.
  - `lib/salons/schedules.test.ts`: Test schedule inheritance and slot block checking.
