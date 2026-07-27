# Proposal: Multi-tenant owner authentication and salon lifecycle

## Intent

Make the platform usable as a real multi-tenant salon product: a new owner can register a salon and begin a trial immediately, owners can access and select every salon they own, and the application consistently enforces a salon's lifecycle status for both management and public-facing experiences.

This resolves the current loss of tenant context during authentication, the missing owner-registration flow, the unavailable multi-salon hub, and the lack of status enforcement in salon authorization.

## Product decisions confirmed

- `trial` salons have the same dashboard access as `active` salons.
- Only `suspended` and `cancelled` salons are inactive; attempts to use them lead to `/s/[slug]/inactive`.
- The inactive notice is visible to unauthenticated visitors/clients as well as salon owners.
- Registering an owner provisions a `trial` salon, logs the owner in automatically, and presents the remaining trial days plus a WhatsApp contact action to **+507 67005805** for upgrade/payment.
- `/my-salons` lists every salon owned by the signed-in owner. Suspended and cancelled entries remain visible and carry a clear **“Suspendido”** badge.
- A SuperAdmin can activate or suspend/deactivate salons from the admin panel by changing `salon.status` in the database.

## Scope

### Owner onboarding and authentication

- Add `/registro-salon`, linked from the platform landing page, to capture the owner and initial salon information.
- Add a validated server-side registration workflow that atomically creates the owner with the `salon_owner` role, creates the salon, assigns `salon.status = trial`, establishes the initial trial period, and creates an authenticated session for the owner.
- On successful registration, route the owner to their salon management experience and display the trial-days-remaining notice and WhatsApp upgrade/payment action.
- Replace the generic login page's hard-coded demo-salon destination with owner authentication that leads to `/my-salons`.
- Preserve tenant context for unauthenticated requests to `/s/[slug]/*`: redirect to `/s/[slug]/login` with a safe local `next` destination. Salon login returns the user to that approved destination after successful authentication.

### Multi-salon owner hub

- Add the authenticated `/my-salons` hub using the signed-in user's `ownedSalons` relationship.
- Show all salons owned by the user, including inactive ones, so an owner is not left without a way to discover their salons or their current status.
- Allow entry to active and trial salons. Render suspended/cancelled salons with the **“Suspendido”** badge and direct them to their status notice rather than a usable dashboard.

### Lifecycle enforcement and inactive experience

- Treat `active` and `trial` as operational statuses.
- Treat `suspended` and `cancelled` as inactive statuses across tenant entry points:
  - owner dashboard and protected management routes;
  - public salon/booking entry points that resolve a salon by slug; and
  - direct navigation after a login or selection action.
- Add the public `/s/[slug]/inactive` status page. It must remain reachable without authentication so customers, visitors, and owners receive the same clear explanation instead of a login loop or a broken page.
- Enhance the tenant authorization helper (currently `requireSalonOwner(slug)`) to verify both ownership/role and the salon lifecycle status before allowing dashboard access or mutations. It must redirect inactive salons to the inactive page.
- Ensure public routes do not expose or accept bookings for a suspended/cancelled salon; they should resolve to the inactive notice instead.

### Trial information

- Store or derive a deterministic trial end date as part of provisioning (using the existing subscription/trial data model where available; otherwise introduce the minimum explicit trial-date field required).
- Calculate and display remaining calendar days for `trial` salons. The notice is informational and offers the WhatsApp action; it does not itself implement billing or payment processing.

### SuperAdmin lifecycle control

- Add/extend the SuperAdmin salon-management UI to change `salon.status` to activate, suspend, or deactivate/cancel a salon.
- Authorize this operation exclusively for SuperAdmin users, validate allowed status values server-side, persist the change, and make subsequent owner/public requests honor it immediately.

## Affected areas

| Area | Change |
| --- | --- |
| `middleware.ts` | Tenant-aware unauthenticated redirects; explicit allowances for salon login and the public inactive notice. |
| `lib/auth/helpers.ts` | Ownership plus lifecycle-status authorization and inactive redirect behavior. |
| `app/page.tsx` | Route registration calls to the implemented owner signup flow. |
| `app/registro-salon/*` | New registration UI and server action/workflow. |
| `app/login/page.tsx` | Remove the demo-specific route and redirect authenticated owners to `/my-salons`. |
| `app/s/[slug]/login/*` | Preserve a validated local return path after tenant-specific login. |
| `app/my-salons/*` | New owner hub and inactive salon badges/actions. |
| `app/s/[slug]/inactive/*` | New publicly accessible inactive-status notice. |
| Public salon/booking route guards | Resolve salon lifecycle status and prevent inactive salon access/booking. |
| Admin salon-management UI/actions | SuperAdmin-only salon status updates. |
| Persistence schema/services | Trial start/end source if existing subscription data cannot represent it; transactional owner/salon provisioning. |

## Authorization and routing rules

1. A request under `/s/[slug]/*` without a session goes to `/s/[slug]/login`, retaining only a validated same-origin/local `next` path.
2. `/s/[slug]/login` and `/s/[slug]/inactive` must be reachable when unauthenticated; the latter is also the terminal destination for inactive salons.
3. An authenticated `salon_owner` may manage only salons they own.
4. An owned salon in `trial` or `active` allows normal dashboard access. A `suspended` or `cancelled` salon redirects to `/s/[slug]/inactive` before dashboard rendering or mutations.
5. Public customers and visitors cannot use the public/booking experience of a suspended or cancelled salon and receive the same inactive notice.
6. SuperAdmin status transitions are server-authorized and are based on `salon.status`, not on client-provided permissions or UI state.

## Non-goals

- Building payment collection, subscription invoices, or automatic payment reconciliation.
- Defining commercial pricing, trial length, or upgrade approval workflow beyond using the configured trial period and the WhatsApp contact action.
- Reworking customer authentication or unrelated appointment behavior for active/trial salons.
- Changing tenant ownership rules or adding delegated staff management beyond the existing owner and SuperAdmin responsibilities.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A middleware redirect loop blocks login or the inactive page. | Explicitly exempt tenant login and inactive paths; cover unauthenticated and inactive navigation paths. |
| A status check is applied only to dashboards, leaving public booking available. | Centralize lifecycle evaluation and apply it to both owner guards and public slug-resolving routes. |
| A forged `next` value causes an open redirect. | Accept only normalized, local application paths and reject external/protocol-relative URLs. |
| Signup produces an owner without a usable salon/session after a partial failure. | Validate before writes and perform owner, salon, and trial provisioning atomically; create the session only after success. |
| Trial days are inaccurate or unavailable. | Establish one authoritative start/end-date source and calculate from that source server-side. |
| An admin action changes only UI state or is available to a non-SuperAdmin. | Enforce the role and allowed transitions in the server action/API, then persist `salon.status`. |
| Inactive owners cannot find their salons or understand next steps. | Keep inactive salons in `/my-salons` with the required badge and provide the public inactive notice/contact path. |

## Rollback

- Revert the tenant-aware middleware and lifecycle-guard changes to restore the previous routing behavior if they interrupt authentication; preserve the underlying salon records and status values.
- Disable or hide the new registration and admin status controls independently if provisioning or lifecycle updates need to be paused.
- Status data is non-destructive: reactivating a salon by setting `salon.status` back to `active` restores normal access without deleting salon, owner, appointment, or subscription data.
- Any trial-date schema addition should be backward-compatible and nullable/migrated before enforcement, allowing rollback without data loss.

## Success criteria

1. A visitor can open `/registro-salon`, create an owner and salon, receive a `trial` salon, be logged in automatically, and see the remaining-trial notice plus WhatsApp action.
2. An unauthenticated request to a protected tenant path redirects to that tenant's login page and returns to a safe intended tenant path after login.
3. `/my-salons` shows every salon for the authenticated owner; `active` and `trial` salons are usable, while `suspended` and `cancelled` salons visibly show **“Suspendido”** and do not open a dashboard.
4. Owners, visitors, and clients who reach a suspended/cancelled salon are shown `/s/[slug]/inactive`; no dashboard mutation or public booking can proceed for that salon.
5. Trial salons retain full dashboard access until their status becomes `suspended` or `cancelled`.
6. A SuperAdmin can change `salon.status` through the admin panel, and the new lifecycle behavior takes effect on the next request; a non-SuperAdmin cannot perform that update.
7. Existing active salon owner and public booking flows continue to work without tenant-context loss or regression.

## Proposal question round

Completed from the confirmed product answers supplied with this change. The proposal assumes no additional product decisions are required for this slice; payment processing, commercial trial duration, and upgrade approval remain intentionally out of scope.
