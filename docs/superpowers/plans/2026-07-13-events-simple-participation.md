# Events Simple Participation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simple member event workflow with admin publication, organizer-approved participation requests, reservation status, and consistent upcoming-event counts.

**Architecture:** Extend the existing PostgreSQL event model without deleting historical rows. Keep event moderation in `actions/event-actions.ts`, isolate participation state transitions in a focused server module, and make `/events` the single member dashboard for upcoming events, owned submissions, received requests, and personal participation states.

**Tech Stack:** Next.js 15 App Router, React 19, NextAuth 4, PostgreSQL through `pg`, Vitest, Tailwind and existing shadcn components.

## Global Constraints

- Only active formats are `jacuzzi` and `open_curtains`.
- Member-created events always start as `pending_review`; only admin actions may publish them.
- A Rideaux ouverts event may be submitted without a booking reference, but confirmed booking requires a non-empty reference.
- Historical `event_participants` rows remain accepted and no event, participant, message, or profile is deleted.
- Capacity counts only accepted participants and includes the organizer.
- Member email activity preferences remain respected; no new automatic member email is introduced.
- All member actions authenticate internally; organizer decisions verify `events.creator_id`; admin moderation keeps `requireAdmin()`.
- Production delivery is direct to `main`, with PostgreSQL backup before migration and VPS2 verification after deployment.

---

### Task 1: Version the participation and booking data model

**Files:**
- Create: `migrations/20260713_event_participation_requests.sql`
- Modify: `schema.sql`
- Test: `tests/event-participation-migration.test.ts`

**Interfaces:**
- Produces event fields `booking_confirmed`, `booking_reference`.
- Produces participant fields `status`, `decided_by`, `decided_at`, `updated_at`.
- Preserves existing rows as `status = 'accepted'`.

- [ ] **Step 1: Write the failing migration contract test**

```ts
expect(migration).toContain('booking_confirmed BOOLEAN NOT NULL DEFAULT FALSE')
expect(migration).toContain("status TEXT NOT NULL DEFAULT 'accepted'")
expect(migration).toContain("status IN ('pending', 'accepted', 'rejected', 'withdrawn')")
expect(migration).toContain('events_open_curtains_booking_check')
expect(schema).toContain('booking_reference TEXT')
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- --run tests/event-participation-migration.test.ts`  
Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Implement the idempotent migration and fresh schema**

```sql
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS booking_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_reference TEXT;

ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

Add named check constraints for booking coherence and participation states, plus indexes on `(event_id, status)` and `(user_id, status)`.

- [ ] **Step 4: Verify the migration contract passes**

Run: `npm test -- --run tests/event-participation-migration.test.ts`  
Expected: PASS.

### Task 2: Implement one participation state machine

**Files:**
- Create: `lib/event-participation-service.ts`
- Create: `actions/event-participation-actions.ts`
- Modify: `actions/event-actions.ts`
- Test: `tests/event-participation-actions.test.ts`
- Test: `tests/event-actions-behavior.test.ts`

**Interfaces:**
- Produces `requestEventParticipation(eventId: string): Promise<EventParticipationResult>`.
- Produces `withdrawEventParticipation(eventId: string): Promise<EventParticipationResult>`.
- Produces `decideEventParticipation(participationId: string, decision: 'accept' | 'reject'): Promise<EventParticipationResult>`.
- Produces `getMyEventParticipations(): Promise<EventParticipationRow[]>`.
- Produces `getOwnedEventRequests(): Promise<OwnedEventRequest[]>`.
- `EventParticipationResult` is `{ success: boolean; status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn'; error?: string }`.

- [ ] **Step 1: Write failing state-transition tests**

```ts
it('creates a pending request for a published future event', async () => {
  expect(await requestEventParticipation('event-1')).toEqual({ success: true, status: 'pending' })
})

it('allows only the organizer to accept and locks capacity atomically', async () => {
  expect(await decideEventParticipation('request-1', 'accept')).toEqual({ success: true, status: 'accepted' })
})
```

Cover unpublished/past events, self-request rejection, mutual blocks, repeated requests, withdrawal, unauthorized organizer decisions, capacity exhaustion, and notifications.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- --run tests/event-participation-actions.test.ts`  
Expected: FAIL because the module and actions do not exist.

- [ ] **Step 3: Implement service transitions in database transactions**

Use `executeQuery` with `BEGIN`, `SELECT ... FOR UPDATE`, status update/insert, accepted-capacity count, `COMMIT`, and `ROLLBACK`. Call `assertUsersCanInteract()` before creating a request. Notify the organizer through `createAppNotificationRecord()` after a request and the requester after a decision.

- [ ] **Step 4: Add authenticated server-action wrappers**

```ts
'use server'

export async function requestEventParticipation(eventId: string) {
  const user = await requireCurrentUser()
  return requestParticipation({ eventId, actorId: user.id })
}
```

Organizer actions derive the actor from the session and never accept a client-provided organizer ID.

- [ ] **Step 5: Update event reads and creation**

Change all participant counts to `WHERE status = 'accepted'`, expose the current member's `participation_status`, and insert the creator as accepted after event creation. Validate booking input server-side and never return `booking_reference` in catalogue queries.

- [ ] **Step 6: Verify action tests pass**

Run: `npm test -- --run tests/event-participation-actions.test.ts tests/event-actions-behavior.test.ts`  
Expected: PASS.

### Task 3: Replace the event catalogue with three obvious views

**Files:**
- Modify: `app/events/page.tsx`
- Modify: `components/event-card.tsx`
- Modify: `app/events/[id]/EventDetailPage.tsx`
- Test: `tests/event-workflow-redesign.test.ts`
- Test: `tests/events-participation-ui.test.ts`

**Interfaces:**
- Consumes event rows with `accepted_count`, `participation_status`, `booking_confirmed`, `creator_name`, and `is_owner`.
- Consumes participation actions from Task 2.

- [ ] **Step 1: Replace existing static UI assertions with failing workflow assertions**

```ts
expect(listPage).toContain("type View = 'upcoming' | 'owned' | 'participating'")
expect(listPage).toContain('Mes participations')
expect(listPage).toContain('Demandes reçues')
expect(card).toContain('Demander à participer')
expect(card).not.toContain('Voir les détails')
expect(listPage).not.toContain('<iframe')
```

Add an assertion that `isLoading` is checked before redirecting.

- [ ] **Step 2: Verify UI tests fail**

Run: `npm test -- --run tests/event-workflow-redesign.test.ts tests/events-participation-ui.test.ts`  
Expected: FAIL on the old views and labels.

- [ ] **Step 3: Implement the three-view event page**

Use one segmented view control for `À venir`, `Mes événements`, `Mes participations`; use compact format filters only inside `À venir`; render owned request management inside `Mes événements`. Replace the iframe with an external link to the Rideaux ouverts agenda.

- [ ] **Step 4: Simplify each card to one primary action**

Map states exactly:

```ts
const labels = {
  none: 'Demander à participer',
  pending: 'Demande envoyée',
  accepted: 'Participation acceptée',
  rejected: 'Demande refusée'
}
```

Make the title/image link to details; show remaining accepted capacity and reservation status without exposing the reference.

- [ ] **Step 5: Update the detail page with the same state machine**

Wait for `isLoading` before redirecting, remove duplicate API mutation logic, and call Task 2 actions. Keep accepted participants visible and link profiles directly.

- [ ] **Step 6: Verify UI tests pass**

Run: `npm test -- --run tests/event-workflow-redesign.test.ts tests/events-participation-ui.test.ts`  
Expected: PASS.

### Task 4: Reduce member event creation to one progressive form

**Files:**
- Modify: `app/events/new.tsx`
- Modify: `actions/event-actions.ts`
- Modify: `app/admin/events/page.tsx`
- Test: `tests/event-creation-simple-ui.test.ts`
- Test: `tests/event-actions-behavior.test.ts`

**Interfaces:**
- Extends `createEvent()` input with `booking_confirmed?: boolean` and `booking_reference?: string`.
- Redirects successful members to `/events?view=owned&created=1`.

- [ ] **Step 1: Write failing creation-flow assertions**

```ts
expect(createPage).toContain('La chambre est-elle déjà réservée ?')
expect(createPage).toContain("router.push('/events?view=owned&created=1')")
expect(createPage).not.toContain('prix_personne_seule')
expect(createPage).not.toContain('payment_mode')
```

Add server tests proving confirmed Rideaux ouverts requires a reference while unconfirmed remains allowed.

- [ ] **Step 2: Verify creation tests fail**

Run: `npm test -- --run tests/event-creation-simple-ui.test.ts tests/event-actions-behavior.test.ts`  
Expected: FAIL on missing booking controls and server validation.

- [ ] **Step 3: Implement a single-page progressive form**

Keep two visual format choices, date/time, venue, capacity, title, invitation and optional photo. Conditionally show booking confirmation only for `open_curtains`. Keep price/payment fields out of the member UI, but preserve their server defaults and admin tools.

- [ ] **Step 4: Add admin reservation visibility**

Show `Chambre réservée` or `À confirmer` in moderation. Show the full booking reference only in the admin detail context.

- [ ] **Step 5: Verify creation tests pass**

Run: `npm test -- --run tests/event-creation-simple-ui.test.ts tests/event-actions-behavior.test.ts`  
Expected: PASS.

### Task 5: Unify counters and retire duplicate participation behavior

**Files:**
- Modify: `app/discover/page.tsx`
- Modify: `actions/admin-stats-actions.ts`
- Modify: `app/api/events/[id]/participate/route.ts`
- Test: `tests/event-count-consistency.test.ts`
- Test: `tests/api-security-routes.test.ts`

**Interfaces:**
- All future counts use `(event_date + COALESCE(event_time, '23:59:59'::time)) > NOW()` and `publication_status = 'published'`.
- The compatibility route delegates to Task 2 and ignores non-admin client user IDs.

- [ ] **Step 1: Write failing count and route tests**

Assert that discover/admin queries use the combined event timestamp and published status, and that the compatibility route returns `pending` for joins.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- --run tests/event-count-consistency.test.ts tests/api-security-routes.test.ts`  
Expected: FAIL on current count/query semantics.

- [ ] **Step 3: Implement shared count semantics and route delegation**

Reuse `getUpcomingEvents()` on discover. Update admin SQL. Make the route call the shared participation service for `join` and withdrawal service for `leave`, keeping its session guard.

- [ ] **Step 4: Verify count and security tests pass**

Run: `npm test -- --run tests/event-count-consistency.test.ts tests/api-security-routes.test.ts`  
Expected: PASS.

### Task 6: Verify and deliver production

**Files:**
- Modify only files required by failures discovered during verification.

- [ ] **Step 1: Run focused event tests**

Run: `npm test -- --run tests/event-participation-migration.test.ts tests/event-participation-actions.test.ts tests/event-actions-behavior.test.ts tests/event-workflow-redesign.test.ts tests/events-participation-ui.test.ts tests/event-creation-simple-ui.test.ts tests/event-count-consistency.test.ts tests/api-security-routes.test.ts`  
Expected: all focused tests pass.

- [ ] **Step 2: Run project verification**

Run: `npm run lint`  
Expected: exit 0.

Run: `npm test -- --run`  
Expected: all test files pass.

Run: `npm run build`  
Expected: production build exit 0 and `/events`, `/events/new`, `/events/[id]` are generated.

- [ ] **Step 3: Review React changes**

Check hook dependencies, loading-aware redirects, semantic buttons/links, stable event keys, responsive text containment, and that no card is nested inside another card.

- [ ] **Step 4: Commit and push main**

Commit the implementation as `feat: simplify member event participation`, then push `origin main`.

- [ ] **Step 5: Back up and migrate production**

Create and validate a compressed `pg_dump`, upload the migration, and apply with `psql -v ON_ERROR_STOP=1`. Verify columns, constraints, indexes, and that 55 historical participation rows remain accepted.

- [ ] **Step 6: Deploy and verify online**

Upload changed source files to `/opt/mybotia/pods/pod-lhr`, rebuild `app`, verify Docker health and logs, then test desktop and 390x844 mobile flows on `https://rencontrelovehotel.com/events` without creating or accepting real user data.
