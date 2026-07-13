# Member Activity Email Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit opt-in email notifications for messages, matches, and events, including signup consent and a one-time decision prompt for existing members.

**Architecture:** Extend `email_preferences` with a master activity consent, a decision timestamp, and three category flags. A single member-email service checks every eligibility rule before sending. Registration, the global authenticated shell, and the preferences page all use the same server-side preference actions.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, PostgreSQL, NextAuth 4, Nodemailer, Vitest.

## Global Constraints

- Activity email consent is false by default and absence of a decision never authorizes sending.
- Messages, matches, and events remain independently configurable after master consent.
- Campaign consent and security emails remain separate.
- Activity email failure must not roll back the underlying product action.
- New-message emails must not contain private message content.
- Every preference mutation must call `requireCurrentUser()` or be part of authenticated account creation.
- Production delivery is direct to `main` and VPS2 after migration, tests, typecheck, and build.

---

### Task 1: Preference storage and server contract

**Files:**
- Create: `migrations/20260713_member_activity_email_preferences.sql`
- Modify: `actions/email-preference-actions.ts`
- Test: `tests/member-activity-email-preferences.test.ts`

**Interfaces:**
- Produces: `ActivityEmailPreferences`, `getActivityEmailPreference()`, `updateActivityEmailPreference(input)`.
- `updateActivityEmailPreference` accepts `{ consent: boolean; messages: boolean; matches: boolean; events: boolean; source?: string }` and forces all categories false when consent is false.

- [ ] Write tests asserting migration defaults, decision timestamp, three category columns, session guards, and false-category normalization.
- [ ] Run `npm test -- --run tests/member-activity-email-preferences.test.ts` and confirm it fails because the migration and APIs do not exist.
- [ ] Add idempotent columns and implement the authenticated query/upsert actions.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Consent surfaces

**Files:**
- Modify: `app/register/page.tsx`
- Modify: `app/actions.ts`
- Modify: `lib/user-service.ts`
- Modify: `app/email-preferences/page.tsx`
- Create: `components/activity-email-consent-prompt.tsx`
- Create: `components/activity-email-preferences-form.tsx`
- Modify: `components/providers.tsx`
- Test: `tests/member-activity-email-consent-ui.test.ts`

**Interfaces:**
- Registration passes optional `activityEmailConsent` to `registerUser` and `createUser`.
- The prompt calls `getActivityEmailPreference` and records accept, decline, or customized categories.
- The preferences form edits master consent plus all three categories.

- [ ] Write tests for an unchecked signup control, global one-time prompt, accept/decline actions, and the four preference switches.
- [ ] Run the focused UI test and confirm it fails on missing controls/components.
- [ ] Add the optional registration checkbox and persist its explicit decision without making it mandatory.
- [ ] Add the connected one-time prompt and mount it under `AuthProvider`.
- [ ] Replace the campaign-only preferences screen with separate activity and campaign sections.
- [ ] Re-run the focused UI and preference tests.

### Task 3: Central activity email service

**Files:**
- Create: `lib/member-activity-email.ts`
- Test: `tests/member-activity-email-service.test.ts`

**Interfaces:**
- Produces: `sendMemberActivityEmail({ recipientUserId, category, subject, title, description, ctaLabel, ctaPath })`.
- Returns `{ sent: boolean; reason?: string }` and never throws to a caller.

- [ ] Write tests for no preference, no decision, master refusal, disabled category, unverified/banned/suppressed user, successful send, safe links, and SMTP failure.
- [ ] Run the focused test and confirm it fails because the service does not exist.
- [ ] Implement eligibility query, escaped HTML/text templates, SMTP transport, preference link, and non-throwing logs.
- [ ] Re-run the focused test and confirm it passes.

### Task 4: Message and match triggers

**Files:**
- Modify: `actions/conversation-actions.ts`
- Modify: `actions/user-actions.ts`
- Test: `tests/member-activity-email-triggers.test.ts`

**Interfaces:**
- Message category: recipient gets a generic new-message email linking to `/messages/{conversationId}` without message content.
- Match category: receiver gets request email and requester gets accepted email linking to `/matches`.

- [ ] Write trigger tests that mock the central service and verify recipient, category, link, and absence of private content.
- [ ] Run the focused trigger test and confirm it fails because no trigger exists.
- [ ] Call the central service after internal notification creation in all three paths.
- [ ] Re-run trigger and existing messaging/match tests.

### Task 5: Event triggers

**Files:**
- Modify: `actions/event-actions.ts`
- Modify: `actions/admin-moderation-actions.ts`
- Test: `tests/member-activity-event-emails.test.ts`

**Interfaces:**
- Participant email for their own successful join/leave action links to the event.
- Creator email for moderation outcome and participant-facing update email use category `events`.
- Existing admin reservation emails remain unchanged.

- [ ] Write tests for participant confirmation, creator moderation, and event update recipients.
- [ ] Run the focused event test and confirm it fails because member-email calls are absent.
- [ ] Add non-blocking central service calls after committed event actions.
- [ ] Re-run event tests and security guard tests.

### Task 6: Verification and production delivery

**Files:**
- Modify only files required by failed verification.

- [ ] Run `npm test -- --run` and require zero failures.
- [ ] Run `npm run lint` and require zero TypeScript errors.
- [ ] Run `npm run build` and require exit code zero.
- [ ] Commit implementation, fetch `origin/main`, and push directly to `main` only if histories are aligned.
- [ ] Apply `migrations/20260713_member_activity_email_preferences.sql` to the production PostgreSQL container before rebuilding the app.
- [ ] Upload changed runtime files, rebuild `pod-lhr-app`, and wait for `healthy`.
- [ ] Verify `https://rencontrelovehotel.com/login` returns 200 and recent production logs contain no new errors.
