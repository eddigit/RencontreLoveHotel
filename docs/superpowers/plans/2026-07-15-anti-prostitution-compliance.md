# Anti-Prostitution Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visible, legally grounded anti-solicitation safeguards, contextual message alerts, limited community moderation, human decisions and appeals, and a production evidence pack to LHR.

**Architecture:** A deterministic local policy engine classifies member content into allow, warn, hold, or restrict outcomes. Versioned consent and focused moderation cases provide evidence, while role-specific server guards prevent community moderators from browsing private conversations or imposing permanent sanctions. Public legal surfaces explain the policy and every adverse decision remains human-reviewable.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, PostgreSQL through `pg`, NextAuth 4, Vitest, Vercel.

## Global Constraints

- SARL L’HORA remains publisher, platform operator, data controller, and final moderation authority.
- Legal wording is a draft requiring French lawyer or DPO review before final publication.
- No external AI provider receives message content.
- No isolated ambiguous keyword can create a high-severity case or permanent sanction.
- No permanent sanction is automated.
- Community moderators receive case-only, pseudonymized, named, auditable access.
- Official room, event, and concierge prices are excluded from member-solicitation scoring.
- Production deployment targets Vercel project `love-hotel-rencontre` with the expected `gilleskorzec@gmail.com` account.

---

### Task 1: Legal Surfaces and Versioned Registration Consent

**Files:**
- Create: `lib/legal-policy.ts`
- Create: `app/community-safety/page.tsx`
- Create: `tests/anti-solicitation-public-surfaces.test.ts`
- Create: `tests/registration-consent.test.ts`
- Modify: `app/landing-page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `app/terms/page.tsx`
- Modify: `app/actions.ts`
- Modify: `lib/user-service.ts`
- Modify: `lib/route-access.ts`

**Interfaces:**
- Produces: `LEGAL_POLICY_VERSIONS`, `RegistrationConsent`, and `registerUser(email, password, name, consent)`.
- Consumes: the consent table added in Task 2; implementation may land with Task 2 in the same commit so registration never references a missing table.

- [ ] **Step 1: Write failing public-surface tests**

Assert that home, login, registration, terms, and `/community-safety` contain the adult-community prohibition, the distinction for official LHR prices, human review, and legal-review disclaimer. Assert `/community-safety` is public.

- [ ] **Step 2: Write failing registration tests**

Mock `createUser` and assert `registerUser` rejects when `adult`, `terms`, or `antiSolicitation` is false; assert it passes all current document versions to `createUser` when complete.

- [ ] **Step 3: Implement legal policy constants and public wording**

Use exact stable constants:

```ts
export const LEGAL_POLICY_VERSIONS = {
  terms: '2026-07-15',
  privacy: '2026-07-15',
  antiSolicitation: '2026-07-15'
} as const
```

Add prominent but concise cards to the home and auth pages and a full charter page. Update CGU with prohibited conduct, moderation, human review, appeal, and evidence-preservation clauses.

- [ ] **Step 4: Implement server-enforced consent**

Define:

```ts
export type RegistrationConsent = {
  adult: boolean
  terms: boolean
  antiSolicitation: boolean
  versions: typeof LEGAL_POLICY_VERSIONS
}
```

Reject missing or stale versions before creating a user. Insert the user and three acceptance records in one database transaction.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run tests/anti-solicitation-public-surfaces.test.ts tests/registration-consent.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/landing-page.tsx app/login/page.tsx app/register/page.tsx app/terms/page.tsx app/community-safety/page.tsx app/actions.ts lib/legal-policy.ts lib/user-service.ts lib/route-access.ts tests/anti-solicitation-public-surfaces.test.ts tests/registration-consent.test.ts migrations/20260715_anti_solicitation_compliance.sql
git commit -m "feat: add anti-solicitation legal commitment"
```

### Task 2: Additive Compliance Schema and Default Rules

**Files:**
- Create: `migrations/20260715_anti_solicitation_compliance.sql`
- Create: `tests/anti-solicitation-migration.test.ts`
- Modify: `schema.sql`

**Interfaces:**
- Produces: `legal_acceptances`, enriched `moderation_keywords`, enriched `moderation_queue`, `moderation_case_access`, `moderation_decisions`, `moderation_appeals`, and member role support.
- Consumes: existing `users`, `messages`, `moderation_keywords`, `moderation_queue`, and `admin_audit_log`.

- [ ] **Step 1: Write the failing migration contract test**

Assert idempotent `IF NOT EXISTS` structures, foreign keys, constrained statuses/outcomes, retention deadlines, rule version/category/weight fields, named case-access logs, decisions, appeals, and seeded inactive anti-solicitation rules.

- [ ] **Step 2: Implement an additive, reversible migration**

Do not destroy current moderation data. Extend existing tables, backfill neutral defaults, add new constraints only after backfill, and seed reviewed rule phrases with `active = false` so deployment cannot begin scanning before code is live.

- [ ] **Step 3: Update canonical schema**

Mirror the migration in `schema.sql` so new environments are complete.

- [ ] **Step 4: Run the migration test**

Run: `npm test -- --run tests/anti-solicitation-migration.test.ts`

Expected: migration contract passes.

### Task 3: Deterministic Contextual Policy Engine

**Files:**
- Create: `lib/anti-solicitation-policy.ts`
- Create: `tests/anti-solicitation-policy.test.ts`

**Interfaces:**
- Produces:

```ts
export type ModerationOutcome = 'allow' | 'warn' | 'hold' | 'restrict'
export type PolicyEvaluation = {
  outcome: ModerationOutcome
  score: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  matchedRuleIds: string[]
  matchedCategories: string[]
  policyVersion: string
}
export function evaluateAntiSolicitation(
  content: string,
  rules: ModerationPolicyRule[],
  context?: { repeatedRecipientCount?: number }
): PolicyEvaluation
```

- [ ] **Step 1: Write table-driven failing tests**

Cover accents/case, `cadeau` alone, `prix de l’événement`, official hotel wording, explicit price-plus-sexual-service phrases, payment methods, external contacts, combined categories, and repeated outbound messages.

- [ ] **Step 2: Implement normalization and category scoring**

Normalize Unicode and whitespace, use word/phrase boundaries, deduplicate categories, and derive the outcome from versioned thresholds. The engine must be pure and contain no database, logging, network, or notification calls.

- [ ] **Step 3: Run focused tests**

Run: `npm test -- --run tests/anti-solicitation-policy.test.ts`

Expected: all classification cases pass.

- [ ] **Step 4: Commit**

```bash
git add lib/anti-solicitation-policy.ts tests/anti-solicitation-policy.test.ts
git commit -m "feat: classify paid sexual solicitation contextually"
```

### Task 4: Enforce Policy in Message Delivery

**Files:**
- Create: `lib/moderation-case-service.ts`
- Create: `tests/anti-solicitation-message-flow.test.ts`
- Modify: `actions/conversation-actions.ts`
- Modify: `app/messages/[id]/page.tsx`
- Modify: `tests/conversation-actions.test.ts`

**Interfaces:**
- Consumes: `evaluateAntiSolicitation`, active database rules, and the Task 2 schema.
- Produces: `createModerationCase`, delivery results with `moderationOutcome`, and user-visible warnings/holds.

- [ ] **Step 1: Write failing message-flow tests**

Prove that `allow` inserts and notifies normally, `warn` inserts and returns a reminder, `hold` creates a case without inserting or notifying a recipient, `restrict` creates a critical case and temporary restriction, and no content appears in logs or notifications.

- [ ] **Step 2: Implement atomic evaluation and delivery**

After auth, participation, match, and block checks, load active rules and repetition context, evaluate content, then use one database transaction for message/case state. A case notification contains only case id and severity.

- [ ] **Step 3: Add sender feedback**

Show the contractual reason, human-review status, and safety-charter link. Do not show internal rules, weights, or reporter identity.

- [ ] **Step 4: Disable normal retrospective bulk scanning**

Remove the scan button and exported bulk scan from the ordinary moderation flow. Preserve no unrestricted message-search path for `community_moderator`.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run tests/anti-solicitation-message-flow.test.ts tests/conversation-actions.test.ts tests/admin-moderation-actions.test.ts`

Expected: all message and moderation tests pass.

- [ ] **Step 6: Commit**

```bash
git add actions/conversation-actions.ts actions/admin-moderation-actions.ts app/messages/[id]/page.tsx lib/moderation-case-service.ts tests/anti-solicitation-message-flow.test.ts tests/conversation-actions.test.ts tests/admin-moderation-actions.test.ts
git commit -m "feat: hold high-risk solicitation messages for review"
```

### Task 5: Dedicated Member Reports and Community Moderator Access

**Files:**
- Create: `lib/moderation-auth.ts`
- Create: `actions/moderation-case-actions.ts`
- Create: `tests/community-moderator-access.test.ts`
- Modify: `actions/member-safety-actions.ts`
- Modify: `components/member-safety-menu.tsx`
- Modify: `lib/server-auth.ts`
- Modify: `next-auth.d.ts`
- Modify: `lib/auth.ts`

**Interfaces:**
- Produces: `requireModerator`, case-only list/detail actions, `recordCaseAccess`, and report reason `paid_sexual_solicitation`.
- Consumes: NextAuth user role and Task 2 case structures.

- [ ] **Step 1: Write failing authorization tests**

Assert ordinary members cannot access cases, community moderators see pseudonymized case-only data, admins see necessary identity, case views log access, and only admins can permanently ban or legally escalate.

- [ ] **Step 2: Add dedicated member reporting**

Add the report reason to the server allow-list and UI. A conversation report proves the reporter participates and links only the selected message/case evidence.

- [ ] **Step 3: Implement least-privilege guards and projections**

Never return email, legal name, full conversation history, or unrestricted message search results to a community moderator. Log every detail view.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run tests/member-safety-actions.test.ts tests/community-moderator-access.test.ts tests/server-action-guards.test.ts`

Expected: all access controls pass.

- [ ] **Step 5: Commit**

```bash
git add actions/member-safety-actions.ts actions/moderation-case-actions.ts components/member-safety-menu.tsx lib/moderation-auth.ts lib/server-auth.ts lib/auth.ts next-auth.d.ts tests/member-safety-actions.test.ts tests/community-moderator-access.test.ts tests/server-action-guards.test.ts
git commit -m "feat: add limited community moderation cases"
```

### Task 6: Human Decisions, Appeals, and Moderation UI

**Files:**
- Create: `app/moderation/page.tsx`
- Create: `app/moderation/[id]/page.tsx`
- Create: `app/account/appeals/page.tsx`
- Create: `tests/moderation-decisions-and-appeals.test.ts`
- Modify: `app/admin/moderation/page.tsx`
- Modify: `actions/moderation-case-actions.ts`
- Modify: `lib/route-access.ts`

**Interfaces:**
- Produces: case queue, case detail, decision creation, appeal submission, and appeal review.
- Consumes: Task 5 authorization and Task 2 decision/appeal schema.

- [ ] **Step 1: Write failing decision and appeal tests**

Assert reasons are mandatory, permanent ban is admin-only, automation is disclosed, appeal is available, and a human may reverse the decision.

- [ ] **Step 2: Implement case queue and detail views**

Replace raw message listings with focused cases. Display score categories without exposing evasion-friendly rule details. Show access scope and confidentiality reminders.

- [ ] **Step 3: Implement decisions and appeals**

Store the decision, policy ground, duration, actor, automation contribution, statement of reasons, and appeal status. Notify the affected member without including sensitive excerpts.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run tests/moderation-decisions-and-appeals.test.ts tests/admin-moderation-actions.test.ts tests/admin-ui-entrypoints.test.ts`

Expected: all human-review workflows pass.

### Task 7: Compliance Evidence, Retention, and Event Checklist

**Files:**
- Create: `docs/compliance/2026-07-15-anti-prostitution-action-plan.md`
- Create: `docs/compliance/anti-solicitation-legal-matrix.md`
- Create: `docs/compliance/community-moderator-charter-draft.md`
- Create: `docs/compliance/moderation-and-appeals-procedure.md`
- Create: `docs/compliance/event-compliance-checklist.md`
- Create: `docs/compliance/anti-solicitation-dpia-draft.md`
- Create: `scripts/cleanup-moderation-cases.ts`
- Create: `tests/moderation-retention.test.ts`

**Interfaces:**
- Produces: dated legal matrix, operational evidence pack, moderator charter, event checklist, DPIA draft, and expiry cleanup.
- Consumes: exact implemented fields and outcomes from Tasks 2–6.

- [ ] **Step 1: Write failing retention tests**

Assert no-action evidence expires after 90 days, sanction/appeal evidence after 12 months, active legal holds are excluded, and cleanup returns anonymous aggregate counts only.

- [ ] **Step 2: Implement cleanup in dry-run-first mode**

Require `--execute` for deletion. Log counts and case ids only, never excerpts or identities.

- [ ] **Step 3: Write the evidence documents**

For every control, record official source, applicability, implementation evidence, owner, retention, residual risk, and `validation juridique requise` where appropriate.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run tests/moderation-retention.test.ts`

Expected: retention and legal-hold behavior pass.

### Task 8: Full Verification and Production Rollout

**Files:**
- Modify only if verification reveals an in-scope defect.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified production deployment and recorded deployment evidence.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test -- --run
npm run lint
npm run build
npm audit --audit-level=high
```

Expected: tests, TypeScript, build, and high-severity dependency audit pass.

- [ ] **Step 2: Verify deployment identity and target**

Confirm Vercel user is `gilleskorzec`, linked project is `love-hotel-rencontre`, target is Production, and production database backup/rollback path is documented.

- [ ] **Step 3: Apply additive production migration**

Use the authenticated production database path without printing credentials. Capture only migration name, timestamp, success/failure, and schema verification counts.

- [ ] **Step 4: Deploy to Vercel Production**

Run: `vercel deploy --prod --yes`

Expected: successful production deployment for `rencontrelovehotel.com`.

- [ ] **Step 5: Perform non-destructive visual and behavioral checks**

Verify home, login, registration, terms, charter, reporting, and moderator authorization. Use fictitious content only; do not send a real solicitation to another member.

- [ ] **Step 6: Record final evidence**

Record deployment URL, production alias, migration identifier, verification results, legal-review items, and next review date without secrets or personal data.

