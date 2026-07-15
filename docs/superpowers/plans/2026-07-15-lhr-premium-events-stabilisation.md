# LHR Premium Events and Production Stabilisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a safe first production release that preserves VPS2 work, adds the approved Paris event photography, removes obsolete claims, repairs member journeys, and verifies the real production domain.

**Architecture:** Reconcile the VPS2 source into the local Git branch before editing, then implement small contract-tested UI and server changes in the existing Next.js App Router architecture. Deploy an immutable Docker rollback image to VPS2, mirror the verified build to Vercel, and validate the VPS2-backed domain on desktop and mobile.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, NextAuth 4, PostgreSQL 17, Tailwind CSS, Vitest, Docker Compose, Vercel CLI.

## Global Constraints

- Preserve every current VPS2 production change before altering or redeploying the application.
- Never read, copy, print or commit `.env`, `app.env`, secrets, credentials, database dumps or user payloads.
- Keep the existing approved jacuzzi, Sophia and Rideaux Ouverts imagery where it is more accurate.
- Use the two supplied photographs only for event-related presentation and rename them without `LOOLYYB`.
- Do not claim a restaurant, 40,000 members, twelve monthly events, a four-star hotel, unnamed partners or LOOLYYB benefits.
- Public `/login` and `/register` routes must not render the member sidebar.
- All member data reads must remain scoped to the authenticated user or an administrator.
- Vercel account: `gilleskorzec@gmail.com`; Vercel project: `love-hotel-rencontre`.
- Real production origin: VPS2 `pod-lhr-app`, exposed through `rencontrelovehotel.com`.
- Use `npm install --legacy-peer-deps` if dependency installation is required.

---

### Task 1: Reconcile the VPS2 production source safely

**Files:**
- Compare: `/Users/admin/Documents/LHR/**`
- Compare: `/opt/mybotia/pods/pod-lhr/**` on server `damien`
- Preserve: `/Users/admin/Documents/LHR/deployments.log`

**Interfaces:**
- Consumes: local commit `d47837f` and VPS2 container image `sha256:5c5cefacc31ee76c18840cd7478f1445cc3a0f474f3be22d4180514e7fb217bb`.
- Produces: a local Git working tree containing all relevant server-only source without secrets or generated files.

- [ ] **Step 1: Create a secret-free VPS2 source archive**

Run through Damien:

```bash
tar -C /opt/mybotia/pods/pod-lhr -czf /tmp/lhr-source-20260715.tgz \
  --exclude='.git' --exclude='.next' --exclude='node_modules' \
  --exclude='app.env' --exclude='.env*' --exclude='secrets' \
  --exclude='backups' --exclude='*.bak.*' --exclude='deployments.log' .
```

Expected: `/tmp/lhr-source-20260715.tgz` is created without environment or backup files.

- [ ] **Step 2: Download and inspect the archive outside the repository**

Download to `/tmp/lhr-source-20260715.tgz`, extract to `/tmp/lhr-source-20260715`, then run:

```bash
diff -qr --exclude='.git' --exclude='.next' --exclude='node_modules' \
  /tmp/lhr-source-20260715 /Users/admin/Documents/LHR
```

Expected: a finite list of source differences, including server-only community and safety files, with no secret paths.

- [ ] **Step 3: Reconcile source changes file by file**

For every differing application file, retain the newer server behavior when it does not conflict with the approved design, then verify:

```bash
git diff --check
git status --short
```

Expected: `deployments.log` remains untouched; no `.env`, archive, dump, dependency or build output appears in Git status.

- [ ] **Step 4: Commit the reconciled production baseline**

```bash
git add app actions components contexts hooks lib migrations public tests utils middleware.ts next.config.mjs package.json package-lock.json
git commit -m "chore: reconcile VPS2 production source"
```

Expected: one baseline commit containing only reconciled application source.

### Task 2: Add the approved Paris event imagery

**Files:**
- Create: `public/paris-event-limousine.png`
- Create: `public/paris-event-masquerade.png`
- Create: `tests/premium-event-visuals.test.ts`
- Modify: `app/landing-page.tsx`
- Modify: `app/events/page.tsx`
- Modify: `app/events/[id]/EventDetailPage.tsx`
- Modify: `components/event-card.tsx`

**Interfaces:**
- Consumes: `/Users/admin/Downloads/evenemtns coquin paris loolyyb.png` and `/Users/admin/Downloads/evenement coquin paris LooLyyb.png`.
- Produces: stable public URLs `/paris-event-limousine.png` and `/paris-event-masquerade.png`.

- [ ] **Step 1: Write the failing visual contract test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('premium event photography', () => {
  it('uses the approved Paris imagery on event surfaces without LOOLYYB copy', () => {
    const sources = [read('app/landing-page.tsx'), read('app/events/page.tsx'), read('components/event-card.tsx')].join('\n')
    expect(fs.existsSync(path.join(process.cwd(), 'public/paris-event-limousine.png'))).toBe(true)
    expect(fs.existsSync(path.join(process.cwd(), 'public/paris-event-masquerade.png'))).toBe(true)
    expect(sources).toContain('/paris-event-limousine.png')
    expect(sources).toContain('/paris-event-masquerade.png')
    expect(sources.toLowerCase()).not.toContain('loolyyb')
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run tests/premium-event-visuals.test.ts`

Expected: FAIL because the neutral image files and references do not exist.

- [ ] **Step 3: Copy and integrate the images**

Copy the wide and portrait source files to the two public paths. Use `next/image` with `object-cover`, meaningful French alternative text, responsive `sizes`, and dark overlays that maintain readable text.

- [ ] **Step 4: Run the focused test and commit**

```bash
npm test -- --run tests/premium-event-visuals.test.ts
git add public/paris-event-limousine.png public/paris-event-masquerade.png app/landing-page.tsx app/events/page.tsx app/events/[id]/EventDetailPage.tsx components/event-card.tsx tests/premium-event-visuals.test.ts
git commit -m "feat: highlight premium Paris events"
```

Expected: PASS and one focused visual commit.

### Task 3: Clean public positioning and isolate authentication layouts

**Files:**
- Create: `tests/public-positioning-and-auth-shell.test.ts`
- Modify: `components/site-shell.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `app/rencontres/page.tsx`
- Modify: `app/premium/page.tsx`
- Modify: `components/ConciergerieForm.tsx`
- Modify: `app/api/conciergerie/route.ts`
- Modify: `components/PreferencesEditor.tsx`
- Modify: `components/onboarding-form.tsx`

**Interfaces:**
- Consumes: existing `SiteShell` pathname routing and current public/member navigation arrays.
- Produces: `isPublicStandaloneRoute(pathname: string): boolean` inside `components/site-shell.tsx` for `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, and `/verify-email-pending`.

- [ ] **Step 1: Write the failing public-positioning test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

const source = (file: string) => fs.readFileSync(file, 'utf8')

describe('public positioning and authentication shell', () => {
  it('keeps authentication focused and removes unsupported commercial claims', () => {
    const shell = source('components/site-shell.tsx')
    const commercial = [source('app/rencontres/page.tsx'), source('app/premium/page.tsx'), source('components/ConciergerieForm.tsx')].join('\n').toLowerCase()
    expect(shell).toContain("'/login'")
    expect(shell).toContain("'/register'")
    expect(shell).toContain('publicStandaloneRoutes')
    expect(commercial).not.toContain('40k+')
    expect(commercial).not.toContain('restaurant gastronomique')
    expect(commercial).not.toContain('partenariat loolyyb')
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run tests/public-positioning-and-auth-shell.test.ts`

Expected: FAIL on the missing standalone route contract and obsolete copy.

- [ ] **Step 3: Implement the public positioning**

Add `publicStandaloneRoutes`, render authentication children in a centered public shell without member navigation, rewrite `/rencontres` around Pigalle, Châtelet, community events and consent, remove restaurant/LOOLYYB claims from active surfaces, and retain restaurant database fields only as deprecated compatibility data with no selectable UI.

- [ ] **Step 4: Run related tests and commit**

```bash
npm test -- --run tests/public-positioning-and-auth-shell.test.ts tests/unified-site-shell.test.ts tests/visitor-landing-redesign.test.ts tests/conciergerie-workflow.test.ts
git add components/site-shell.tsx app/login/page.tsx app/register/page.tsx app/rencontres/page.tsx app/premium/page.tsx components/ConciergerieForm.tsx app/api/conciergerie/route.ts components/PreferencesEditor.tsx components/onboarding-form.tsx tests/public-positioning-and-auth-shell.test.ts
git commit -m "feat: align public journeys with current offer"
```

Expected: all focused tests pass.

### Task 4: Remove personal-data logging

**Files:**
- Create: `tests/production-logging-privacy.test.ts`
- Modify: `actions/user-actions.ts`
- Modify: `lib/db.ts`
- Modify: `utils/logger.ts`

**Interfaces:**
- Consumes: existing `log(level, message, context)` utility.
- Produces: metadata-only logs containing operation name, counts and error codes without profile payloads, SQL values or personal descriptions.

- [ ] **Step 1: Write the failing privacy test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('production logging privacy', () => {
  it('does not serialize discovery profiles or SQL parameters', () => {
    const users = fs.readFileSync('actions/user-actions.ts', 'utf8')
    const db = fs.readFileSync('lib/db.ts', 'utf8')
    expect(users).not.toContain('Returning final result object')
    expect(users).not.toContain('JSON.stringify(result')
    expect(users).not.toContain('Final baseParams')
    expect(db).not.toContain('params: params')
  })
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --run tests/production-logging-privacy.test.ts`

Expected: FAIL on verbose profile logging.

- [ ] **Step 3: Replace verbose logs with metadata-only diagnostics**

Keep error categories and result counts, but remove complete result objects, profile fields, SQL text with filters, parameter arrays, image URLs and personal descriptions.

- [ ] **Step 4: Run the test and commit**

```bash
npm test -- --run tests/production-logging-privacy.test.ts tests/server-action-guards.test.ts
git add actions/user-actions.ts lib/db.ts utils/logger.ts tests/production-logging-privacy.test.ts
git commit -m "fix: protect member data in production logs"
```

Expected: privacy and guard tests pass.

### Task 5: Stabilize Messages and Matches data loading

**Files:**
- Create: `lib/member-relationship-service.ts`
- Create: `tests/member-relationship-service.test.ts`
- Modify: `actions/conversation-actions.ts`
- Modify: `actions/user-actions.ts`
- Modify: `app/messages/page.tsx`
- Modify: `app/matches/page.tsx`
- Modify: `middleware.ts`
- Inspect: `migrations/20260714_add_user_matches_accepted_at.sql`
- Inspect: `migrations/20260610_add_message_attachments.sql`

**Interfaces:**
- Produces: `getMemberConversationSummaries(userId: string): Promise<ConversationSummary[]>`.
- Produces: `getMemberRelationshipOverview(userId: string): Promise<RelationshipOverview>`.
- `ConversationSummary` fields: `id`, `other_user_id`, `other_user_name`, `other_user_avatar`, `last_message`, `last_message_date`.
- `RelationshipOverview` fields: `accepted`, `incoming`, `outgoing`, each an array of relationship rows.

- [ ] **Step 1: Write failing service tests**

Mock `sql.query` and verify that an empty database result returns empty arrays, authorization uses the session user, and optional `message_attachments` absence falls back to text-only summaries rather than failing the entire page.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- --run tests/member-relationship-service.test.ts tests/conversation-actions.test.ts tests/matches-v2-page.test.ts`

Expected: FAIL because the focused service and fallback do not exist.

- [ ] **Step 3: Implement focused relationship services**

Move read-only SQL into `lib/member-relationship-service.ts`, keep `requireAuth()` in server actions, return normalized empty arrays, use a text-only conversation query when attachment metadata is unavailable, and replace internal “V2/architecture” interface copy with member-facing guidance. Keep polling only while the document is visible and stop repeated calls after a persistent error until manual navigation or reload.

- [ ] **Step 4: Run focused tests and commit**

```bash
npm test -- --run tests/member-relationship-service.test.ts tests/conversation-actions.test.ts tests/matches-v2-page.test.ts tests/message-composer-ui.test.ts tests/server-action-guards.test.ts
git add lib/member-relationship-service.ts actions/conversation-actions.ts actions/user-actions.ts app/messages/page.tsx app/matches/page.tsx middleware.ts tests/member-relationship-service.test.ts
git commit -m "fix: stabilize member relationships"
```

Expected: all focused relationship tests pass.

### Task 6: Polish responsive headers and event empty states

**Files:**
- Create: `tests/premium-responsive-shell.test.ts`
- Modify: `components/brand-logo.tsx`
- Modify: `components/site-shell.tsx`
- Modify: `components/lhr-v2-shell.tsx`
- Modify: `app/events/page.tsx`
- Modify: `app/messages/page.tsx`
- Modify: `app/matches/page.tsx`
- Modify: `app/conciergerie/page.tsx`

**Interfaces:**
- Consumes: existing `BrandLogo` props `compact` and `priority`.
- Produces: stable mobile logo width, wrapping page actions, and event empty states that use the approved wide event image.

- [ ] **Step 1: Write the failing responsive contract test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('premium responsive shell', () => {
  it('keeps the logo bounded and event actions responsive', () => {
    const logo = fs.readFileSync('components/brand-logo.tsx', 'utf8')
    const shell = fs.readFileSync('components/lhr-v2-shell.tsx', 'utf8')
    const events = fs.readFileSync('app/events/page.tsx', 'utf8')
    expect(logo).toContain('max-w-full')
    expect(shell).toContain('sm:flex-row')
    expect(events).toContain('/paris-event-limousine.png')
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run tests/premium-responsive-shell.test.ts`

Expected: FAIL until the responsive contracts are present.

- [ ] **Step 3: Implement responsive polish**

Bound brand artwork inside the mobile header, reserve space for notification/menu controls, allow title actions to wrap below copy, replace blank event skeletons with one useful photographic empty state, and remove developer-facing copy from Messages and Matches.

- [ ] **Step 4: Run related tests and commit**

```bash
npm test -- --run tests/premium-responsive-shell.test.ts tests/official-logo.test.ts tests/lhr-fluid-layout.test.ts tests/lhr-v2-shell.test.ts tests/events-presentation.test.ts
git add components/brand-logo.tsx components/site-shell.tsx components/lhr-v2-shell.tsx app/events/page.tsx app/messages/page.tsx app/matches/page.tsx app/conciergerie/page.tsx tests/premium-responsive-shell.test.ts
git commit -m "fix: polish premium responsive journeys"
```

Expected: all responsive and event presentation tests pass.

### Task 7: Verify, back up, deploy and audit production

**Files:**
- Verify: `/Users/admin/Documents/LHR/**`
- Deploy: `/opt/mybotia/pods/pod-lhr/**` on VPS2
- Preserve: current Docker image `sha256:5c5cefacc31ee76c18840cd7478f1445cc3a0f474f3be22d4180514e7fb217bb`

**Interfaces:**
- Consumes: all preceding commits and the existing `docker-compose.lhr.yml`.
- Produces: a healthy VPS2 production container, a ready Vercel production deployment, and a browser-verified main domain.

- [ ] **Step 1: Run the complete local verification suite**

```bash
npm test -- --run
npm run lint
npm run build
npm audit --audit-level=high
git diff --check
git status --short
```

Expected: tests, type checking and build pass; audit reports no high vulnerabilities; only the known user-owned `deployments.log` remains untracked.

- [ ] **Step 2: Confirm targets and create rollback protection**

Confirm Vercel account `gilleskorzec`, project `love-hotel-rencontre`, VPS2 server `damien`, container `pod-lhr-app`, database container `pod-lhr-postgres`, and root-disk headroom. Tag the current image:

```bash
docker image tag sha256:5c5cefacc31ee76c18840cd7478f1445cc3a0f474f3be22d4180514e7fb217bb pod-lhr-app:rollback-20260715
```

Expected: rollback tag exists before application replacement. Create a PostgreSQL backup only if Task 5 requires a migration or data mutation.

- [ ] **Step 3: Push the reviewed branch and deploy VPS2**

```bash
git push origin codex/lhr-events-fluidity
```

Synchronize only reviewed source paths, excluding secrets and runtime data, then run on VPS2:

```bash
docker compose -f docker-compose.lhr.yml build app
docker compose -f docker-compose.lhr.yml up -d --no-deps app
docker ps --filter name=pod-lhr-app --format '{{.Names}} {{.Status}} {{.Image}}'
```

Expected: `pod-lhr-app` becomes healthy on the new image.

- [ ] **Step 4: Deploy the same commit to Vercel**

```bash
vercel whoami
vercel --prod --yes --scope gilles-korzec-projects
```

Expected: account is `gilleskorzec` and the production deployment is Ready.

- [ ] **Step 5: Verify real production**

Check desktop and 390×844 mobile views for `/`, `/login`, `/register`, `/events`, `/love-rooms`, `/discover`, `/profile`, `/matches`, `/messages`, and `/conciergerie`. Confirm private/admin protection in a signed-out context, then inspect:

```bash
docker logs --since 15m pod-lhr-app 2>&1 | grep -E 'Error|ERROR| 5[0-9][0-9] ' | tail -n 100
docker ps --filter name=pod-lhr --format '{{.Names}} {{.Status}}'
curl -sSI https://rencontrelovehotel.com
```

Expected: no application HTTP 5xx, no profile payload dumps, event imagery visible, Messages and Matches usable, mobile headers intact, and all LHR containers healthy.
