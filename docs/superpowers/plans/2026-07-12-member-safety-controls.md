# Member Safety Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every displayed member identity lead to its profile and add separate, server-enforced personal blocking and profile reporting workflows.

**Architecture:** Add relational `user_blocks` and `profile_reports` tables, then expose session-bound safety actions from a focused server module. Reuse a shared member-safety client control on profiles and conversations, while enforcing blocks in messaging, matching and member discovery queries. Profile reports feed the existing moderation queue and admin email pipeline without automatic suspension.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, PostgreSQL, NextAuth 4, Vitest, Nodemailer admin notification service.

## Global Constraints

- A personal block affects only the two involved accounts and never suspends the blocked account globally.
- A report never hides, suspends or bans a profile automatically.
- Only administrative moderation may suspend or ban a platform account.
- Every member action derives the actor from the authenticated server session.
- Every administrative action retains `requireAdmin()`.
- Existing conversation history remains readable after a block, but all new sending is rejected.

---

### Task 1: Persistence and session-bound safety actions

**Files:**
- Create: `migrations/20260712_member_safety_controls.sql`
- Create: `actions/member-safety-actions.ts`
- Create: `tests/member-safety-actions.test.ts`
- Create: `tests/member-safety-migration.test.ts`

**Interfaces:**
- Produces: `getMemberSafetyState(memberId): Promise<{ blockedByMe: boolean; blockedMe: boolean; canInteract: boolean }>`
- Produces: `blockMember(memberId): Promise<{ success: true }>`
- Produces: `unblockMember(memberId): Promise<{ success: true }>`
- Produces: `reportProfile(input: { memberId: string; reason: ProfileReportReason; details?: string }): Promise<{ success: true; reportId: string }>`
- Produces: `assertUsersCanInteract(userA: string, userB: string): Promise<void>`

- [ ] **Step 1: Write migration and action tests that fail because tables and exports do not exist**

```ts
expect(migration).toContain('CREATE TABLE IF NOT EXISTS user_blocks')
expect(migration).toContain('CREATE TABLE IF NOT EXISTS profile_reports')
await expect(blockMember(targetId)).resolves.toEqual({ success: true })
await expect(reportProfile({ memberId: targetId, reason: 'harassment' })).resolves.toMatchObject({ success: true })
```

- [ ] **Step 2: Run the focused tests and confirm missing schema/actions failures**

Run: `npm test -- --run tests/member-safety-migration.test.ts tests/member-safety-actions.test.ts`

- [ ] **Step 3: Add idempotent schema with unique pairs, self-block checks, report statuses and moderation linkage**

```sql
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_blocks_distinct_users CHECK (blocker_id <> blocked_id),
  CONSTRAINT user_blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);
```

- [ ] **Step 4: Implement safety actions with `requireCurrentUser()`, parameterized SQL, moderation queue insertion and `notifyAdminByEmail()`**

```ts
export async function assertUsersCanInteract(userA: string, userB: string) {
  const rows = await sql.query(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [userA, userB]
  )
  if (rows.length) throw new Error('Cette interaction n’est pas disponible.')
}
```

- [ ] **Step 5: Run focused tests and commit the persistence layer**

Run: `npm test -- --run tests/member-safety-migration.test.ts tests/member-safety-actions.test.ts`

Commit: `feat: add member safety persistence`

### Task 2: Server enforcement in messages, matches and discovery

**Files:**
- Modify: `actions/conversation-actions.ts`
- Modify: `actions/user-actions.ts`
- Modify: `app/api/accept-match/route.ts`
- Modify: `tests/conversation-actions.test.ts`
- Modify: `tests/api-security-routes.test.ts`
- Create: `tests/member-blocking-enforcement.test.ts`

**Interfaces:**
- Consumes: `assertUsersCanInteract(userA, userB)` from Task 1.
- Produces: filtered conversation, directory and match results with blocked pairs excluded in either direction.

- [ ] **Step 1: Add failing tests for send, conversation creation, match request, match acceptance and directory filtering**

```ts
await expect(sendMessage(input)).rejects.toThrow('interaction')
await expect(findOrCreateConversation(userA, userB)).rejects.toThrow('interaction')
expect(discoverySql).toContain('NOT EXISTS')
expect(discoverySql).toContain('user_blocks')
```

- [ ] **Step 2: Run focused tests and confirm block enforcement is absent**

Run: `npm test -- --run tests/conversation-actions.test.ts tests/member-blocking-enforcement.test.ts tests/api-security-routes.test.ts`

- [ ] **Step 3: Enforce reciprocal blocks before any write and exclude blocked pairs from reads**

```sql
AND NOT EXISTS (
  SELECT 1 FROM user_blocks ub
  WHERE (ub.blocker_id = $1 AND ub.blocked_id = candidate.id)
     OR (ub.blocker_id = candidate.id AND ub.blocked_id = $1)
)
```

- [ ] **Step 4: Keep legacy/admin history readable but return a `can_interact` state for member conversations**

```sql
NOT EXISTS (
  SELECT 1 FROM user_blocks ub
  WHERE (ub.blocker_id = $1 AND ub.blocked_id = cu.user_id)
     OR (ub.blocker_id = cu.user_id AND ub.blocked_id = $1)
) AS can_interact
```

- [ ] **Step 5: Run focused tests and commit server enforcement**

Run: `npm test -- --run tests/conversation-actions.test.ts tests/member-blocking-enforcement.test.ts tests/api-security-routes.test.ts`

Commit: `feat: enforce personal blocks across relationships`

### Task 3: Profile links and member safety interface

**Files:**
- Create: `components/member-safety-controls.tsx`
- Modify: `app/profile/[id]/page.tsx`
- Modify: `app/messages/[id]/page.tsx`
- Modify: `app/messages/page.tsx`
- Modify: `components/participant-profile-popup.tsx`
- Modify: `components/community-wall.tsx`
- Modify: `tests/member-profile-ui.test.ts`
- Modify: `tests/messaging-premium-ui.test.ts`
- Create: `tests/member-links-and-safety-ui.test.ts`

**Interfaces:**
- Consumes: Task 1 safety actions and Task 2 `other_user_id` / `can_interact` conversation fields.
- Produces: `<MemberSafetyControls memberId memberName initialState compact?>`.

- [ ] **Step 1: Add failing UI contract tests for profile links, block/report controls and read-only composer**

```ts
expect(conversationPage).toContain('href={`/profile/${conversationDetails.other_user_id}`}')
expect(profilePage).toContain('<MemberSafetyControls')
expect(conversationPage).toContain('Conversation en lecture seule')
expect(eventPopup).toContain('href={`/profile/${participant.id}`}')
```

- [ ] **Step 2: Run focused UI tests and confirm controls and links are missing**

Run: `npm test -- --run tests/member-links-and-safety-ui.test.ts tests/member-profile-ui.test.ts tests/messaging-premium-ui.test.ts`

- [ ] **Step 3: Implement accessible dialogs and make avatar/name links explicit in conversation list and detail**

```tsx
<Link href={`/profile/${memberId}`} className='inline-flex items-center gap-3'>
  {identity}
</Link>
<MemberSafetyControls memberId={memberId} memberName={memberName} initialState={safetyState} />
```

- [ ] **Step 4: Disable text, media and vocal controls when `can_interact` is false while preserving message history**

```tsx
{canInteract ? <MessageComposer /> : <p>Conversation en lecture seule</p>}
```

- [ ] **Step 5: Link wall authors, commenters and event participants to their profiles**

Use `/profile/{userId}` for both avatar and visible member name; do not wrap reporting/admin identities as ordinary member links.

- [ ] **Step 6: Run focused tests and commit the member interface**

Run: `npm test -- --run tests/member-links-and-safety-ui.test.ts tests/member-profile-ui.test.ts tests/messaging-premium-ui.test.ts`

Commit: `feat: add profile links and member safety controls`

### Task 4: Administrative profile-report moderation

**Files:**
- Modify: `actions/admin-moderation-actions.ts`
- Modify: `app/admin/moderation/page.tsx`
- Modify: `tests/admin-moderation-actions.test.ts`
- Create: `tests/profile-report-moderation-ui.test.ts`

**Interfaces:**
- Produces: `getProfileReportQueue()` and `resolveProfileReport({ reportId, status, note })`, both guarded by `requireAdmin()`.

- [ ] **Step 1: Add failing tests for report listing, profile links and admin-only resolution**

```ts
expect(source).toContain('await requireAdmin()')
expect(page).toContain('Signalements de profils')
expect(page).toContain('href={`/profile/${item.reported_user_id}`}')
expect(source).not.toContain("UPDATE users SET status = 'banned'")
```

- [ ] **Step 2: Run focused moderation tests and confirm the queue is not exposed**

Run: `npm test -- --run tests/admin-moderation-actions.test.ts tests/profile-report-moderation-ui.test.ts`

- [ ] **Step 3: Implement admin listing and resolution without automated account mutation**

```ts
export async function resolveProfileReport(input: ResolveProfileReportInput) {
  const admin = await requireAdmin()
  await sql.query(
    `UPDATE profile_reports SET status=$2, resolved_by=$3, resolved_at=CURRENT_TIMESTAMP WHERE id=$1`,
    [input.reportId, input.status, admin.id]
  )
  return { success: true }
}
```

- [ ] **Step 4: Add the report section to the existing moderation page with reported/reporter profile links**

The card displays reason, details, distinct-report count, dates and actions `Examiner`, `Classer` and `Traité`.

- [ ] **Step 5: Run focused tests and commit moderation support**

Run: `npm test -- --run tests/admin-moderation-actions.test.ts tests/profile-report-moderation-ui.test.ts`

Commit: `feat: moderate profile reports`

### Task 5: Full verification and production rollout

**Files:**
- Modify only files required by failures discovered in this task.

**Interfaces:**
- Consumes all previous tasks and produces the production release.

- [ ] **Step 1: Run the complete automated suite, typecheck and production build**

Run: `npm test -- --run && npm run lint && npm run build`

- [ ] **Step 2: Back up production PostgreSQL and apply the versioned migration**

Create a timestamped dump under `/opt/mybotia/backups/lhr/`, verify its checksum, then execute `migrations/20260712_member_safety_controls.sql` with `ON_ERROR_STOP=1`.

- [ ] **Step 3: Push `main`, rebuild only `pod-lhr-app`, and wait for a healthy container**

Use `docker compose --env-file .env -f docker-compose.lhr.yml build app` followed by `up -d --no-deps app`.

- [ ] **Step 4: Run a production canary using two temporary accounts**

Verify profile links, block, blocked send, unblock, successful send, report creation, admin queue visibility and absence of automatic account suspension. Remove all temporary rows afterward.

- [ ] **Step 5: Verify HTTP health and recent runtime logs**

Expected: `/login` returns HTTP 200, `pod-lhr-app` is healthy, and the last 90 seconds contain no application errors.
