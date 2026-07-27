# Exploration: phase3-services-and-schedules

## Current State Analysis

- **Database Models (`prisma/schema.prisma`):**
  - Schema already includes `ServiceCategory`, `Service`, `Specialist`, `SpecialistService`, `BusinessHours`, and `SpecialistHours`.
  - `Service` has `salonId`, `categoryId`, `name`, `description`, `price` (Decimal), `durationMinutes`, `bufferMinutes`, and `isActive`.
  - `SpecialistService` maps `(specialistId, serviceId)` with a `salonId` foreign key.
  - `BusinessHours` maps `(salonId, dayOfWeek)` with `openTime`, `closeTime`, and `isOpen`.
  - `SpecialistHours` maps `(salonId, specialistId, dayOfWeek)` with `openTime`, `closeTime`, and `isAvailable`.

- **Current Salon Admin UI (`app/s/[slug]/(protected)/`):**
  - `/services/page.tsx`: Currently renders static mock data (`mockServices`). Lacks creation, editing, category filtering, or category CRUD.
  - `/specialists/page.tsx`: Displays real specialists from Prisma, supports basic creation and deletion, but has no UI for assigning services or configuring individual working hours.
  - No UI or server actions exist for managing `BusinessHours` or `SpecialistHours`.

- **Current Server Actions (`app/actions/owner.ts`):**
  - Contains `updateSalonSettings`, `createSpecialist`, and `deleteSpecialist`.
  - No server actions for Categories, Services, Specialist-Service mapping, or Working Hours.

## Gap Analysis (Business Rules)

1. **Categorías y Catálogo de Servicios:**
   - **Gap:** Salon owners cannot group services by categories (e.g., "Cortes", "Coloración", "Manicura") or manage pricing/durations dynamically.
   - **Need:**
     - CRUD operations for `ServiceCategory` (name, sort order).
     - CRUD operations for `Service` (name, description, price, duration in minutes, buffer time in minutes, category assignment, active toggle).

2. **Asignación Especialista-Servicio:**
   - **Gap:** No relationship management between specialists and the services they can perform.
   - **Need:** Interface on the specialist management page (or dialog) to select which services a specialist provides (`SpecialistService` table).

3. **Horarios de Atención del Salón (`BusinessHours`):**
   - **Gap:** Salons cannot configure their opening and closing times for each day of the week (0 = Domingo to 6 = Sábado).
   - **Need:** Settings section for salon business hours with open/close time inputs and open/closed toggles per day.

4. **Horarios Específicos por Especialista (`SpecialistHours`):**
   - **Gap:** Specialists currently have no defined working schedule.
   - **Need:** Interface to configure custom shifts for specialists per day of the week, with an option to inherit default salon business hours.

## Proposed Architecture Changes

1. **Server Actions (`app/actions/services.ts`, `app/actions/schedules.ts`, `app/actions/owner.ts`):**
   - Add strong tenant-isolated Server Actions with `requireSalonOwner(slug)` guards for:
     - Categories: `createCategory`, `updateCategory`, `deleteCategory`.
     - Services: `createService`, `updateService`, `deleteService`, `toggleServiceActive`.
     - Specialist Services: `setSpecialistServices`.
     - Business Hours: `updateBusinessHours`.
     - Specialist Hours: `updateSpecialistHours`.

2. **UI & Components:**
   - Rebuild `app/s/[slug]/(protected)/services/page.tsx` with category tabs, service dialogs (Create/Edit), and active toggles.
   - Extend `app/s/[slug]/(protected)/specialists/` with a service assignment modal and a schedule configuration tab/dialog.
   - Add a "Horarios del Salón" tab or page in settings `app/s/[slug]/(protected)/settings/` or `app/s/[slug]/(protected)/schedules/page.tsx`.

3. **Validation & Edge Cases:**
   - Ensure `price >= 0`, `durationMinutes > 0`, `bufferMinutes >= 0`.
   - Prevent deleting categories that contain services (or reassign services to null).
   - Validate `openTime < closeTime` for business and specialist hours.
