# Compliance Foundation & Contact Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place le socle Compliance désactivé par défaut, bloquer les coordonnées hors plateforme dans les contenus membres et restreindre chaque lecture administrative de conversation à un motif audité.

**Architecture:** Un moteur déterministe partagé évalue les contenus avant toute écriture. Un service d’audit HMAC append-only conserve uniquement les métadonnées nécessaires. Les intégrations serveur échouent fermées lorsque le feature flag est actif, tandis que les canaux officiels utilisent une origine serveur distincte.

**Tech Stack:** Next.js 15 App Router, TypeScript, React 19, PostgreSQL 17, NextAuth 4, Vitest.

## Global Constraints

- Toutes les fonctions nouvelles sont désactivées par défaut.
- Aucun numéro, email, identifiant de paiement ou contenu intégral n’est écrit dans les logs Compliance.
- Aucun blocage de contenu ne bannit automatiquement un compte.
- Les canaux officiels sont autorisés par rôle et origine serveur, jamais par contenu.
- Les migrations sont additives et idempotentes.
- `deployments.log` reste hors Git et n’est jamais modifié.

---

### Task 1: Compliance configuration and fail-closed flags

**Files:**
- Create: `.env.compliance.example`
- Create: `config/compliance.ts`
- Create: `lib/legal-entity-config.ts`
- Test: `tests/compliance-config.test.ts`

**Interfaces:**
- Produces: `getComplianceFlags(env?)`, `getLegalEntityConfig(env?)`, `getLegalReadiness(env?)`.
- Consumers: audit, content policy, admin readiness and future legal publication.

- [ ] **Step 1: Write failing configuration tests**

Test that every flag is `false` when missing, only literal `true` enables it, empty legal values become `null`, and payment readiness fails when entity/contact/mediator/provider fields are absent.

- [ ] **Step 2: Run the red test**

Run: `npm test -- --run tests/compliance-config.test.ts`  
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement strict parsers**

```ts
export type ComplianceFlags = {
  legalCenter: boolean
  versionedAcceptance: boolean
  sensitiveConsent: boolean
  newReporting: boolean
  moderationAppeals: boolean
  coupleAccounts: boolean
  openCurtainConsent: boolean
  paymentHardening: boolean
  contactSafety: boolean
  scopedConversationAccess: boolean
}

const enabled = (value: string | undefined) => value === 'true'
```

Return nullable trimmed values from legal config and a list of missing fields from readiness.

- [ ] **Step 4: Add the example environment file**

Include every variable from the Compliance programme plus `LEGAL_AUDIT_HMAC_SECRET`, retention settings and contact/scoped-access flags. Use only blank or fictitious values and `false` flags.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- --run tests/compliance-config.test.ts && npm run lint`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .env.compliance.example config/compliance.ts lib/legal-entity-config.ts tests/compliance-config.test.ts
git commit -m "compliance: add fail-closed configuration foundation"
```

### Task 2: Additive audit and safety-event migration

**Files:**
- Create: `migrations/20260718_compliance_foundation.sql`
- Modify: `schema.sql`
- Test: `tests/compliance-foundation-migration.test.ts`

**Interfaces:**
- Produces tables `compliance_audit_log`, `compliance_safety_events`; extends `moderation_case_access` with justification and scope fields.
- Consumers: `lib/compliance-audit.ts`, content integrations and moderation actions.

- [ ] **Step 1: Write failing migration structure tests**

Assert additive/idempotent DDL, no destructive statements, HMAC hash fields, no raw content column in safety events, indexes and scoped access fields.

- [ ] **Step 2: Run the red test**

Run: `npm test -- --run tests/compliance-foundation-migration.test.ts`  
Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Create the migration**

```sql
CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id BIGSERIAL UNIQUE NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash CHAR(64),
  entry_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_safety_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  surface TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('block', 'hold')),
  categories TEXT[] NOT NULL,
  rule_ids TEXT[] NOT NULL,
  content_hmac CHAR(64) NOT NULL,
  masked_excerpt TEXT,
  engine_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Add `access_reason`, `scope_basis` and `authorized_by` to `moderation_case_access` without dropping existing columns.

- [ ] **Step 4: Mirror the schema and test**

Run: `npm test -- --run tests/compliance-foundation-migration.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260718_compliance_foundation.sql schema.sql tests/compliance-foundation-migration.test.ts
git commit -m "compliance: add immutable audit and safety event schema"
```

### Task 3: HMAC audit service

**Files:**
- Create: `lib/compliance-audit.ts`
- Test: `tests/compliance-audit.test.ts`

**Interfaces:**
- Produces: `appendComplianceAudit(input): Promise<{ id: string; entryHash: string }>` and `hmacSensitiveValue(value): string`.
- Consumes: `LEGAL_AUDIT_HMAC_SECRET`, PostgreSQL transaction/query client.

- [ ] **Step 1: Write failing tests**

Test deterministic HMAC, secret absence failure, metadata redaction, previous-hash inclusion and serialized insertion using an advisory transaction lock.

- [ ] **Step 2: Run red test**

Run: `npm test -- --run tests/compliance-audit.test.ts`  
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement canonical hashing and append**

Canonicalize allowed metadata recursively, reject keys matching password/token/secret/content/message/email/phone, lock with `pg_advisory_xact_lock`, read the latest hash, compute HMAC-SHA256 and insert.

- [ ] **Step 4: Run test and typecheck**

Run: `npm test -- --run tests/compliance-audit.test.ts && npm run lint`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/compliance-audit.ts tests/compliance-audit.test.ts
git commit -m "compliance: add chained HMAC audit service"
```

### Task 4: Deterministic contact-safety engine

**Files:**
- Create: `lib/contact-safety-policy.ts`
- Test: `tests/contact-safety-policy.test.ts`

**Interfaces:**
- Produces: `evaluateMemberContent(input): SafetyEvaluation`, `ContactSafetyError`, `assertMemberContentAllowed(input)`.
- Consumes: no database; pure deterministic logic.

- [ ] **Step 1: Write the failing rule matrix**

Cover French/international phones, compact/spaced/dotted numbers, `zero six`, emails, `arobase`/`point`, WhatsApp/Telegram/Signal/Snapchat contact phrases, social handles paired with contact intent, PayPal/Revolut/Lydia handles, invitation URLs and URL shorteners. Include legitimate dates, room prices, postal codes, ordinary words containing `tel`, and admin-origin exceptions.

- [ ] **Step 2: Run the red test**

Run: `npm test -- --run tests/contact-safety-policy.test.ts`  
Expected: FAIL because the engine does not exist.

- [ ] **Step 3: Implement normalization and rule evaluation**

Normalize NFKC, lowercase, diacritics and common separators while preserving a map for masking. Return `block` for clear contact/payment signals, `hold` for ambiguous off-platform combinations and `allow` otherwise. Do not embed a ban action.

- [ ] **Step 4: Run the complete matrix**

Run: `npm test -- --run tests/contact-safety-policy.test.ts`  
Expected: PASS with all false-positive fixtures allowed.

- [ ] **Step 5: Commit**

```bash
git add lib/contact-safety-policy.ts tests/contact-safety-policy.test.ts
git commit -m "compliance: block off-platform contact details"
```

### Task 5: Safety-event recording and escalation

**Files:**
- Create: `lib/content-safety-service.ts`
- Test: `tests/content-safety-service.test.ts`

**Interfaces:**
- Produces: `enforceMemberContent(input): Promise<SafetyEvaluation>`.
- Consumes: policy engine, HMAC service, compliance flags, moderation investigation tables.

- [ ] **Step 1: Write failing service tests**

Assert no database call when flag is false, no raw coordinate in inserts, block error returned, repeated attempts counted for 24 hours, and investigation created only after the configured repetition/combined-commercial threshold.

- [ ] **Step 2: Run red test**

Run: `npm test -- --run tests/content-safety-service.test.ts`  
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement enforcement**

Record `content_hmac`, masked excerpt, rules and categories. Throw `ContactSafetyError` before the business write. Use the existing investigation model for repeated/high-risk escalation and neutral notifications.

- [ ] **Step 4: Run tests**

Run: `npm test -- --run tests/content-safety-service.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content-safety-service.ts tests/content-safety-service.test.ts
git commit -m "compliance: record and escalate contact safety attempts"
```

### Task 6: Integrate messages and attachment filenames

**Files:**
- Modify: `actions/conversation-actions.ts`
- Modify: `app/api/messages/attachments/route.ts`
- Modify: `app/messages/[id]/page.tsx`
- Test: `tests/contact-safety-message-flow.test.ts`
- Test: `tests/contact-safety-upload.test.ts`

**Interfaces:**
- Consumes: `enforceMemberContent()` with surfaces `message` and `attachment_filename`.
- Produces: a stable user-facing error code `OFF_PLATFORM_CONTACT_BLOCKED`.

- [ ] **Step 1: Add failing integration tests**

Test that direct and attachment messages invoke safety before `INSERT INTO messages`/Blob upload, official admin moderation messages remain separate, and blocked content never reaches storage.

- [ ] **Step 2: Run red tests**

Run: `npm test -- --run tests/contact-safety-message-flow.test.ts tests/contact-safety-upload.test.ts`  
Expected: FAIL because enforcement is absent.

- [ ] **Step 3: Integrate server actions and route**

Call enforcement after authentication and validation but before moderation evaluation, database insertion or upload. Return the stable error to the composer with the text: « Pour votre sécurité, les coordonnées et moyens de contact externes ne peuvent pas être partagés. Poursuivez votre échange dans LHR. »

- [ ] **Step 4: Run integration tests**

Run: `npm test -- --run tests/contact-safety-message-flow.test.ts tests/contact-safety-upload.test.ts tests/conversation-actions.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add actions/conversation-actions.ts app/api/messages/attachments/route.ts app/messages/[id]/page.tsx tests/contact-safety-message-flow.test.ts tests/contact-safety-upload.test.ts
git commit -m "compliance: enforce in-app-only member messaging"
```

### Task 7: Integrate profiles, wall and member events

**Files:**
- Modify: `lib/onboarding-service.ts`
- Modify: `actions/user-actions.ts`
- Modify: `actions/community-wall-actions.ts`
- Modify: `actions/event-actions.ts`
- Test: `tests/contact-safety-public-surfaces.test.ts`

**Interfaces:**
- Consumes: `enforceMemberContent()` for `profile`, `wall_post`, `wall_comment`, `member_event`.
- Produces: no new public interface.

- [ ] **Step 1: Write failing surface tests**

Verify bio/suggestions/preferences, wall content and member-created event title/description/conditions are checked before writes. Verify admin-created official event fields are not passed through member policy.

- [ ] **Step 2: Run red test**

Run: `npm test -- --run tests/contact-safety-public-surfaces.test.ts`  
Expected: FAIL because enforcement is absent.

- [ ] **Step 3: Integrate all server writes**

Use a shared helper to evaluate only non-empty user-generated strings. Pass the authenticated actor and exact surface. Never trust a client-provided role or origin.

- [ ] **Step 4: Run tests**

Run: `npm test -- --run tests/contact-safety-public-surfaces.test.ts tests/event-actions-behavior.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/onboarding-service.ts actions/user-actions.ts actions/community-wall-actions.ts actions/event-actions.ts tests/contact-safety-public-surfaces.test.ts
git commit -m "compliance: protect member-created public content"
```

### Task 8: Scope administrative conversation access

**Files:**
- Modify: `actions/moderation-investigation-actions.ts`
- Modify: `components/moderation/conversation-thread.tsx`
- Modify: `app/moderation/[id]/page.tsx`
- Test: `tests/scoped-moderation-conversation-access.test.ts`

**Interfaces:**
- Produces: `requestInvestigationConversationAccess({ investigationId, conversationId, reason })` and read calls requiring an access grant.
- Consumes: compliance flags and chained audit service.

- [ ] **Step 1: Write failing authorization tests**

Test active investigation, linked alert/report, reason minimum length, admin role, expiration and an explicit bounded extension. Assert audit is written before returning message rows.

- [ ] **Step 2: Run red test**

Run: `npm test -- --run tests/scoped-moderation-conversation-access.test.ts`  
Expected: FAIL because blanket access still exists.

- [ ] **Step 3: Implement scoped grants**

Require a reason for each conversation. A linked alert authorizes direct review. An unlinked conversation requires a compliance-admin extension event with reason and expiry; until granular roles ship, only current `admin` can create that extension. Preserve the six-month surveillance end date as a maximum review boundary.

- [ ] **Step 4: Update UI**

Show linked conversations first. Before opening any thread, display a reason field and the access basis. Do not load the thread during list rendering.

- [ ] **Step 5: Run tests**

Run: `npm test -- --run tests/scoped-moderation-conversation-access.test.ts tests/moderation-investigation-actions.test.ts tests/moderation-investigation-ui.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add actions/moderation-investigation-actions.ts components/moderation/conversation-thread.tsx app/moderation/[id]/page.tsx tests/scoped-moderation-conversation-access.test.ts
git commit -m "compliance: scope and audit conversation review access"
```

### Task 9: Admin readiness and regression verification

**Files:**
- Create: `components/admin/compliance-readiness.tsx`
- Modify: `app/admin/page.tsx`
- Create: `tests/admin-compliance-readiness.test.ts`
- Create: `docs/compliance/DEPLOYMENT_PLAN.md`

**Interfaces:**
- Consumes: `getLegalReadiness()` and `getComplianceFlags()`.
- Produces: admin-only readiness card with no secret values.

- [ ] **Step 1: Write failing readiness test**

Test missing-field labels, all flags shown disabled by default, no environment values rendered, and critical payment warning.

- [ ] **Step 2: Implement readiness UI and deployment documentation**

Render only names/statuses and prerequisites. Document migration validation, backup, code deployment with flags false, verification, activation gates and rollback by flag.

- [ ] **Step 3: Run targeted and full verification**

Run:

```bash
npm test -- --run tests/compliance-config.test.ts tests/compliance-foundation-migration.test.ts tests/compliance-audit.test.ts tests/contact-safety-policy.test.ts tests/content-safety-service.test.ts tests/contact-safety-message-flow.test.ts tests/contact-safety-upload.test.ts tests/contact-safety-public-surfaces.test.ts tests/scoped-moderation-conversation-access.test.ts tests/admin-compliance-readiness.test.ts
npm run lint
npm test -- --run
npm run build
git diff --check
```

Expected: all tests and build pass with zero TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add components/admin/compliance-readiness.tsx app/admin/page.tsx tests/admin-compliance-readiness.test.ts docs/compliance/DEPLOYMENT_PLAN.md
git commit -m "compliance: expose fail-closed readiness controls"
```

### Task 10: Disabled production deployment

**Files:** No source change.

**Interfaces:** Deployment only; flags remain `false`.

- [ ] **Step 1: Confirm target and active account**

Target: VPS2 `/opt/mybotia/pods/pod-lhr`, production domain `rencontrelovehotel.com`, existing Docker Compose service `app`. No Vercel account change is required for the VPS2 deployment.

- [ ] **Step 2: Back up the production database**

Create a timestamped PostgreSQL dump and SHA-256 before applying the additive migration.

- [ ] **Step 3: Validate and apply migration**

Run the migration in a transaction with `ON_ERROR_STOP`, confirm tables/columns/indexes, and verify no row deletion.

- [ ] **Step 4: Deploy code with flags false**

Upload only committed files, rebuild `app`, recreate the container and wait for Docker health.

- [ ] **Step 5: Verify production**

Check login 200, protected admin redirect, container logs, readiness card when authenticated, schema presence and unchanged messaging behavior while the flag is false.

- [ ] **Step 6: Publish branch**

Push `compliance/legal-safety-hardening`. Do not activate contact blocking or scoped access until production configuration includes `LEGAL_AUDIT_HMAC_SECRET` through the approved secret mechanism and the authenticated smoke tests pass.
