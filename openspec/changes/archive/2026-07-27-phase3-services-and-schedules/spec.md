# Specification: Service Catalog, Specialist Assignment, and Working Hours (Phase 3)

## Purpose

Define the required behavior, API contracts, authorization guards, and validation rules for managing service categories, service items, specialist service assignments, salon business hours, and specialist schedules.

---

## Requirements & Executable Specifications

### 1. Service Category Management

#### 1.1 Category Creation & Update

- **Requirement:** An authenticated `salon_owner` can create and edit service categories for their salon.
- **Inputs:** `salonSlug`, `name` (string, min 1 char), `sortOrder` (int, default 0).
- **Behavior:**
  - Create or update `ServiceCategory` with `salonId`.
  - Revalidate `/s/[slug]/services`.
- **Validation Errors:**
  - Empty name returns `{ error: 'El nombre de la categoría es obligatorio' }`.

#### 1.2 Category Deletion Protection

- **Requirement:** A category CANNOT be deleted if it contains one or more services.
- **Behavior:**
  - Check count of services associated with `categoryId` and `salonId`.
  - If `count > 0`, return `{ error: 'No se puede eliminar una categoría que contiene servicios. Reasigna o elimina los servicios primero.' }`.
  - If `count === 0`, delete category and return `{ success: true }`.

---

### 2. Service Management

#### 2.1 Service Creation & Update

- **Requirement:** An authenticated `salon_owner` can create and update services in their salon catalog.
- **Inputs:** `salonSlug`, `name`, `description`, `price` (Decimal >= 0), `durationMinutes` (Int > 0), `bufferMinutes` (Int >= 0, default 10), `categoryId` (optional), `isActive` (boolean).
- **Behavior:**
  - Validate numeric constraints: `price >= 0`, `durationMinutes > 0`, `bufferMinutes >= 0`.
  - Default `bufferMinutes` to `10` when omitted or invalid.
  - Create or update `Service` linked to `salonId`.

#### 2.2 Unpriced Services Behavior

- **Requirement:** Services without a valid positive price configured must be flagged as unpriced and excluded from public client listing views.
- **Behavior:**
  - Helper `isPubliclyBookable(service)` returns `true` if `service.isActive === true` and `service.price > 0`.

---

### 3. Specialist Service Assignment

#### 3.1 Assigning Services to Specialists

- **Requirement:** An authenticated `salon_owner` can specify which services a specialist can provide.
- **Inputs:** `salonSlug`, `specialistId`, `serviceIds` (array of string UUIDs).
- **Behavior:**
  - Verify specialist and all `serviceIds` belong to `salonId`.
  - Update `SpecialistService` records atomically (delete missing, create new).
  - Revalidate `/s/[slug]/specialists` and `/s/[slug]/services`.

---

### 4. Salon Business Hours (`BusinessHours`)

#### 4.1 Business Hours Configuration

- **Requirement:** An authenticated `salon_owner` can set operating hours for each day of the week (0 = Sunday ... 6 = Saturday).
- **Inputs:** `salonSlug`, array of `{ dayOfWeek: 0..6, openTime: "HH:mm", closeTime: "HH:mm", isOpen: boolean }`.
- **Validation:**
  - If `isOpen` is `true`, `openTime` must be strictly before `closeTime`.
  - Otherwise return `{ error: 'La hora de apertura debe ser anterior a la hora de cierre.' }`.
- **Behavior:**
  - Upsert `BusinessHours` records per `(salonId, dayOfWeek)`.

---

### 5. Specialist Hours & Blocked Dates

#### 5.1 Inheritance & Custom Hours

- **Requirement:** If no explicit `SpecialistHours` record exists for a specialist on a given day, their working schedule defaults to the salon's `BusinessHours` for that day.
- **Behavior:**
  - Helper `getSpecialistSchedule(salonId, specialistId, date)` resolves explicit `SpecialistHours` if available, falling back to `BusinessHours`.

#### 5.2 Blocked Dates & Blocked Time Slots

- **Requirement:** Owners can block full dates or specific time ranges for a specialist or the entire salon (`specialistId?` null = entire salon).
- **Full Date Blocks (`BlockedDate`):**
  - Inputs: `salonSlug`, `date` (YYYY-MM-DD), `specialistId` (optional), `reason` (optional).
  - Behavior: Create `BlockedDate` linked to `salonId`. Blocks all appointment availability for that date.
- **Time Slot Blocks (`BlockedSlot`):**
  - Inputs: `salonSlug`, `date` (YYYY-MM-DD), `startTime` ("HH:mm"), `endTime` ("HH:mm"), `specialistId` (optional), `reason` (optional).
  - Validation: `startTime < endTime`.
  - Behavior: Create `BlockedSlot` linked to `salonId`. Blocks availability within that specific time window for commitments, lunch breaks, or partial closures.

---

## Security & Tenant Isolation

- All actions MUST use `requireSalonOwner(slug)` to verify that the logged-in user owns the specified salon.
- Every Prisma query MUST include `salonId` in the `where` clause to prevent cross-tenant data leakage.
