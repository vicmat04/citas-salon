# Proposal: Service Catalog, Specialist Assignment, and Working Hours (Phase 3)

## Intent

Empower salon owners to fully customize and manage their service catalog, assign services to specialists, and define operational schedules for both the salon and individual specialists.

This phase eliminates static mock data on the salon dashboard, introduces structured service categories with pricing and duration rules, enables specialist-service mapping, and establishes the business and specialist working hours necessary for real-time booking availability in subsequent phases.

## Product decisions confirmed

1. **Category Deletion Safety:** A `ServiceCategory` cannot be deleted if it still has associated services. The owner must reassign or remove all services in the category before deleting it.
2. **Service Pricing & Durations:** Prices and durations are set at the `Service` level by the salon owner. There is no hardcoding. If a service does not have a price configured, it must be hidden from public client views.
3. **Specialist Hours Inheritance:** Specialists automatically inherit the salon's default opening and closing business hours (`BusinessHours`). If the salon updates its business hours, specialists inheriting default hours update automatically.
4. **Specialist Enablement & Temporary Absence:** Salon owners can disable or enable a specialist, as well as block specific dates or times (temporary absences, vacations, sick leave) for a specialist or the entire salon.
5. **Buffer Time (Rest/Cleanup between appointments):** Each service has a customizable `bufferMinutes` field. Upon service creation, the buffer time defaults to 10 minutes, but can be updated by the salon owner.

## Scope

### Service Categories & Catalog Management

- Rebuild `/s/[slug]/services` page with dynamic category tabs and service cards.
- Add Server Actions: `createCategory`, `updateCategory`, `deleteCategory` (guarded against categories containing services).
- Add Server Actions: `createService`, `updateService`, `deleteService`, `toggleServiceActive`.
- Fields for Service: Name, Description, Price (Decimal), Duration (Minutes), Buffer Time (Minutes, default 10), Category Assignment, Active status.

### Specialist-Service Assignment

- Enhance `/s/[slug]/specialists` with a service assignment interface.
- Allow owners to select which services each specialist is qualified or assigned to provide (`SpecialistService` relation).
- Add Server Action: `updateSpecialistServices`.

### Salon Business Hours (`BusinessHours`)

- Add business hours configuration UI in salon management (`/s/[slug]/settings` or `/s/[slug]/schedules`).
- Configure opening time, closing time, and isOpen status for each day of the week (0 = Sunday to 6 = Saturday).
- Add Server Action: `updateBusinessHours`.

### Specialist Schedules & Blocked Dates/Slots (`SpecialistHours`, `BlockedDate`, `BlockedSlot`)

- Allow configuring custom work hours per specialist (`SpecialistHours`) or choosing to inherit salon business hours.
- Support blocking specific full dates (holidays, full closures, vacations) via `BlockedDate` for a specialist or the entire salon.
- Support blocking specific time slots/ranges (commitments, lunch breaks, maintenance) via `BlockedSlot` for a specialist or the entire salon.
- Add Server Actions: `updateSpecialistHours`, `addBlockedDate`, `removeBlockedDate`, `addBlockedSlot`, `removeBlockedSlot`.

## Affected areas

| Area | Change |
| --- | --- |
| `app/actions/services.ts` | Server Actions for Service Categories and Service CRUD. |
| `app/actions/schedules.ts` | Server Actions for Business Hours, Specialist Hours, and Blocked Dates. |
| `app/actions/owner.ts` | Server Action for Specialist-Service assignments (`updateSpecialistServices`). |
| `app/s/[slug]/(protected)/services/*` | Dynamic UI for category and service management. |
| `app/s/[slug]/(protected)/specialists/*` | Service assignment modal/dialog and specialist schedules. |
| `app/s/[slug]/(protected)/schedules/*` or `settings/*` | Salon operating hours configuration UI. |
| `lib/salons/schedules.ts` | Schedule resolution helpers (inheriting business hours vs specialist custom hours). |

## Non-goals

- Building the public customer booking engine (`/[slug]`) — deferred to Phase 4 (Option B).
- Online payment processing or deposit requirements for services.
- Automatic SMS/WhatsApp notification sending on schedule changes.

## Success criteria

1. Salon owners can create, edit, reorder, and delete service categories (prevented if services are present).
2. Salon owners can create, edit, toggle active status, and delete services with custom duration, price, and a default 10-minute buffer time.
3. Salon owners can assign specific services to each specialist.
4. Salon owners can configure opening/closing hours per day for the salon (`BusinessHours`).
5. Specialists inherit salon business hours by default, and custom working hours or blocked dates can be defined per specialist.
6. All 144+ unit/integration tests pass with 100% type safety (`tsc --noEmit`).
