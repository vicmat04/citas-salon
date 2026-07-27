# Exploration: phase2-multi-tenant-auth

## Current State Analysis

- **Routing & Middleware:**
  - `middleware.ts` protects `/admin/*` and `/s/*`, redirecting unauthenticated users to `/login`.
  - Customer routes like `/book/[slug]` and `/[slug]` are unprotected (correct behavior).
  - `app/login/page.tsx` is the general portal but currently hardcodes a link to `/s/demo/login`.
  - Salon-specific login exists at `app/s/[slug]/login/page.tsx` and works correctly if linked directly.

- **Auth Helpers (`lib/auth/helpers.ts`):**
  - `requireSalonOwner(slug)` verifies if the user is a `salon_owner` and owns the specific slug.
  - It does *not* currently check the `salon.status` or `salon.subscription.status`.

- **Missing Pages:**
  - `app/page.tsx` (platform landing) has buttons linking to `/registro-salon`, but the route does not exist.
  - There is no UI for an owner to view or switch between multiple salons if they own more than one, even though the database schema supports it (`User.ownedSalons`).

## Gap Analysis (Business Rules)

1. **Inactive/Cancelled Subscription:**
   - **Gap:** `requireSalonOwner` allows access to the salon dashboard regardless of salon/subscription status.
   - **Need:** Modify `requireSalonOwner` to check `salon.status`. If the status is `suspended` or `cancelled`, redirect the user to a billing/status notice page or restrict mutation actions.

2. **Unauthenticated Access:**
   - **Gap:** Accessing a protected route like `/s/[slug]/dashboard` unauthenticated redirects to the generic `/login` via `middleware.ts`, losing the `[slug]` context.
   - **Need:** Update `middleware.ts` to intercept `/s/[slug]/*` routes and redirect to `/s/[slug]/login` instead of the global login, maintaining the tenant context.

3. **Owner Registration & Free Trial:**
   - **Gap:** No registration flow (`/registro-salon`) for new owners exists.
   - **Need:** Implement a registration form capturing owner details and salon details. The action should create a `User` (role: `salon_owner`) and `Salon` (status: `trial`).

4. **Multi-Salon Support:**
   - **Gap:** No dashboard for owners with multiple salons to select which one to manage.
   - **Need:** Implement a `/my-salons` (or `/owner/dashboard`) page that lists `user.ownedSalons`. The general `/login` page should direct owners here instead of a hardcoded `/s/demo/login` route.

## Proposed Architecture Changes

1. **`middleware.ts`:** Parse the path for `/s/[slug]/...` and dynamically route unauthenticated users to `/s/[slug]/login?next=...`.
2. **`lib/auth/helpers.ts`:** Enhance `requireSalonOwner(slug)` to validate `salon.status` and redirect to a `suspended` or `inactive` informational page if not active/trial.
3. **`app/registro-salon/page.tsx` & Actions:** Create the registration page and a server action (`registerOwnerAndSalon`) that provisions the initial tenant state.
4. **`app/login/page.tsx` & `app/my-salons/page.tsx`:** Update the global login to authenticate an owner and redirect them to a new `/my-salons` hub that displays all their active/trial salons.
