# V3 Visibility and Messaging Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the V3 community count and discovery list represent the 1,048 activated visible members and restore read/reply access to imported conversation histories without creating false matches.

**Architecture:** Add an explicit conversations.access_mode contract and classify existing rows additively as match, legacy_import, or admin. Reuse the same activated-member predicate in statistics and discovery. Keep participant checks and the accepted-match requirement for new direct conversations.

**Tech Stack:** Next.js server actions, PostgreSQL migrations, TypeScript, Vitest, ESLint, Docker Compose on VPS2.

## Global Constraints

- Delivery is direct to main; no pull request.
- Back up production before applying the migration.
- Do not delete users, messages, conversations, matches, or events.
- Activated member means active, non-banned, onboarding completed, and display_profile true.
- New member-to-member conversations still require an accepted match.
- Existing imported conversations with history may be read and answered by their participants.
- The codex/lhr-events-fluidity worktree is out of scope.

---

### Task 1: Define failing V3 contracts

**Files:**
- Create: /Users/admin/Documents/LHR-community-wall/tests/v3-foundation-migration.test.ts
- Modify: /Users/admin/Documents/LHR-community-wall/tests/server-action-guards.test.ts
- Modify: /Users/admin/Documents/LHR-community-wall/tests/conversation-actions.test.ts
- Modify: /Users/admin/Documents/LHR-community-wall/tests/community-home-ui.test.ts

**Interfaces:**
- Consumes: existing stats, discovery, conversation, and migration test patterns.
- Produces: red tests for the activated-member filter, migration classification, legacy reply access, and direct-match protection.

- [ ] Step 1: Add a migration source test that checks ADD COLUMN IF NOT EXISTS access_mode, legacy_import, admin, UPDATE conversations, and rejects DROP TABLE, TRUNCATE, or DELETE FROM messages/conversations.
- [ ] Step 2: Extend the stats test to require u.onboarding_completed = TRUE, up.display_profile = TRUE, and the non-banned predicate. Add a discovery source assertion for the same contract.
- [ ] Step 3: Add a sendMessage test where the conversation access mode is legacy_import, has_history is true, and has_accepted_match is false. Assert the saved message id is returned. Keep the existing unmatched-new-conversation denial test.
- [ ] Step 4: Run:

    npm test -- --run tests/v3-foundation-migration.test.ts tests/server-action-guards.test.ts tests/conversation-actions.test.ts tests/community-home-ui.test.ts

    Expected: FAIL because the migration is absent, activated filters are absent, and legacy_import is not accepted.
- [ ] Step 5: Commit:

    git add tests/v3-foundation-migration.test.ts tests/server-action-guards.test.ts tests/conversation-actions.test.ts tests/community-home-ui.test.ts
    git commit -m "test: define V3 visibility and legacy messaging contracts"

### Task 2: Add the additive conversation access migration

**Files:**
- Create: /Users/admin/Documents/LHR-community-wall/migrations/20260710_v3_conversation_access.sql
- Test: /Users/admin/Documents/LHR-community-wall/tests/v3-foundation-migration.test.ts

**Interfaces:**
- Consumes: conversations, conversation_participants, messages, users, and user_matches.
- Produces: conversations.access_mode with match, legacy_import, and admin values.

- [ ] Step 1: Create the migration:

    ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS access_mode TEXT NOT NULL DEFAULT 'match';

    ALTER TABLE conversations
      DROP CONSTRAINT IF EXISTS conversations_access_mode_check;

    ALTER TABLE conversations
      ADD CONSTRAINT conversations_access_mode_check
      CHECK (access_mode IN ('match', 'legacy_import', 'admin'));

    UPDATE conversations c
    SET access_mode = 'admin'
    WHERE EXISTS (
      SELECT 1
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = c.id AND u.role = 'admin'
    );

    UPDATE conversations c
    SET access_mode = 'legacy_import'
    WHERE c.access_mode = 'match'
      AND (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) >= 2
      AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)
      AND NOT EXISTS (
        SELECT 1
        FROM conversation_participants cp1
        JOIN conversation_participants cp2
          ON cp2.conversation_id = cp1.conversation_id
         AND cp2.user_id <> cp1.user_id
        JOIN user_matches um
          ON ((um.user_id_1 = cp1.user_id AND um.user_id_2 = cp2.user_id)
           OR (um.user_id_1 = cp2.user_id AND um.user_id_2 = cp1.user_id))
         AND um.status = 'accepted'
        WHERE cp1.conversation_id = c.id
      );

    CREATE INDEX IF NOT EXISTS idx_conversations_access_mode
      ON conversations (access_mode, updated_at DESC);

- [ ] Step 2: Run the migration source test. Expected: PASS.
- [ ] Step 3: Commit:

    git add migrations/20260710_v3_conversation_access.sql tests/v3-foundation-migration.test.ts
    git commit -m "feat: classify imported conversation access"

### Task 3: Apply the 1,048 activated-member contract

**Files:**
- Modify: /Users/admin/Documents/LHR-community-wall/actions/user-actions.ts
- Test: /Users/admin/Documents/LHR-community-wall/tests/server-action-guards.test.ts
- Test: /Users/admin/Documents/LHR-community-wall/tests/community-home-ui.test.ts

**Interfaces:**
- Consumes: getCommunityMemberStats() and getDiscoverProfiles().
- Produces: statistics and profiles filtered by the activated-member contract.

- [ ] Step 1: Add this predicate to every relevant stats filter:

    COALESCE(u.is_banned, false) = false
    AND COALESCE(u.status, 'active') <> 'banned'
    AND u.onboarding_completed = TRUE
    AND up.display_profile = TRUE

    The 24-hour count adds u.created_at >= NOW() - INTERVAL '24 hours'.
- [ ] Step 2: After the existing display_profile clause in discovery, add:

    whereClauses.push('u.onboarding_completed = TRUE')
    whereClauses.push("COALESCE(u.is_banned, false) = false")
    whereClauses.push("COALESCE(u.status, 'active') <> 'banned'")

- [ ] Step 3: Run focused tests:

    npm test -- --run tests/server-action-guards.test.ts tests/community-home-ui.test.ts tests/v3-foundation-migration.test.ts

    Expected: PASS.
- [ ] Step 4: Commit:

    git add actions/user-actions.ts tests/server-action-guards.test.ts tests/community-home-ui.test.ts
    git commit -m "fix: count and discover activated community members"

### Task 4: Restore imported conversations without weakening new-chat rules

**Files:**
- Modify: /Users/admin/Documents/LHR-community-wall/actions/conversation-actions.ts
- Test: /Users/admin/Documents/LHR-community-wall/tests/conversation-actions.test.ts

**Interfaces:**
- Consumes: conversations.access_mode, participant rows, accepted match rows, and admin participant rows.
- Produces: listing, reading, polling, and sending behavior defined by the V3 messaging policy.

- [ ] Step 1: Include c.access_mode in the conversation CTEs and allow rows when access_mode is legacy_import/admin, when an accepted match exists, or when an admin is involved. Keep participant ownership checks unchanged.
- [ ] Step 2: After the sender participant check, load access_mode and has_history with:

    SELECT c.access_mode,
           EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id) AS has_history
    FROM conversations c
    WHERE c.id = $1

    Allow legacy_import/admin history replies; keep accepted-match/admin checks for new direct conversations.
- [ ] Step 3: In findOrCreateConversation, return an existing conversation. Before creating a new member-to-member conversation, require an accepted match and throw:

    La messagerie nécessite un match accepté avant une nouvelle conversation.

- [ ] Step 4: Run:

    npm test -- --run tests/conversation-actions.test.ts

    Expected: PASS for legacy reply, admin reply, participant denial, polling authorization, and unmatched-new-chat denial.
- [ ] Step 5: Commit:

    git add actions/conversation-actions.ts tests/conversation-actions.test.ts
    git commit -m "fix: restore imported conversation access"

### Task 5: Validate, push, migrate, deploy, and verify

**Files:**
- Read: /Users/admin/Documents/LHR-community-wall/package.json
- Read: /Users/admin/Documents/LHR-community-wall/migrations/20260710_v3_conversation_access.sql

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: production showing 1,048 activated members and imported conversations available to participants.

- [ ] Step 1: Run local validation:

    npm run lint
    npm test -- --run
    npm run build
    git diff --check

    Expected: all commands exit 0.
- [ ] Step 2: Push main directly:

    git push origin main

- [ ] Step 3: Back up production before SQL:

    mkdir -p /opt/mybotia/pods/pod-lhr-backups
    docker compose exec -T postgres pg_dump -U lhr_app -d lhr -Fc > /opt/mybotia/pods/pod-lhr-backups/lhr-before-v3-conversation-access-YYYYMMDD-HHMM.dump

    Expected: a non-empty dump exists before the migration.
- [ ] Step 4: Apply 20260710_v3_conversation_access.sql once through the existing production migration mechanism. If no runner exists, execute it once with psql and inspect any partial failure before retrying.
- [ ] Step 5: Synchronize source with secret exclusions, rebuild pod-lhr-app, and wait for healthy.
- [ ] Step 6: Verify activated members = 1048, access_mode values are only match/legacy_import/admin, no message/conversation rows were deleted, and version.json reflects the deployment.

