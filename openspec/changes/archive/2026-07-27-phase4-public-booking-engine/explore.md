# Exploration: phase4-public-booking-engine

## Current State Analysis

- **Public Routes (`app/[slug]/page.tsx` & `app/book/[slug]/`):**
  - Currently use `requireOperationalPublicSalon(slug)` to verify tenant status.
  - Rely on `mockSalonInfo` and `mockServices` instead of querying Prisma.
  - The booking flow has no real-time availability calculation, no appointment creation in DB, and no customer creation in DB.

- **Database Models (`prisma/schema.prisma`):**
  - `Customer`: Contains `id`, `salonId`, `name`, `email`, `phone`, `createdAt`, `updatedAt`.
  - `Appointment`: Contains `id`, `salonId`, `customerId`, `specialistId`, `status` (`pending`, `confirmed`, `completed`, `cancelled`, `no_show`), `startTime`, `endTime`, `totalPrice`, `customerNotes`, `adminNotes`.
  - `AppointmentService`: Maps `(appointmentId, serviceId)` with `price` and `durationMinutes`.
  - `BusinessHours`, `SpecialistHours`, `BlockedDate`, `BlockedSlot`, `SpecialistService`, `Service`: Already fully functional in DB.

## Gap Analysis (Business Rules)

1. **Real-time Slot Availability Calculation:**
   - **Need:** Algorithm that calculates available time slots for a given date, service (or list of services), and specialist.
   - **Calculation Logic:**
     1. Determine total duration = sum of `service.durationMinutes` + `service.bufferMinutes`.
     2. Get specialist schedule for date (or default salon business hours).
     3. Filter out full-day blocks (`BlockedDate`) for salon or specialist.
     4. Filter out partial-day blocks (`BlockedSlot`) for salon or specialist.
     5. Query existing active appointments (`Appointment`) for the specialist on that date and remove overlapping slots.
     6. Return array of available start times (e.g. `["09:00", "09:30", "10:00", ...]`).

2. **Public Landing & Booking Wizard UI:**
   - **`/[slug]` (Public Landing):** Fetch real salon data, address, phone, and active priced services from DB.
   - **`/book/[slug]` (Interactive Wizard):**
     - Step 1: Select service(s).
     - Step 2: Select specialist (or "Cualquiera disponible").
     - Step 3: Select date and available time slot.
     - Step 4: Enter customer info (Nombre, Email, WhatsApp/Teléfono).
     - Submit: Create `Customer` (or reuse existing by phone/email in salon) and `Appointment` in `pending` status.

3. **Confirmation & WhatsApp Integration:**
   - Redirect to `/book/[slug]/confirmacion?appointmentId=...`.
   - Display real appointment details (service, specialist, date, time, customer name, price).
   - Generate direct WhatsApp link to salon's phone number with formatted message for confirmation.

## Proposed Architecture Changes

1. **Availability Engine (`lib/salons/availability.ts`):**
   - Pure server-side logic to compute available appointment slots per date, specialist, and services.

2. **Server Actions (`app/actions/booking.ts`):**
   - `getAvailableSlotsAction(slug, date, serviceIds, specialistId?)`
   - `createPublicAppointment(formData, slug)`:
     - Validates tenant status via `requireOperationalPublicSalon`.
     - Atomically checks slot availability, creates/links `Customer`, creates `Appointment` and `AppointmentService` records.

3. **UI Components:**
   - Update `app/[slug]/page.tsx` with dynamic DB data.
   - Rebuild `app/book/[slug]/page.tsx` into a multi-step booking component with step navigation and real slot selection.
   - Update `app/book/[slug]/confirmacion/page.tsx` to read real appointment data from DB.
