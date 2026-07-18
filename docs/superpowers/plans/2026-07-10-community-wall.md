# Mur D'Annonces Communauté Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 member-only community wall on `/discover`, with text posts, comments, moderation, reports, anti-spam, admin arbitration, and a public anonymized teaser.

**Architecture:** Add a versioned PostgreSQL migration for wall data, then implement all wall behavior through server actions guarded by `requireCurrentUser()` and `requireAdmin()`. The member UI is composed from small client components embedded in the existing `/discover` central column; public `/` receives only static anonymized teaser markup.

**Tech Stack:** Next.js App Router, React 19, TypeScript, PostgreSQL via `lib/db.ts`, Vitest, existing shadcn-style components, existing `moderation_keywords` / `moderation_queue`.

## Global Constraints

- Branch: `codex/lhr-community-wall`, based on `main`.
- PR base: `main`.
- No production deploy without explicit GO.
- Use `npm install --legacy-peer-deps`; do not remove it.
- No wall photos in v1.
- No real wall content on public landing.
- Every wall member action must call `requireCurrentUser()`.
- Every wall admin action must call `requireAdmin()`.
- Use existing `moderation_keywords` and `moderation_queue`.
- Keep route/page access aligned with `lib/route-access.ts`.
- Preserve the current P0 security hardening from commit `88c2a54`.

---

## File Structure

- Create `migrations/20260710_community_wall.sql`
  - Owns `wall_posts`, `wall_comments`, `wall_reports`, indexes, constraints, and `moderation_queue.source_type` extension.

- Create `tests/community-wall-migration.test.ts`
  - Verifies migration content and idempotency markers.

- Create `actions/community-wall-actions.ts`
  - Owns member feed, composer event list, post/comment creation, reporting, author removal, moderation keyword scan, and anti-spam.

- Create `tests/community-wall-actions.test.ts`
  - Mocks DB/auth and verifies business rules.

- Modify `actions/admin-moderation-actions.ts`
  - Adds wall-specific queue read/restore/remove admin actions.

- Modify `tests/admin-moderation-actions.test.ts`
  - Verifies new admin actions and guards.

- Create `components/community-wall.tsx`
  - Container client component for loading feed and composer events, refreshing after mutations.

- Create `components/community-wall-composer.tsx`
  - Composer UI for type, text, optional event, and duration.

- Create `components/community-wall-post-card.tsx`
  - Post card UI, comments, report/remove controls.

- Modify `app/discover/page.tsx`
  - Imports and renders `CommunityWall` in central column above "En ligne maintenant".

- Modify `tests/community-home-ui.test.ts`
  - Verifies wall placement and component import.

- Modify `app/landing-page.tsx`
  - Adds static anonymized teaser section.

- Create `tests/community-wall-public-teaser.test.ts`
  - Verifies teaser copy and no wall server action import on public landing.

---

### Task 1: Migration

**Files:**
- Create: `migrations/20260710_community_wall.sql`
- Create: `tests/community-wall-migration.test.ts`

**Interfaces:**
- Produces: PostgreSQL tables `wall_posts`, `wall_comments`, `wall_reports`.
- Produces: moderation source types `wall_post`, `wall_comment`.
- Consumed by: `actions/community-wall-actions.ts` and `actions/admin-moderation-actions.ts`.

- [ ] **Step 1: Write the failing migration test**

Create `tests/community-wall-migration.test.ts`:

```ts
import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community wall migration', () => {
  const sql = readFileSync('migrations/20260710_community_wall.sql', 'utf8')

  it('creates wall post, comment and report tables', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS wall_posts')
    expect(sql).toContain("type IN ('profil', 'evenement', 'dispo_rideaux_ouverts')")
    expect(sql).toContain('char_length(body) BETWEEN 1 AND 500')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS wall_comments')
    expect(sql).toContain('char_length(body) BETWEEN 1 AND 300')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS wall_reports')
    expect(sql).toContain('UNIQUE (target_type, target_id, reporter_id)')
  })

  it('adds feed and moderation indexes', () => {
    expect(sql).toContain('idx_wall_posts_feed')
    expect(sql).toContain('idx_wall_posts_user_created')
    expect(sql).toContain('idx_wall_comments_post_created')
    expect(sql).toContain('idx_wall_reports_target')
  })

  it('extends moderation queue source types for wall content', () => {
    expect(sql).toContain('moderation_queue_source_type_check')
    expect(sql).toContain("'wall_post'")
    expect(sql).toContain("'wall_comment'")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --run tests/community-wall-migration.test.ts
```

Expected: FAIL because `migrations/20260710_community_wall.sql` does not exist.

- [ ] **Step 3: Add the migration**

Create `migrations/20260710_community_wall.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS wall_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wall_posts_type_check
    CHECK (type IN ('profil', 'evenement', 'dispo_rideaux_ouverts')),
  CONSTRAINT wall_posts_body_length_check
    CHECK (char_length(body) BETWEEN 1 AND 500),
  CONSTRAINT wall_posts_status_check
    CHECK (status IN ('active', 'hidden', 'removed')),
  CONSTRAINT wall_posts_dispo_expiration_check
    CHECK (type <> 'dispo_rideaux_ouverts' OR expires_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS wall_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wall_comments_body_length_check
    CHECK (char_length(body) BETWEEN 1 AND 300),
  CONSTRAINT wall_comments_status_check
    CHECK (status IN ('active', 'hidden', 'removed'))
);

CREATE TABLE IF NOT EXISTS wall_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wall_reports_target_type_check
    CHECK (target_type IN ('wall_post', 'wall_comment')),
  UNIQUE (target_type, target_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_wall_posts_feed
  ON wall_posts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wall_posts_user_created
  ON wall_posts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wall_posts_event
  ON wall_posts (event_id);

CREATE INDEX IF NOT EXISTS idx_wall_comments_post_created
  ON wall_comments (post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_wall_comments_user_created
  ON wall_comments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wall_reports_target
  ON wall_reports (target_type, target_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'moderation_queue_source_type_check'
      AND conrelid = 'moderation_queue'::regclass
  ) THEN
    ALTER TABLE moderation_queue
      DROP CONSTRAINT moderation_queue_source_type_check;
  END IF;

  ALTER TABLE moderation_queue
    ADD CONSTRAINT moderation_queue_source_type_check
    CHECK (source_type IN ('message', 'profile', 'event', 'user', 'wall_post', 'wall_comment'));
END $$;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- --run tests/community-wall-migration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260710_community_wall.sql tests/community-wall-migration.test.ts
git commit -m "feat: add community wall schema"
```

---

### Task 2: Member Wall Action Types And Guards

**Files:**
- Create: `actions/community-wall-actions.ts`
- Create: `tests/community-wall-actions.test.ts`

**Interfaces:**
- Produces types:
  - `WallPostType = 'profil' | 'evenement' | 'dispo_rideaux_ouverts'`
  - `CreateWallPostInput`
  - `CreateWallCommentInput`
- Produces functions:
  - `createWallPost(input: CreateWallPostInput)`
  - `createWallComment(input: CreateWallCommentInput)`
  - `getCommunityWallFeed(input?: { limit?: number })`
  - `getWallComposerEvents()`
  - `reportWallPost(input: { postId: string; reason?: string })`
  - `reportWallComment(input: { commentId: string; reason?: string })`
  - `removeOwnWallPost(input: { postId: string })`

- [ ] **Step 1: Write failing guard tests**

Create `tests/community-wall-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireCurrentUserMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => {
  const fn = vi.fn()
  return Object.assign(fn, { query: vi.fn() })
})

vi.mock('@/lib/server-auth', () => ({
  requireCurrentUser: requireCurrentUserMock
}))

vi.mock('@/lib/db', () => ({
  sql: sqlMock
}))

describe('community wall actions', () => {
  beforeEach(() => {
    vi.resetModules()
    requireCurrentUserMock.mockReset()
    requireCurrentUserMock.mockResolvedValue({ id: 'user-1', role: 'user' })
    sqlMock.mockReset()
    sqlMock.query.mockReset()
  })

  it('requires a session before loading the wall feed', async () => {
    requireCurrentUserMock.mockRejectedValueOnce(new Error('Authentification requise'))
    const { getCommunityWallFeed } = await import('@/actions/community-wall-actions')

    await expect(getCommunityWallFeed()).rejects.toThrow('Authentification')
    expect(sqlMock.query).not.toHaveBeenCalled()
  })

  it('requires a session before creating a post', async () => {
    requireCurrentUserMock.mockRejectedValueOnce(new Error('Authentification requise'))
    const { createWallPost } = await import('@/actions/community-wall-actions')

    await expect(createWallPost({ type: 'profil', body: 'Bonjour le mur' })).rejects.toThrow('Authentification')
    expect(sqlMock.query).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- --run tests/community-wall-actions.test.ts
```

Expected: FAIL because `actions/community-wall-actions.ts` does not exist.

- [ ] **Step 3: Add minimal action module with guards**

Create `actions/community-wall-actions.ts`:

```ts
'use server'

import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'

export type WallPostType = 'profil' | 'evenement' | 'dispo_rideaux_ouverts'

export type CreateWallPostInput = {
  type: WallPostType
  body: string
  eventId?: string | null
  durationHours?: 24 | 48
}

export type CreateWallCommentInput = {
  postId: string
  body: string
}

export async function getCommunityWallFeed(input: { limit?: number } = {}) {
  await requireCurrentUser()
  return sql.query(
    `
      SELECT id
      FROM wall_posts
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [input.limit || 20]
  )
}

export async function getWallComposerEvents() {
  await requireCurrentUser()
  return []
}

export async function createWallPost(input: CreateWallPostInput) {
  await requireCurrentUser()
  return { success: true, status: 'active' as const }
}

export async function createWallComment(input: CreateWallCommentInput) {
  await requireCurrentUser()
  return { success: true, status: 'active' as const }
}

export async function reportWallPost(input: { postId: string; reason?: string }) {
  await requireCurrentUser()
  return { success: true }
}

export async function reportWallComment(input: { commentId: string; reason?: string }) {
  await requireCurrentUser()
  return { success: true }
}

export async function removeOwnWallPost(input: { postId: string }) {
  await requireCurrentUser()
  return { success: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- --run tests/community-wall-actions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add actions/community-wall-actions.ts tests/community-wall-actions.test.ts
git commit -m "feat: add community wall action guards"
```

---

### Task 3: Post Creation, Feed, Events, Expiration And Keyword Moderation

**Files:**
- Modify: `actions/community-wall-actions.ts`
- Modify: `tests/community-wall-actions.test.ts`

**Interfaces:**
- Consumes `CreateWallPostInput`.
- Produces `getCommunityWallFeed()` with author, event, and comment metadata.
- Produces hidden queue behavior through `moderation_queue`.

- [ ] **Step 1: Add failing tests for post rules**

Append to `tests/community-wall-actions.test.ts`:

```ts
  it('creates a profile post as active when no keyword matches', async () => {
    sqlMock.query
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'post-1', status: 'active' }])

    const { createWallPost } = await import('@/actions/community-wall-actions')

    const result = await createWallPost({ type: 'profil', body: 'Disponible pour rencontrer la communauté.' })

    expect(result).toEqual({ success: true, status: 'active', postId: 'post-1' })
    expect(sqlMock.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO wall_posts'), expect.arrayContaining(['user-1', 'profil']))
  })

  it('requires 24h or 48h expiration for rideaux ouverts posts', async () => {
    const { createWallPost } = await import('@/actions/community-wall-actions')

    await expect(
      createWallPost({ type: 'dispo_rideaux_ouverts', body: 'Ouverts ce soir.' })
    ).rejects.toThrow('24 h ou 48 h')
    expect(sqlMock.query).not.toHaveBeenCalled()
  })

  it('hides keyword-matched posts and queues them for moderation', async () => {
    sqlMock.query
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ keyword: 'spam', severity: 'high', action: 'hide' }])
      .mockResolvedValueOnce([{ id: 'post-2', status: 'hidden' }])
      .mockResolvedValueOnce([])

    const { createWallPost } = await import('@/actions/community-wall-actions')

    const result = await createWallPost({ type: 'profil', body: 'Ce texte contient spam.' })

    expect(result.status).toBe('hidden')
    expect(sqlMock.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO moderation_queue'), expect.arrayContaining(['wall_post', 'post-2']))
  })

  it('blocks the fourth post in a rolling 24 hour window', async () => {
    sqlMock.query.mockResolvedValueOnce([{ count: '3' }])
    const { createWallPost } = await import('@/actions/community-wall-actions')

    await expect(createWallPost({ type: 'profil', body: 'Encore une annonce.' })).rejects.toThrow('3 annonces')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- --run tests/community-wall-actions.test.ts
```

Expected: FAIL on missing validation, DB insert, keyword moderation, and anti-spam behavior.

- [ ] **Step 3: Implement post validation and moderation**

Update `actions/community-wall-actions.ts` with helpers and `createWallPost`:

```ts
type ModerationRule = {
  keyword: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: 'flag' | 'hide' | 'escalate'
}

const severityRank = { low: 1, medium: 2, high: 3, critical: 4 }

function normalizeBody(body: string, maxLength: number) {
  const normalized = body.trim()
  if (!normalized) throw new Error('Le texte est obligatoire')
  if (normalized.length > maxLength) throw new Error(`Texte limité à ${maxLength} caractères`)
  return normalized
}

function normalizeType(type: string): WallPostType {
  if (type === 'profil' || type === 'evenement' || type === 'dispo_rideaux_ouverts') return type
  throw new Error('Type d’annonce invalide')
}

async function scanTextForModeration(body: string) {
  const rules = await sql.query<ModerationRule[]>(
    `
      SELECT keyword, severity, action
      FROM moderation_keywords
      WHERE active = true
    `,
    []
  )
  const normalized = body.toLowerCase()
  const matches = rules.filter(rule => normalized.includes(rule.keyword.toLowerCase()))
  if (matches.length === 0) return null
  const highest = matches.reduce((current, rule) =>
    severityRank[rule.severity] > severityRank[current.severity] ? rule : current
  )
  return {
    severity: highest.severity,
    action: highest.action,
    matchedKeywords: matches.map(rule => rule.keyword)
  }
}

async function queueWallModeration(input: {
  sourceType: 'wall_post' | 'wall_comment'
  sourceId: string
  userId: string
  severity: string
  reason: string
  matchedKeywords?: string[]
  excerpt?: string
  metadata?: Record<string, unknown>
}) {
  await sql.query(
    `
      INSERT INTO moderation_queue (
        source_type, source_id, user_id, severity, status,
        reason, matched_keywords, excerpt, metadata
      )
      SELECT $1, $2, $3, $4, 'new', $5, $6::text[], $7, $8::jsonb
      WHERE NOT EXISTS (
        SELECT 1 FROM moderation_queue
        WHERE source_type = $1
          AND source_id = $2
          AND status IN ('new', 'in_review', 'escalated')
      )
    `,
    [
      input.sourceType,
      input.sourceId,
      input.userId,
      input.severity,
      input.reason,
      input.matchedKeywords || [],
      input.excerpt || null,
      JSON.stringify(input.metadata || {})
    ]
  )
}
```

Then replace `createWallPost` with:

```ts
export async function createWallPost(input: CreateWallPostInput) {
  const user = await requireCurrentUser()
  const type = normalizeType(input.type)
  const body = normalizeBody(input.body, 500)

  const [{ count }] = await sql.query<Array<{ count: string | number }>>(
    `
      SELECT COUNT(*) as count
      FROM wall_posts
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND status <> 'removed'
    `,
    [user.id]
  )

  if (Number(count || 0) >= 3) {
    throw new Error('Maximum 3 annonces par 24 h')
  }

  let expiresAtExpression: string | null = null
  let eventId = input.eventId || null

  if (type === 'dispo_rideaux_ouverts') {
    if (input.durationHours !== 24 && input.durationHours !== 48) {
      throw new Error('Choisissez une expiration 24 h ou 48 h')
    }
    expiresAtExpression = `${input.durationHours} hours`
    eventId = null
  }

  if (type === 'evenement' && eventId) {
    const [event] = await sql.query<Array<{ id: string }>>(
      `
        SELECT id
        FROM events
        WHERE id = $1
          AND publication_status = 'published'
          AND (
            event_date > CURRENT_DATE
            OR (event_date = CURRENT_DATE AND COALESCE(event_time, '23:59:59'::time) > CURRENT_TIME)
          )
      `,
      [eventId]
    )
    if (!event) throw new Error('Événement indisponible pour le mur')
  }

  const moderation = await scanTextForModeration(body)
  const status = moderation ? 'hidden' : 'active'

  const [post] = await sql.query<Array<{ id: string; status: 'active' | 'hidden' }>>(
    `
      INSERT INTO wall_posts (user_id, type, body, event_id, expires_at, status)
      VALUES (
        $1, $2, $3, $4,
        CASE WHEN $5::text IS NULL THEN NULL ELSE NOW() + ($5::text)::interval END,
        $6
      )
      RETURNING id, status
    `,
    [user.id, type, body, eventId, expiresAtExpression, status]
  )

  if (moderation) {
    await queueWallModeration({
      sourceType: 'wall_post',
      sourceId: post.id,
      userId: user.id,
      severity: moderation.severity,
      reason: 'Mot-clé détecté dans une annonce du mur',
      matchedKeywords: moderation.matchedKeywords,
      excerpt: body.slice(0, 280),
      metadata: { action: moderation.action }
    })
  }

  return { success: true, status: post.status, postId: post.id }
}
```

- [ ] **Step 4: Implement feed and composer events**

Replace `getCommunityWallFeed` and `getWallComposerEvents`:

```ts
export async function getCommunityWallFeed(input: { limit?: number } = {}) {
  await requireCurrentUser()
  const limit = Math.min(Math.max(input.limit || 20, 1), 50)

  return sql.query(
    `
      SELECT
        wp.*,
        u.name AS author_name,
        u.avatar AS author_avatar,
        e.title AS event_title,
        e.event_date,
        e.event_time,
        e.location AS event_location,
        (
          SELECT COUNT(*)
          FROM wall_comments wc
          WHERE wc.post_id = wp.id
            AND wc.status = 'active'
        ) AS comment_count,
        COALESCE(
          (
            SELECT json_agg(row_to_json(comment_rows))
            FROM (
              SELECT
                wc.id,
                wc.body,
                wc.created_at,
                wc.user_id,
                cu.name AS author_name,
                cu.avatar AS author_avatar
              FROM wall_comments wc
              JOIN users cu ON cu.id = wc.user_id
              WHERE wc.post_id = wp.id
                AND wc.status = 'active'
              ORDER BY wc.created_at ASC
              LIMIT 3
            ) comment_rows
          ),
          '[]'::json
        ) AS comments
      FROM wall_posts wp
      JOIN users u ON u.id = wp.user_id
      LEFT JOIN events e ON e.id = wp.event_id
      WHERE wp.status = 'active'
        AND (wp.expires_at IS NULL OR wp.expires_at > NOW())
        AND (
          wp.event_id IS NULL
          OR e.id IS NULL
          OR e.event_date > CURRENT_DATE
          OR (e.event_date = CURRENT_DATE AND COALESCE(e.event_time, '23:59:59'::time) > CURRENT_TIME)
        )
      ORDER BY wp.created_at DESC
      LIMIT $1
    `,
    [limit]
  )
}

export async function getWallComposerEvents() {
  await requireCurrentUser()
  return sql.query(
    `
      SELECT id, title, event_date, event_time, location
      FROM events
      WHERE publication_status = 'published'
        AND (
          event_date > CURRENT_DATE
          OR (event_date = CURRENT_DATE AND COALESCE(event_time, '23:59:59'::time) > CURRENT_TIME)
        )
      ORDER BY event_date ASC, event_time ASC
      LIMIT 20
    `,
    []
  )
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- --run tests/community-wall-actions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add actions/community-wall-actions.ts tests/community-wall-actions.test.ts
git commit -m "feat: add community wall post actions"
```

---

### Task 4: Comments, Reports And Author Removal

**Files:**
- Modify: `actions/community-wall-actions.ts`
- Modify: `tests/community-wall-actions.test.ts`

**Interfaces:**
- Consumes helper `scanTextForModeration()`.
- Consumes helper `queueWallModeration()`.
- Produces comment/report/remove behavior used by UI cards.

- [ ] **Step 1: Add failing tests for comments and reports**

Append:

```ts
  it('creates active comments for visible posts', async () => {
    sqlMock.query
      .mockResolvedValueOnce([{ id: 'post-1' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'comment-1', status: 'active' }])

    const { createWallComment } = await import('@/actions/community-wall-actions')

    const result = await createWallComment({ postId: 'post-1', body: 'Bienvenue !' })

    expect(result).toEqual({ success: true, status: 'active', commentId: 'comment-1' })
    expect(sqlMock.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO wall_comments'), expect.arrayContaining(['post-1', 'user-1']))
  })

  it('blocks the twenty-first comment in a rolling hour', async () => {
    sqlMock.query
      .mockResolvedValueOnce([{ id: 'post-1' }])
      .mockResolvedValueOnce([{ count: '20' }])

    const { createWallComment } = await import('@/actions/community-wall-actions')

    await expect(createWallComment({ postId: 'post-1', body: 'Encore.' })).rejects.toThrow('20 commentaires')
  })

  it('hides a post at three distinct reports', async () => {
    sqlMock.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '3' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { reportWallPost } = await import('@/actions/community-wall-actions')

    const result = await reportWallPost({ postId: 'post-1', reason: 'Contenu inadapté' })

    expect(result).toEqual({ success: true, hidden: true })
    expect(sqlMock.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE wall_posts"), ['post-1'])
  })

  it('lets the author remove their own post', async () => {
    sqlMock.query
      .mockResolvedValueOnce([{ user_id: 'user-1' }])
      .mockResolvedValueOnce([])

    const { removeOwnWallPost } = await import('@/actions/community-wall-actions')

    await expect(removeOwnWallPost({ postId: 'post-1' })).resolves.toEqual({ success: true })
    expect(sqlMock.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE wall_posts"), ['post-1'])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- --run tests/community-wall-actions.test.ts
```

Expected: FAIL on comment/report/remove behavior.

- [ ] **Step 3: Implement comment creation**

Replace `createWallComment`:

```ts
export async function createWallComment(input: CreateWallCommentInput) {
  const user = await requireCurrentUser()
  const body = normalizeBody(input.body, 300)

  const [post] = await sql.query<Array<{ id: string }>>(
    `
      SELECT wp.id
      FROM wall_posts wp
      LEFT JOIN events e ON e.id = wp.event_id
      WHERE wp.id = $1
        AND wp.status = 'active'
        AND (wp.expires_at IS NULL OR wp.expires_at > NOW())
        AND (
          wp.event_id IS NULL
          OR e.id IS NULL
          OR e.event_date > CURRENT_DATE
          OR (e.event_date = CURRENT_DATE AND COALESCE(e.event_time, '23:59:59'::time) > CURRENT_TIME)
        )
    `,
    [input.postId]
  )
  if (!post) throw new Error('Annonce indisponible')

  const [{ count }] = await sql.query<Array<{ count: string | number }>>(
    `
      SELECT COUNT(*) as count
      FROM wall_comments
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '1 hour'
        AND status <> 'removed'
    `,
    [user.id]
  )
  if (Number(count || 0) >= 20) throw new Error('Maximum 20 commentaires par heure')

  const moderation = await scanTextForModeration(body)
  const status = moderation ? 'hidden' : 'active'

  const [comment] = await sql.query<Array<{ id: string; status: 'active' | 'hidden' }>>(
    `
      INSERT INTO wall_comments (post_id, user_id, body, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, status
    `,
    [input.postId, user.id, body, status]
  )

  if (moderation) {
    await queueWallModeration({
      sourceType: 'wall_comment',
      sourceId: comment.id,
      userId: user.id,
      severity: moderation.severity,
      reason: 'Mot-clé détecté dans un commentaire du mur',
      matchedKeywords: moderation.matchedKeywords,
      excerpt: body.slice(0, 280),
      metadata: { postId: input.postId, action: moderation.action }
    })
  }

  return { success: true, status: comment.status, commentId: comment.id }
}
```

- [ ] **Step 4: Implement reporting and author removal**

Add helper:

```ts
async function reportWallTarget(input: {
  targetType: 'wall_post' | 'wall_comment'
  targetId: string
  reporterId: string
  reason?: string
}) {
  await sql.query(
    `
      INSERT INTO wall_reports (target_type, target_id, reporter_id, reason)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (target_type, target_id, reporter_id) DO NOTHING
    `,
    [input.targetType, input.targetId, input.reporterId, input.reason || null]
  )

  const [{ count }] = await sql.query<Array<{ count: string | number }>>(
    `
      SELECT COUNT(*) as count
      FROM wall_reports
      WHERE target_type = $1
        AND target_id = $2
    `,
    [input.targetType, input.targetId]
  )

  await queueWallModeration({
    sourceType: input.targetType,
    sourceId: input.targetId,
    userId: input.reporterId,
    severity: Number(count || 0) >= 3 ? 'high' : 'medium',
    reason: input.reason || 'Signalement membre sur le mur',
    metadata: { reportCount: Number(count || 0) }
  })

  if (Number(count || 0) >= 3) {
    await sql.query(
      input.targetType === 'wall_post'
        ? `UPDATE wall_posts SET status = 'hidden', updated_at = CURRENT_TIMESTAMP WHERE id = $1`
        : `UPDATE wall_comments SET status = 'hidden' WHERE id = $1`,
      [input.targetId]
    )
    return { success: true, hidden: true }
  }

  return { success: true, hidden: false }
}
```

Replace report/remove exports:

```ts
export async function reportWallPost(input: { postId: string; reason?: string }) {
  const user = await requireCurrentUser()
  return reportWallTarget({
    targetType: 'wall_post',
    targetId: input.postId,
    reporterId: user.id,
    reason: input.reason
  })
}

export async function reportWallComment(input: { commentId: string; reason?: string }) {
  const user = await requireCurrentUser()
  return reportWallTarget({
    targetType: 'wall_comment',
    targetId: input.commentId,
    reporterId: user.id,
    reason: input.reason
  })
}

export async function removeOwnWallPost(input: { postId: string }) {
  const user = await requireCurrentUser()
  const [post] = await sql.query<Array<{ user_id: string }>>(
    `SELECT user_id FROM wall_posts WHERE id = $1`,
    [input.postId]
  )
  if (!post) throw new Error('Annonce introuvable')
  if (post.user_id !== user.id && user.role !== 'admin') {
    throw new Error('Action limitée à votre propre annonce')
  }
  await sql.query(
    `UPDATE wall_posts SET status = 'removed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [input.postId]
  )
  return { success: true }
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- --run tests/community-wall-actions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add actions/community-wall-actions.ts tests/community-wall-actions.test.ts
git commit -m "feat: add community wall comments and reports"
```

---

### Task 5: Admin Moderation Actions

**Files:**
- Modify: `actions/admin-moderation-actions.ts`
- Modify: `tests/admin-moderation-actions.test.ts`

**Interfaces:**
- Produces `getWallModerationQueue()`.
- Produces `restoreWallModerationItem({ itemId })`.
- Produces `removeWallModerationItem({ itemId })`.

- [ ] **Step 1: Add failing tests**

Append to `tests/admin-moderation-actions.test.ts`:

```ts
  it('loads wall moderation queue for admins', async () => {
    ;(sql.query as any).mockResolvedValueOnce([
      {
        id: 'queue-1',
        source_type: 'wall_post',
        source_id: 'post-1',
        user_id: 'user-1',
        reason: 'Signalement membre',
        excerpt: 'Annonce signalée',
        author_name: 'Alice'
      }
    ])

    const { getWallModerationQueue } = await import('../actions/admin-moderation-actions')
    const items = await getWallModerationQueue()

    expect(items[0].source_type).toBe('wall_post')
    expect(sql.query).toHaveBeenCalledWith(expect.stringContaining("source_type IN ('wall_post', 'wall_comment')"), [])
  })

  it('restores wall moderation items and audits the action', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([{ source_type: 'wall_post', source_id: 'post-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { restoreWallModerationItem } = await import('../actions/admin-moderation-actions')

    await expect(restoreWallModerationItem({ itemId: 'queue-1' })).resolves.toEqual({ success: true })
    expect(sql.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE wall_posts"), ['post-1'])
  })

  it('removes wall moderation items and audits the action', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([{ source_type: 'wall_comment', source_id: 'comment-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { removeWallModerationItem } = await import('../actions/admin-moderation-actions')

    await expect(removeWallModerationItem({ itemId: 'queue-1' })).resolves.toEqual({ success: true })
    expect(sql.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE wall_comments"), ['comment-1'])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- --run tests/admin-moderation-actions.test.ts
```

Expected: FAIL because new exports do not exist.

- [ ] **Step 3: Implement admin actions**

Add to `actions/admin-moderation-actions.ts`:

```ts
export async function getWallModerationQueue() {
  await requireAdmin()
  return sql.query(
    `
      SELECT
        mq.id,
        mq.source_type,
        mq.source_id,
        mq.user_id,
        mq.severity,
        mq.status,
        mq.reason,
        mq.matched_keywords,
        mq.excerpt,
        mq.created_at,
        u.name AS author_name,
        u.avatar AS author_avatar
      FROM moderation_queue mq
      LEFT JOIN users u ON u.id = mq.user_id
      WHERE mq.source_type IN ('wall_post', 'wall_comment')
        AND mq.status IN ('new', 'in_review', 'escalated')
      ORDER BY mq.created_at DESC
      LIMIT 50
    `,
    []
  )
}

async function getWallQueueTarget(itemId: string) {
  const [item] = await sql.query<Array<{ source_type: string; source_id: string }>>(
    `
      SELECT source_type, source_id
      FROM moderation_queue
      WHERE id = $1
        AND source_type IN ('wall_post', 'wall_comment')
    `,
    [itemId]
  )
  if (!item) throw new Error('Élément de modération introuvable')
  return item
}

export async function restoreWallModerationItem(input: { itemId: string }) {
  const admin = await requireAdmin()
  const item = await getWallQueueTarget(input.itemId)

  await sql.query(
    item.source_type === 'wall_post'
      ? `UPDATE wall_posts SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`
      : `UPDATE wall_comments SET status = 'active' WHERE id = $1`,
    [item.source_id]
  )
  await updateModerationQueueStatus({ itemId: input.itemId, status: 'ignored', reason: 'Mur restauré' })
  await sql.query(
    `
      INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, reason)
      VALUES ($1, 'wall_moderation_restore', $2, $3, $4)
    `,
    [admin.id, item.source_type, item.source_id, 'Contenu restauré sur le mur']
  )
  return { success: true }
}

export async function removeWallModerationItem(input: { itemId: string }) {
  const admin = await requireAdmin()
  const item = await getWallQueueTarget(input.itemId)

  await sql.query(
    item.source_type === 'wall_post'
      ? `UPDATE wall_posts SET status = 'removed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`
      : `UPDATE wall_comments SET status = 'removed' WHERE id = $1`,
    [item.source_id]
  )
  await updateModerationQueueStatus({ itemId: input.itemId, status: 'actioned', reason: 'Mur supprimé' })
  await sql.query(
    `
      INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, reason)
      VALUES ($1, 'wall_moderation_remove', $2, $3, $4)
    `,
    [admin.id, item.source_type, item.source_id, 'Contenu supprimé du mur']
  )
  return { success: true }
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- --run tests/admin-moderation-actions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add actions/admin-moderation-actions.ts tests/admin-moderation-actions.test.ts
git commit -m "feat: add community wall moderation actions"
```

---

### Task 6: Member Wall UI On `/discover`

**Files:**
- Create: `components/community-wall.tsx`
- Create: `components/community-wall-composer.tsx`
- Create: `components/community-wall-post-card.tsx`
- Modify: `app/discover/page.tsx`
- Modify: `tests/community-home-ui.test.ts`

**Interfaces:**
- Consumes all exports from `actions/community-wall-actions.ts`.
- Produces `<CommunityWall currentUserId={user.id} />`.

- [ ] **Step 1: Add failing UI placement test**

Modify `tests/community-home-ui.test.ts`:

```ts
  it('places the community wall in the central connected home before online profiles', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

    expect(page).toContain("import { CommunityWall } from '@/components/community-wall'")
    expect(page).toContain('<CommunityWall currentUserId={user.id} />')
    expect(page.indexOf('<CommunityWall currentUserId={user.id} />')).toBeLessThan(page.indexOf("id='online-now'"))
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --run tests/community-home-ui.test.ts
```

Expected: FAIL because the component is not imported or rendered.

- [ ] **Step 3: Create `components/community-wall-composer.tsx`**

Implement:

```tsx
'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { CalendarHeart, UserRound, VenetianMask } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { WallPostType } from '@/actions/community-wall-actions'

type ComposerEvent = {
  id: string
  title: string
  event_date: string
  event_time?: string | null
  location?: string | null
}

export function CommunityWallComposer({
  events,
  onSubmit,
  pending
}: {
  events: ComposerEvent[]
  pending: boolean
  onSubmit: (input: {
    type: WallPostType
    body: string
    eventId?: string | null
    durationHours?: 24 | 48
  }) => Promise<void>
}) {
  const [type, setType] = useState<WallPostType>('profil')
  const [body, setBody] = useState('')
  const [eventId, setEventId] = useState('')
  const [durationHours, setDurationHours] = useState<24 | 48>(24)
  const [error, setError] = useState('')

  const remaining = 500 - body.length
  const canSubmit = body.trim().length > 0 && remaining >= 0 && !pending

  const typeOptions = useMemo(() => [
    { value: 'profil' as const, label: 'Profil', icon: UserRound },
    { value: 'evenement' as const, label: 'Événement', icon: CalendarHeart },
    { value: 'dispo_rideaux_ouverts' as const, label: 'Rideaux ouverts', icon: VenetianMask }
  ], [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    try {
      await onSubmit({
        type,
        body,
        eventId: type === 'evenement' ? eventId || null : null,
        durationHours: type === 'dispo_rideaux_ouverts' ? durationHours : undefined
      })
      setBody('')
      setEventId('')
      setType('profil')
      setDurationHours(24)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Publication impossible pour le moment.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className='rounded-2xl border border-[#ff8cc8]/24 bg-white/[0.055] p-4'>
      <div className='mb-3 flex flex-wrap gap-2'>
        {typeOptions.map(option => {
          const Icon = option.icon
          const active = type === option.value
          return (
            <button
              key={option.value}
              type='button'
              onClick={() => setType(option.value)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${
                active
                  ? 'border-[#ff8cc8] bg-[#ff3b8b]/22 text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
              }`}
            >
              <Icon className='h-4 w-4' />
              {option.label}
            </button>
          )
        })}
      </div>

      <Textarea
        value={body}
        onChange={event => setBody(event.target.value)}
        maxLength={500}
        rows={3}
        placeholder='Partagez une envie, une disponibilité ou une invitation à la communauté...'
        className='min-h-[96px] rounded-2xl border-white/10 bg-black/18 text-white placeholder:text-white/38'
      />

      <div className='mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-white/52'>
        <span>{remaining} caractères restants</span>
        {type === 'dispo_rideaux_ouverts' && (
          <div className='flex rounded-full border border-white/10 bg-black/16 p-1'>
            {[24, 48].map(value => (
              <button
                key={value}
                type='button'
                onClick={() => setDurationHours(value as 24 | 48)}
                className={`rounded-full px-3 py-1 font-bold ${durationHours === value ? 'bg-[#94ffc9] text-[#170321]' : 'text-white/66'}`}
              >
                {value} h
              </button>
            ))}
          </div>
        )}
      </div>

      {type === 'evenement' && (
        <select
          value={eventId}
          onChange={event => setEventId(event.target.value)}
          className='mt-3 w-full rounded-2xl border border-white/10 bg-[#241035] px-3 py-2 text-sm text-white'
        >
          <option value=''>Sans lien événement</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      )}

      {error && <p className='mt-3 text-sm text-red-200'>{error}</p>}

      <div className='mt-4 flex justify-end'>
        <Button type='submit' disabled={!canSubmit} className='bg-[#ff3b8b] hover:bg-[#ff62a8]'>
          {pending ? 'Publication...' : 'Publier'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Create `components/community-wall-post-card.tsx`**

Create `components/community-wall-post-card.tsx`:

```tsx
'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Flag, MessageCircle, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type WallComment = {
  id: string
  body: string
  created_at: string
  user_id: string
  author_name?: string | null
  author_avatar?: string | null
}

type WallPost = {
  id: string
  user_id: string
  type: 'profil' | 'evenement' | 'dispo_rideaux_ouverts'
  body: string
  created_at: string
  expires_at?: string | null
  author_name?: string | null
  author_avatar?: string | null
  event_id?: string | null
  event_title?: string | null
  event_date?: string | null
  event_time?: string | null
  event_location?: string | null
  comment_count?: string | number
  comments?: WallComment[]
}

function relativeDate(value?: string | null) {
  if (!value) return ''
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60_000))
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

function expirationLabel(value?: string | null) {
  if (!value) return null
  const diffMs = new Date(value).getTime() - Date.now()
  if (diffMs <= 0) return 'expire bientôt'
  const hours = Math.max(1, Math.ceil(diffMs / 3_600_000))
  return `expire dans ${hours} h`
}

function initials(name?: string | null) {
  return (name || 'M').slice(0, 1).toUpperCase()
}

function Avatar({ src, name }: { src?: string | null; name?: string | null }) {
  return (
    <div className='relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10'>
      {src ? (
        src.startsWith('http') ? (
          <img src={src} alt={name || 'Membre'} className='h-full w-full object-cover' />
        ) : (
          <Image src={src} alt={name || 'Membre'} fill className='object-cover' sizes='44px' />
        )
      ) : (
        <div className='flex h-full w-full items-center justify-center bg-[#ff3b8b]/20 font-black'>
          {initials(name)}
        </div>
      )}
    </div>
  )
}

export function CommunityWallPostCard({
  post,
  currentUserId,
  onComment,
  onReportPost,
  onReportComment,
  onRemove
}: {
  post: WallPost
  currentUserId: string
  onComment: (postId: string, body: string) => Promise<void>
  onReportPost: (postId: string) => Promise<void>
  onReportComment: (commentId: string) => Promise<void>
  onRemove: (postId: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')

  const badge = useMemo(() => {
    if (post.type === 'dispo_rideaux_ouverts') return { label: 'Rideaux ouverts', className: 'bg-[#94ffc9] text-[#170321]' }
    if (post.type === 'evenement') return { label: 'Événement', className: 'bg-[#ffd166] text-[#210018]' }
    return { label: 'Profil', className: 'bg-[#ff3b8b]/24 text-[#ffb3d7]' }
  }, [post.type])

  async function submitComment(event: FormEvent) {
    event.preventDefault()
    const body = commentBody.trim()
    if (!body || body.length > 300 || pending) return
    setPending(true)
    setStatus('')
    try {
      await onComment(post.id, body)
      setCommentBody('')
      setExpanded(true)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Commentaire impossible.')
    } finally {
      setPending(false)
    }
  }

  return (
    <article className='rounded-2xl border border-white/10 bg-black/18 p-4'>
      <div className='flex gap-3'>
        <Link href={`/profile/${post.user_id}`}>
          <Avatar src={post.author_avatar} name={post.author_name} />
        </Link>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <Link href={`/profile/${post.user_id}`} className='font-black hover:underline'>
                {post.author_name || 'Membre'}
              </Link>
              <div className='text-xs text-white/48'>{relativeDate(post.created_at)}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className='mt-3 whitespace-pre-wrap text-sm leading-6 text-white/78'>{post.body}</p>
          {post.type === 'dispo_rideaux_ouverts' && (
            <p className='mt-2 text-xs font-bold text-[#94ffc9]'>{expirationLabel(post.expires_at)}</p>
          )}
          {post.event_id && post.event_title && (
            <Link href={`/events/${post.event_id}`} className='mt-3 block rounded-2xl border border-[#ffd166]/24 bg-[#ffd166]/10 p-3 text-sm hover:bg-[#ffd166]/16'>
              <div className='font-black text-[#ffe2a3]'>{post.event_title}</div>
              <div className='mt-1 text-white/58'>{post.event_location || 'Love Hotel'}</div>
            </Link>
          )}
        </div>
      </div>

      <div className='mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3'>
        <Button type='button' size='sm' variant='outline' className='border-white/12 bg-white/[0.04]' onClick={() => setExpanded(value => !value)}>
          <MessageCircle className='mr-2 h-4 w-4' />
          {Number(post.comment_count || 0)} commentaire(s)
        </Button>
        <Button type='button' size='sm' variant='outline' className='border-white/12 bg-white/[0.04]' onClick={() => onReportPost(post.id)}>
          <Flag className='mr-2 h-4 w-4' />
          Signaler
        </Button>
        {post.user_id === currentUserId && (
          <Button type='button' size='sm' variant='outline' className='border-red-400/25 bg-red-500/10 text-red-100' onClick={() => onRemove(post.id)}>
            <Trash2 className='mr-2 h-4 w-4' />
            Supprimer
          </Button>
        )}
      </div>

      {expanded && (
        <div className='mt-4 space-y-3'>
          {(post.comments || []).map(comment => (
            <div key={comment.id} className='rounded-2xl border border-white/8 bg-white/[0.035] p-3'>
              <div className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 gap-2'>
                  <Avatar src={comment.author_avatar} name={comment.author_name} />
                  <div className='min-w-0'>
                    <Link href={`/profile/${comment.user_id}`} className='text-sm font-bold hover:underline'>
                      {comment.author_name || 'Membre'}
                    </Link>
                    <p className='mt-1 text-sm leading-5 text-white/70'>{comment.body}</p>
                  </div>
                </div>
                <button type='button' onClick={() => onReportComment(comment.id)} className='text-xs text-white/42 hover:text-[#ff8cc8]'>
                  Signaler
                </button>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className='space-y-2'>
            <Textarea
              value={commentBody}
              onChange={event => setCommentBody(event.target.value)}
              maxLength={300}
              rows={2}
              placeholder='Ajouter un commentaire...'
              className='rounded-2xl border-white/10 bg-black/18 text-white placeholder:text-white/38'
            />
            {status && <p className='text-sm text-red-200'>{status}</p>}
            <div className='flex items-center justify-between gap-3 text-xs text-white/48'>
              <span>{300 - commentBody.length} caractères restants</span>
              <Button type='submit' size='sm' disabled={!commentBody.trim() || pending}>
                <Send className='mr-2 h-4 w-4' />
                {pending ? 'Envoi...' : 'Commenter'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 5: Create `components/community-wall.tsx`**

Implement:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createWallComment,
  createWallPost,
  getCommunityWallFeed,
  getWallComposerEvents,
  removeOwnWallPost,
  reportWallComment,
  reportWallPost
} from '@/actions/community-wall-actions'
import { CommunityWallComposer } from '@/components/community-wall-composer'
import { CommunityWallPostCard } from '@/components/community-wall-post-card'

export function CommunityWall({ currentUserId }: { currentUserId: string }) {
  const [posts, setPosts] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [feed, composerEvents] = await Promise.all([
        getCommunityWallFeed({ limit: 20 }),
        getWallComposerEvents()
      ])
      setPosts(feed || [])
      setEvents(composerEvents || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function publish(input: Parameters<typeof createWallPost>[0]) {
    setPending(true)
    try {
      const result = await createWallPost(input)
      setStatus(result.status === 'hidden'
        ? 'Annonce envoyée en modération.'
        : 'Annonce publiée.')
      await refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <section id='community-wall' className='scroll-mt-24 space-y-4'>
      <div>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>Mur de la communauté</p>
        <h2 className='mt-1 text-xl font-black'>Les annonces des membres</h2>
        <p className='mt-1 text-sm text-white/56'>Profils, événements et disponibilités Rideaux ouverts.</p>
      </div>
      <CommunityWallComposer events={events} pending={pending} onSubmit={publish} />
      {status && <p className='rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/74'>{status}</p>}
      {loading ? (
        <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/56'>Chargement du mur...</div>
      ) : posts.length === 0 ? (
        <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-5'>
          <h3 className='font-black'>Le mur est encore calme.</h3>
          <p className='mt-2 text-sm text-white/58'>Soyez le premier à publier une annonce.</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {posts.map(post => (
            <CommunityWallPostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onComment={async (postId, body) => {
                await createWallComment({ postId, body })
                await refresh()
              }}
              onReportPost={async postId => {
                await reportWallPost({ postId, reason: 'Signalement membre' })
                setStatus('Signalement transmis à la modération.')
              }}
              onReportComment={async commentId => {
                await reportWallComment({ commentId, reason: 'Signalement membre' })
                setStatus('Signalement transmis à la modération.')
              }}
              onRemove={async postId => {
                await removeOwnWallPost({ postId })
                await refresh()
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 6: Modify `/discover`**

Add import:

```ts
import { CommunityWall } from '@/components/community-wall'
```

Render inside the central `<section className='order-3...'>`, after error state and before `<section id='online-now' ...>`:

```tsx
<CommunityWall currentUserId={user.id} />
```

- [ ] **Step 7: Run UI tests**

Run:

```bash
npm test -- --run tests/community-home-ui.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/community-wall.tsx components/community-wall-composer.tsx components/community-wall-post-card.tsx app/discover/page.tsx tests/community-home-ui.test.ts
git commit -m "feat: add community wall to member home"
```

---

### Task 7: Public Landing Teaser

**Files:**
- Modify: `app/landing-page.tsx`
- Create: `tests/community-wall-public-teaser.test.ts`

**Interfaces:**
- Produces static teaser only.
- Must not import `actions/community-wall-actions`.

- [ ] **Step 1: Write failing public teaser test**

Create `tests/community-wall-public-teaser.test.ts`:

```ts
import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community wall public teaser', () => {
  const landing = readFileSync('app/landing-page.tsx', 'utf8')

  it('shows an anonymized community wall teaser on the public landing page', () => {
    expect(landing).toContain('Le mur de la communauté')
    expect(landing).toContain('rejoignez-nous')
    expect(landing).toContain('/register')
    expect(landing).toContain('blur')
  })

  it('does not load real wall data on the public landing page', () => {
    expect(landing).not.toContain('community-wall-actions')
    expect(landing).not.toContain('getCommunityWallFeed')
    expect(landing).not.toContain('wall_posts')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --run tests/community-wall-public-teaser.test.ts
```

Expected: FAIL because teaser copy is absent.

- [ ] **Step 3: Add static teaser section**

Insert in `app/landing-page.tsx` before the CTA section:

```tsx
<section className='py-10 md:py-14 relative overflow-hidden'>
  <div className='container px-4 relative z-10'>
    <div className='rounded-3xl border border-[#ff8cc8]/20 bg-white/[0.045] p-6 md:p-8'>
      <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
        Le mur de la communauté
      </p>
      <h2 className='mt-2 text-2xl md:text-4xl font-black text-white'>
        Chaque jour, les membres annoncent leurs envies.
      </h2>
      <p className='mt-3 max-w-2xl text-sm md:text-base text-white/70'>
        Profils mis en avant, événements et disponibilités Rideaux ouverts : rejoignez-nous pour découvrir le mur réel.
      </p>
      <div className='mt-6 grid gap-3 md:grid-cols-3 blur-[1.5px] opacity-70'>
        {['Profil membre', 'Événement privé', 'Rideaux ouverts'].map(label => (
          <div key={label} className='rounded-2xl border border-white/10 bg-black/22 p-4'>
            <div className='mb-3 h-9 w-9 rounded-full bg-white/18' />
            <div className='mb-2 h-3 w-2/3 rounded-full bg-white/24' />
            <div className='h-3 w-full rounded-full bg-white/14' />
            <div className='mt-2 h-3 w-4/5 rounded-full bg-white/14' />
            <div className='mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#ffb3d7]'>
              {label}
            </div>
          </div>
        ))}
      </div>
      <Button asChild className='mt-6 bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'>
        <Link href='/register'>Le mur est privé : rejoignez-nous</Link>
      </Button>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Run test**

Run:

```bash
npm test -- --run tests/community-wall-public-teaser.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/landing-page.tsx tests/community-wall-public-teaser.test.ts
git commit -m "feat: add public community wall teaser"
```

---

### Task 8: Admin Moderation UI

**Files:**
- Modify: `app/admin/moderation/page.tsx`
- Modify: `tests/admin-ui-entrypoints.test.ts`

**Interfaces:**
- Consumes `getWallModerationQueue`, `restoreWallModerationItem`, `removeWallModerationItem`.

- [ ] **Step 1: Add failing admin UI test**

Modify `tests/admin-ui-entrypoints.test.ts`:

```ts
  it('exposes wall moderation controls from the admin moderation page', () => {
    const page = readFileSync('app/admin/moderation/page.tsx', 'utf8')

    expect(page).toContain('getWallModerationQueue')
    expect(page).toContain('restoreWallModerationItem')
    expect(page).toContain('removeWallModerationItem')
    expect(page).toContain('Mur')
    expect(page).toContain('Restaurer')
    expect(page).toContain('Supprimer')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --run tests/admin-ui-entrypoints.test.ts
```

Expected: FAIL because wall moderation controls are absent.

- [ ] **Step 3: Add wall state and actions to page**

Modify imports in `app/admin/moderation/page.tsx`:

```ts
import {
  createModerationKeyword,
  getModerationDashboard,
  getWallModerationQueue,
  removeWallModerationItem,
  restoreWallModerationItem,
  scanRecentMessagesForModeration,
  type AdminModerationDashboard,
  type ModerationSeverity
} from '@/actions/admin-moderation-actions'
```

Add state:

```ts
const [wallItems, setWallItems] = useState<any[]>([])
```

In `loadDashboard`, also load wall items:

```ts
const [dashboardData, wallData] = await Promise.all([
  getModerationDashboard(),
  getWallModerationQueue()
])
setDashboard(dashboardData)
setWallItems(wallData || [])
```

Add handlers:

```ts
async function handleRestoreWallItem(itemId: string) {
  await restoreWallModerationItem({ itemId })
  setStatus('Contenu du mur restauré.')
  await loadDashboard()
}

async function handleRemoveWallItem(itemId: string) {
  await removeWallModerationItem({ itemId })
  setStatus('Contenu du mur supprimé.')
  await loadDashboard()
}
```

Add a card below recent queue:

```tsx
<Card className='mt-6'>
  <CardHeader>
    <CardTitle>Mur</CardTitle>
  </CardHeader>
  <CardContent>
    <div className='space-y-3'>
      {wallItems.length === 0 && (
        <p className='text-sm text-muted-foreground'>Aucun signalement du mur en attente.</p>
      )}
      {wallItems.map(item => (
        <div key={item.id} className='rounded-lg border border-white/10 bg-white/5 p-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <div className='font-semibold'>
                {item.source_type === 'wall_post' ? 'Annonce' : 'Commentaire'} · {item.reason}
              </div>
              {item.user_id && (
                <Link href={`/profile/${item.user_id}`} className='text-xs text-[#ff8cc8] hover:underline'>
                  Voir le profil auteur
                </Link>
              )}
            </div>
            <span className='rounded-full bg-[#ff3b8b]/20 px-2 py-1 text-xs text-[#ffb3d7]'>
              {item.severity}
            </span>
          </div>
          {item.excerpt && <p className='mt-2 text-sm text-muted-foreground'>{item.excerpt}</p>}
          <div className='mt-3 flex flex-wrap gap-2'>
            <Button size='sm' variant='outline' onClick={() => handleRestoreWallItem(item.id)}>
              Restaurer
            </Button>
            <Button size='sm' className='bg-red-600 text-white hover:bg-red-500' onClick={() => handleRemoveWallItem(item.id)}>
              Supprimer
            </Button>
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 4: Run admin UI test**

Run:

```bash
npm test -- --run tests/admin-ui-entrypoints.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/admin/moderation/page.tsx tests/admin-ui-entrypoints.test.ts
git commit -m "feat: add wall moderation admin UI"
```

---

### Task 9: Security And Regression Verification

**Files:**
- Modify: `tests/server-action-guards.test.ts`
- Modify: `tests/route-access.test.ts` only if a route policy change becomes necessary.

**Interfaces:**
- Confirms no anonymous wall behavior.
- Confirms public route policy remains unchanged.

- [ ] **Step 1: Add server-action guard test**

Modify `tests/server-action-guards.test.ts` to include:

```ts
  it('keeps community wall member actions protected by requireCurrentUser', () => {
    const source = readFileSync('actions/community-wall-actions.ts', 'utf8')

    expect(source).toContain('requireCurrentUser')
    expect(source).toContain('export async function getCommunityWallFeed')
    expect(source).toContain('export async function createWallPost')
    expect(source).toContain('export async function createWallComment')
    expect(source).toContain('export async function reportWallPost')
    expect(source).toContain('export async function reportWallComment')
  })
```

- [ ] **Step 2: Run targeted tests**

Run:

```bash
npm test -- --run tests/server-action-guards.test.ts tests/route-access.test.ts tests/community-wall-actions.test.ts tests/admin-moderation-actions.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run lint
npm test -- --run
npm run build
npm audit --audit-level=high
```

Expected:

- `npm run lint`: exit 0.
- `npm test -- --run`: all tests pass.
- `npm run build`: exit 0.
- `npm audit --audit-level=high`: exit 0; low/moderate may remain.

- [ ] **Step 4: Final commit if verification changes were made**

```bash
git add tests/server-action-guards.test.ts tests/route-access.test.ts
git commit -m "test: verify community wall access controls"
```

Skip this commit if no files changed in this task.

---

### Task 10: Push And PR

**Files:**
- No code changes.

**Interfaces:**
- Produces branch push and PR to `main`.

- [ ] **Step 1: Inspect final state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -8
```

Expected: clean tree on `codex/lhr-community-wall`.

- [ ] **Step 2: Push branch after explicit GO**

Run only after GO for push:

```bash
git push -u origin codex/lhr-community-wall
```

Expected: branch pushed.

- [ ] **Step 3: Create draft PR**

Run only after branch push:

```bash
gh pr create \
  --base main \
  --head codex/lhr-community-wall \
  --draft \
  --title "feat: add member community wall" \
  --body "Adds the member-only community wall with text posts, comments, moderation, reporting, anti-spam, admin arbitration, and public anonymized teaser. Includes migration and Vitest coverage."
```

Expected: draft PR URL.

- [ ] **Step 4: Validate preview**

After Vercel preview is READY, smoke:

- `/` shows anonymized teaser only.
- `/discover` requires login.
- Authenticated `/discover` shows wall composer and feed.
- Create profile post.
- Create `Rideaux ouverts` post for 24 h.
- Create event post with and without linked event.
- Comment on a post.
- Report reaches admin moderation flow.
- Admin can restore/remove wall item.

Expected: preview ready for Gilles wording and UX validation.
