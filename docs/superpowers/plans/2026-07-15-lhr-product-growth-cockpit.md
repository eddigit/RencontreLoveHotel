# LHR Product & Growth Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the LHR admin diagnostic cockpit while fixing profile rotation, profile recovery, match lifecycle, messaging activation, member safety, and public event acquisition.

**Architecture:** Keep the existing Next.js/PostgreSQL modular monolith. Add privacy-safe instrumentation and versioned migrations, compute admin aggregates server-side, generate deterministic diagnostic rules, and integrate the corrections into the existing discovery, match, messaging, moderation, and event routes.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, PostgreSQL, NextAuth 4, Vitest, Tailwind/shadcn UI.

## Global Constraints

- Scope is Love Hotel Rencontre only.
- Production site is `rencontrelovehotel.com`.
- Keep all member analytics aggregate or categorical; never store message bodies, biographies, email addresses, or precise location in product events.
- Every admin server action calls `requireAdmin()` internally.
- Compatibility is never increased by premium or featured status.
- Missing profile shells remain private until the member explicitly completes and displays the profile.
- Database changes use migrations; no new runtime DDL.
- Preserve `deployments.log` and unrelated user changes.

---

### Task 1: Privacy-safe product schema and instrumentation

**Files:**
- Create: `migrations/20260715_product_growth_cockpit.sql`
- Create: `lib/product-events.ts`
- Test: `tests/product-growth-migration.test.ts`
- Test: `tests/product-events.test.ts`

**Interfaces:**
- Produces: `trackProductEvent(input: ProductEventInput): Promise<void>` and `trackProductEvents(inputs: ProductEventInput[]): Promise<void>`.
- Event names are a TypeScript union and metadata is sanitized to bounded primitives.

- [ ] **Step 1: Write failing migration and event-privacy tests**

Assert that the migration creates `product_events`, `diagnostic_snapshots`, `user_blocks`, and `user_reports`; extends `user_matches`; adds required indexes; and that `sanitizeProductMetadata()` drops disallowed keys such as `content`, `email`, `bio`, `location`, and nested objects.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run tests/product-growth-migration.test.ts tests/product-events.test.ts`

Expected: failures because the migration and module do not exist.

- [ ] **Step 3: Implement the migration and event API**

The migration uses idempotent `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. `trackProductEvent()` validates the allowlisted event, sanitizes metadata, catches missing-schema errors `42P01`/`42703`, and never breaks the member journey if instrumentation is not deployed yet.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `npm test -- --run tests/product-growth-migration.test.ts tests/product-events.test.ts`

Expected: all targeted tests pass.

- [ ] **Step 5: Commit**

Commit: `feat: add privacy-safe LHR product instrumentation`

### Task 2: Deterministic diagnostic engine and admin cockpit

**Files:**
- Create: `lib/product-diagnostics.ts`
- Create: `actions/product-diagnostic-actions.ts`
- Create: `components/admin-product-diagnostic.tsx`
- Create: `app/admin/diagnostic/page.tsx`
- Modify: `components/admin-tabs.tsx`
- Test: `tests/product-diagnostics.test.ts`
- Test: `tests/admin-product-diagnostic-ui.test.ts`

**Interfaces:**
- Produces: `buildProductDiagnostic(metrics: ProductDiagnosticMetrics): ProductDiagnostic`.
- Produces: `getProductDiagnostic(): Promise<ProductDiagnostic>` and `createMissingProfileShells(): Promise<{ created: number }>`.

- [ ] **Step 1: Write failing scoring and UI tests**

Test a stagnant fixture with missing profiles, low media coverage, high pending matches, low reciprocal conversations, and no future events. Expect critical/high actions ordered ahead of medium actions and scores bounded from 0 to 100. Assert the admin tab, route guard, funnel labels, and action-plan labels exist.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run tests/product-diagnostics.test.ts tests/admin-product-diagnostic-ui.test.ts`

Expected: missing module/page failures.

- [ ] **Step 3: Implement diagnostic scoring and aggregate action**

Aggregate current tables in parallel, expose schema readiness explicitly, calculate ratios in pure functions, and return evidence-based actions. `createMissingProfileShells()` inserts private rows with `display_profile = FALSE` and `ON CONFLICT DO NOTHING` after `requireAdmin()`.

- [ ] **Step 4: Implement the cockpit UI**

Render executive score, pillar cards, funnel, schema warning, prioritized action cards, cohort cards, and a protected recovery button. Use existing Card, Badge, Progress, Alert, and admin layout patterns.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run: `npm test -- --run tests/product-diagnostics.test.ts tests/admin-product-diagnostic-ui.test.ts tests/server-action-guards.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: add LHR product diagnostic cockpit`

### Task 3: Fair discovery rotation and impression measurement

**Files:**
- Create: `lib/discovery-ranking.ts`
- Modify: `actions/user-actions.ts`
- Modify: `app/discover/page.tsx`
- Test: `tests/discovery-ranking.test.ts`
- Test: `tests/community-profile-rotation.test.ts`

**Interfaces:**
- Produces: `rankDiscoveryCandidates(candidates, context): RankedCandidate[]`.
- Extends `getDiscoverProfiles()` with session seed and exposure-aware fields while preserving the existing return envelope.

- [ ] **Step 1: Write failing ranking tests**

Assert that premium and historical popularity do not change compatibility, under-exposed profiles gain discovery position, blocked/existing relationships are excluded by query source, identical seeds remain stable, and different page/batch values rotate candidates.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run tests/discovery-ranking.test.ts tests/community-profile-rotation.test.ts tests/matching-algorithm.test.ts`

Expected: failures for missing ranker and old eight-profile behavior.

- [ ] **Step 3: Implement pure ranking and correct compatibility**

Remove `featured` and `premiumAccess` bonuses from `calculateMatchScore()`. Compute discovery score from compatibility, freshness, quality, exposure deficit, and a deterministic hash-based exploration value.

- [ ] **Step 4: Update database candidate selection and UI**

Fetch a broader eligible pool, exclude blocks and active/recent relationships when schema exists, remove accepted-match popularity ordering, display twelve cards, add “Découvrir d’autres profils”, and record impression events for the rendered batch.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run: `npm test -- --run tests/discovery-ranking.test.ts tests/community-profile-rotation.test.ts tests/matching-algorithm.test.ts tests/community-home-ui.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: rotate LHR community profiles fairly`

### Task 4: Match lifecycle and automatic conversations

**Files:**
- Modify: `actions/user-actions.ts`
- Modify: `lib/member-relationship-service.ts`
- Modify: `app/matches/page.tsx`
- Test: `tests/match-lifecycle.test.ts`
- Test: `tests/member-relationship-service.test.ts`

**Interfaces:**
- `sendMatchRequest(requesterId, receiverId, context?)` stores a 30-day expiration and privacy-safe context.
- `acceptMatchRequest()` records response time, tracks the event, and returns `conversationId`.

- [ ] **Step 1: Write failing lifecycle tests**

Assert expiry conditions appear in relationship queries, blocked members cannot receive requests, accepted matches create/reuse exactly one two-member conversation, and reverse duplicate pairs are not created.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run tests/match-lifecycle.test.ts tests/member-relationship-service.test.ts`

Expected: lifecycle assertions fail.

- [ ] **Step 3: Implement lifecycle changes**

Use a transaction for acceptance and conversation creation. Preserve compatibility with a database where new columns/tables are not present until migration by deploying the migration first in production.

- [ ] **Step 4: Update match UI**

Show active expiration, contextual intent when available, and open the returned conversation immediately after acceptance.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run: `npm test -- --run tests/match-lifecycle.test.ts tests/member-relationship-service.test.ts tests/matches-v2-page.test.ts tests/relationship-flow-ui.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: activate LHR match lifecycle`

### Task 5: Messaging activation, blocking, and reporting

**Files:**
- Create: `actions/member-safety-actions.ts`
- Modify: `actions/conversation-actions.ts`
- Modify: `app/messages/[id]/page.tsx`
- Modify: `app/profile/[id]/page.tsx`
- Test: `tests/member-safety-actions.test.ts`
- Test: `tests/message-activation.test.ts`

**Interfaces:**
- Produces: `blockMember(targetUserId)`, `unblockMember(targetUserId)`, and `reportMember(input)`.
- Message send records `message_sent`, and records `conversation_started`/`message_replied` based on prior conversation state.

- [ ] **Step 1: Write failing safety and activation tests**

Verify same-user prevention, block insertion, accepted-match invalidation, report insertion, admin moderation notification, authorization, contextual prompt UI, and event tracking calls without private message content.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run tests/member-safety-actions.test.ts tests/message-activation.test.ts`

Expected: missing action/UI failures.

- [ ] **Step 3: Implement server actions and messaging instrumentation**

Guard every action with the current session, validate UUIDs/reason length, use transactions for relationship changes, and track only categorical metadata.

- [ ] **Step 4: Implement member controls and prompts**

Add accessible block/report/unmatch controls to profile and conversation views. Empty accepted conversations show prompts derived from safe categories rather than copied biography text.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run: `npm test -- --run tests/member-safety-actions.test.ts tests/message-activation.test.ts tests/conversation-actions.test.ts tests/message-composer-ui.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: add LHR messaging activation and safety controls`

### Task 6: Public event acquisition and profile completion

**Files:**
- Modify: `middleware.ts`
- Modify: `app/events/page.tsx`
- Modify: `app/events/[id]/page.tsx`
- Modify: `app/landing-page.tsx`
- Modify: `components/UserProfileEditor.tsx`
- Create: `lib/profile-completion.ts`
- Test: `tests/public-event-marketing.test.ts`
- Test: `tests/profile-completion.test.ts`

**Interfaces:**
- Produces: `calculateProfileCompletion(input): ProfileCompletionResult`.
- Public event pages expose event presentation but never participant identities or member-only controls.

- [ ] **Step 1: Write failing public-event and completion tests**

Assert public GET access for event presentation, protected participation actions, absence of participant identities for visitors, truthful illustrative-member wording, and deterministic completion recommendations.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run tests/public-event-marketing.test.ts tests/profile-completion.test.ts`

Expected: old middleware redirect and missing completion module failures.

- [ ] **Step 3: Implement public presentation boundaries**

Allow public event list/detail reads, keep create/edit/join behind authentication, render registration CTAs for visitors, and emit event JSON-LD only when the event is explicitly public/bookable.

- [ ] **Step 4: Implement profile completion UI and truthful landing copy**

Show score and next action in the editor. Change any illustrative portrait wording that implies a verified real member unless the asset is confirmed as such.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run: `npm test -- --run tests/public-event-marketing.test.ts tests/profile-completion.test.ts tests/public-positioning-and-auth-shell.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: strengthen LHR event acquisition and profiles`

### Task 7: Full verification, production migration, and deployment

**Files:**
- Modify: `public/version.json` through the existing version script
- Modify: `deployments.log` only through the existing deployment procedure if that procedure owns it; do not commit it.

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified production release at `rencontrelovehotel.com`.

- [ ] **Step 1: Run complete local verification**

Run: `npm test -- --run`, `npm run lint`, `npm run build`, and `npm audit --audit-level=high`.

Expected: tests, typecheck, and build pass; any audit finding is assessed before deployment.

- [ ] **Step 2: Inspect the actual production deployment path and identity**

Confirm the domain target, current Git branch, active deployment account `gilleskorzec@gmail.com`, VPS2/Vercel ownership, and rollback mechanism using authenticated local tools without exposing credentials.

- [ ] **Step 3: Back up the production database**

Create a timestamped server-side backup before schema changes and verify the backup file is non-empty.

- [ ] **Step 4: Apply the migration and run aggregate smoke queries**

Apply `migrations/20260715_product_growth_cockpit.sql`, verify required tables/columns/indexes, and run read-only count checks.

- [ ] **Step 5: Update version, commit, and push**

Run the existing version script, commit the release, and push the current `codex/` branch.

- [ ] **Step 6: Deploy the confirmed production service**

Use the authenticated project deployment workflow, monitor build/runtime output, and keep the previous release available for rollback.

- [ ] **Step 7: Verify production end to end**

Check homepage, register/login, public events, authenticated discovery rotation, matches, conversation creation, member safety controls, admin diagnostic, legal/contact pages, version stamp, and mobile layout. Confirm no personal data appears in logs or analytics payloads.

- [ ] **Step 8: Report delivery**

Provide the deployed build, commit, migration result, backup result, tests, and any explicitly deferred item.
