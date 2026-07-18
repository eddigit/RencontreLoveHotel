# Member Events Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow every connected member to submit a moderated event with an optional validated cover image, and give admins a complete review queue with member notifications.

**Architecture:** Keep the existing `events` table, `event-actions.ts`, App Router pages, Vercel Blob upload and notification system. Add only moderation metadata, focused server actions, one authenticated event-cover route, and a queue in the existing admin event page. Member-created events are forced to `pending_review` server-side; admin-created events remain `published`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, PostgreSQL, Vitest, Vercel Blob, existing `requireCurrentUser()` / `requireAdmin()` guards, existing `validateImageFile()` helper.

## Global Constraints

- Deployment is direct to `main` and then VPS2; no pull request workflow.
- Never request or copy passwords; use existing Bitwarden/browser/SSH/GitHub sessions.
- Never delete existing events, event participants, messages or images in this tranche.
- Members can submit only `jacuzzi` and `open_curtains`; capacities remain 2-4 and 2-3 respectively.
- All member-created events are `pending_review`; the server ignores client publication requests.
- All admin server actions call `requireAdmin()` inside the action body.
- Image uploads reuse `validateImageFile()` and never trust client MIME or extension alone.

### Task 1: Add the moderation schema and red tests

**Files:**
- Create: `migrations/20260711_event_moderation.sql`
- Create: `tests/event-moderation-contract.test.ts`
- Modify: `tests/event-actions-behavior.test.ts`

**Interfaces:**
- Produces columns `events.moderation_note`, `events.moderated_by`, `events.moderated_at` and index `idx_events_publication_created`.
- Produces the contract checked by later server actions: statuses `pending_review`, `published`, `rejected` and moderation decisions `publish`, `request_correction`, `reject`.

- [ ] **Step 1: Write the failing migration contract test**

```ts
it('adds non-destructive event moderation metadata', () => {
  const sql = readFileSync('migrations/20260711_event_moderation.sql', 'utf8')
  expect(sql).toContain('ADD COLUMN IF NOT EXISTS moderation_note')
  expect(sql).toContain('ADD COLUMN IF NOT EXISTS moderated_by')
  expect(sql).toContain('ADD COLUMN IF NOT EXISTS moderated_at')
  expect(sql).toContain('idx_events_publication_created')
  expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM events/i)
})
```

- [ ] **Step 2: Add behavior tests for server publication rules**

```ts
it('requires a moderation note for correction and rejection decisions', () => {
  expect(normalizeModerationDecision('request_correction', '')).toThrow
  expect(normalizeModerationDecision('reject', 'Motif précis')).toBeDefined()
})
```

Use the repository’s existing static/source-test style if the helper is not exported; the test must still assert that member publication is forced to `pending_review` and that an admin decision cannot be performed without a note for negative outcomes.

- [ ] **Step 3: Run the red tests**

Run: `npm test -- --run tests/event-moderation-contract.test.ts tests/event-actions-behavior.test.ts`

Expected: FAIL because the migration and moderation contract do not exist yet.

- [ ] **Step 4: Commit the red tests and migration skeleton**

```bash
git add migrations/20260711_event_moderation.sql tests/event-moderation-contract.test.ts tests/event-actions-behavior.test.ts
git commit -m "test: define member event moderation contract"
```

### Task 2: Implement guarded moderation actions

**Files:**
- Modify: `actions/event-actions.ts`
- Test: `tests/event-moderation-actions.test.ts`

**Interfaces:**
- Produces `getPendingEventModeration()` returning event id, author, image, format, venue, event time, capacity and current status.
- Produces `moderateEvent(eventId: string, decision: 'publish' | 'request_correction' | 'reject', note?: string)` returning `{ success: true, status }`.
- `moderateEvent` calls `requireAdmin()`, validates the event, requires a non-empty note for `request_correction` and `reject`, updates metadata and creates a targeted `event_moderation` notification.

- [ ] **Step 1: Write failing action tests**

Mock `@/lib/db`, `@/lib/server-auth` and `@/actions/notification-actions`. Assert anonymous/member callers fail before SQL, admin can read the queue, `publish` sets `published`, and negative decisions reject empty notes.

- [ ] **Step 2: Run the action tests to verify failure**

Run: `npm test -- --run tests/event-moderation-actions.test.ts`

Expected: FAIL because the actions are not defined.

- [ ] **Step 3: Implement minimal guarded actions**

Use parameterized `sql.query` statements. For publication, set `moderation_note = NULL`; for correction/rejection, persist the trimmed note. Set `moderated_by` and `moderated_at` for every decision. Notify the event creator with `createAppNotification({ type: 'event_moderation', link: '/events', metadata: { eventId, status, note } })`.

- [ ] **Step 4: Run the action tests to verify success**

Run: `npm test -- --run tests/event-moderation-actions.test.ts tests/event-actions-behavior.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the server behavior**

```bash
git add actions/event-actions.ts tests/event-moderation-actions.test.ts
git commit -m "feat: add guarded event moderation actions"
```

### Task 3: Add the authenticated event cover upload

**Files:**
- Create: `app/api/events/upload-cover/route.ts`
- Test: `tests/event-cover-upload.test.ts`
- Inspect: `lib/image-upload-validation.ts`

**Interfaces:**
- `POST /api/events/upload-cover` accepts `photo` in `multipart/form-data`.
- Requires a logged-in user, validates the file through `validateImageFile()`, stores one public Blob under `event-covers/<user-id>/`, and returns `{ success: true, url }`.
- Rejects missing files, invalid signatures/MIME/extensions and files over the existing image size limit before Blob storage.

- [ ] **Step 1: Write failing route contract tests**

Assert the route imports `validateImageFile`, `put`, `getServerSession`, uses the `event-covers/` prefix and never accepts a URL as an upload substitute.

- [ ] **Step 2: Run the route test to verify failure**

Run: `npm test -- --run tests/event-cover-upload.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the route**

Follow `app/api/photos/upload/route.ts`, but do not insert a `photos` row and do not impose a per-user photo gallery count. Return HTTP 401 for anonymous users, 400 for validation failures and 500 for Blob/database infrastructure failures.

- [ ] **Step 4: Run the route tests and typecheck**

Run: `npm test -- --run tests/event-cover-upload.test.ts && npm run lint`

Expected: PASS and no TypeScript errors.

- [ ] **Step 5: Commit the upload route**

```bash
git add app/api/events/upload-cover/route.ts tests/event-cover-upload.test.ts
git commit -m "feat: add validated event cover uploads"
```

### Task 4: Upgrade member event creation and status visibility

**Files:**
- Modify: `app/events/new.tsx`
- Modify: `app/events/page.tsx`
- Modify: `components/event-card.tsx`
- Modify: `actions/event-actions.ts`
- Test: `tests/member-event-creation-ui.test.ts`

**Interfaces:**
- The member form uploads a cover through `/api/events/upload-cover`, displays the returned preview URL and sends it to `createEvent`.
- The form explicitly says `Votre proposition sera relue par l’équipe avant publication.`
- `getMyEventSubmissions(userId)` returns only the current user’s non-published submissions and requires the same user or admin.
- The events page renders a compact “Mes propositions” status list without exposing pending/rejected events in the public event catalogue.

- [ ] **Step 1: Write failing UI/source tests**

Assert the creation page contains `FormData`, `/api/events/upload-cover`, the moderation wording and image preview; assert the events page contains `getMyEventSubmissions` and status labels.

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm test -- --run tests/member-event-creation-ui.test.ts`

Expected: FAIL because the current form sends only a raw image URL and has no submission status view.

- [ ] **Step 3: Implement the cover upload and submission status UI**

Keep the existing capacity and format validation. Disable submit while the image is uploading. If upload fails, keep the form data and show the server error without creating the event. Do not alter the public `getUpcomingEvents()` filter.

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test -- --run tests/member-event-creation-ui.test.ts tests/event-actions-behavior.test.ts && npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit the member flow**

```bash
git add app/events/new.tsx app/events/page.tsx components/event-card.tsx actions/event-actions.ts tests/member-event-creation-ui.test.ts
git commit -m "feat: give members a moderated event submission flow"
```

### Task 5: Build the admin moderation queue

**Files:**
- Modify: `app/admin/events/page.tsx`
- Modify: `components/admin-tabs.tsx` only if a dedicated tab is needed
- Test: `tests/admin-event-moderation-ui.test.ts`

**Interfaces:**
- The existing admin event page renders pending proposals before published events.
- Each proposal shows the cover, author profile link, format, venue, date, capacity and action controls.
- `Publier` requires no note; `Demander une correction` and `Refuser` require a non-empty note in a modal or inline decision panel.
- Successful actions refresh the queue and show the member notification result.

- [ ] **Step 1: Write failing UI tests**

Assert the admin page imports `getPendingEventModeration` and `moderateEvent`, contains `Propositions à valider`, `Demander une correction`, `Refuser`, `Publier` and a profile link.

- [ ] **Step 2: Run the UI tests to verify failure**

Run: `npm test -- --run tests/admin-event-moderation-ui.test.ts`

Expected: FAIL because the current page has no moderation queue.

- [ ] **Step 3: Implement the queue**

Use the existing admin layout and controls. Keep the destructive “Mettre à zéro” action visually and behaviorally separate from moderation. Refresh data after every decision and never silently swallow a failed server action.

- [ ] **Step 4: Run UI tests, full tests, lint and build**

Run: `npm test -- --run && npm run lint && npm run build`

Expected: all tests pass, TypeScript passes and Next.js production build completes.

- [ ] **Step 5: Commit the admin queue**

```bash
git add app/admin/events/page.tsx tests/admin-event-moderation-ui.test.ts
git commit -m "feat: add admin event moderation queue"
```

### Task 6: Push and deploy directly to production

**Files:**
- No source files; deployment uses the commits above.

- [ ] **Step 1: Verify repository state**

Run: `git diff --check && git status --short && git log --oneline -5`

Expected: no unstaged changes and only intentional commits.

- [ ] **Step 2: Push `main`**

Run: `git push origin main`

Expected: remote `main` advances without a PR.

- [ ] **Step 3: Back up PostgreSQL on VPS2**

Run a timestamped `pg_dump -Fc` to `/opt/mybotia/pods/pod-lhr-backups/` before applying the migration. Verify the file is non-empty.

- [ ] **Step 4: Sync source and apply migration**

Use the established `rsync` exclusions, then run `psql -v ON_ERROR_STOP=1` against `migrations/20260711_event_moderation.sql`.

- [ ] **Step 5: Rebuild and health-check the app**

Run `docker compose up -d --build app`, wait for `pod-lhr-app` to become healthy, then verify `/version.json`, anonymous redirects for `/events` and `/admin/events`, and absence of startup failures in recent logs.

- [ ] **Step 6: Record production checks**

Verify that existing event and participant counts are unchanged, `events` has the new moderation columns, and no pending event appears in the public query.
