# Community Home Reframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recenter the connected community home on recent members, the community wall, and collective events while keeping live presence at the bottom and accurately labeling counts.

**Architecture:** Keep the existing authenticated client page and server actions. Expose the existing user creation timestamp in discovery data, sort the recent-member slice explicitly by that timestamp, and keep one canonical online-members section in the primary content column after the community activity blocks. Preserve the existing wall moderation and image validation boundaries.

**Tech Stack:** Next.js App Router, React 19, TypeScript, PostgreSQL server actions, Vitest, ESLint.

## Global Constraints

- Delivery is direct to the currently deployed `main` branch; no pull request.
- Production remains the VPS2 Docker pod and must be verified after deployment.
- The community wall stays members-only and keeps server-side session and moderation guards.
- `#3C3C3C`, `#333333`, and equivalent muddy grey surfaces must not be introduced.
- The uncommitted `codex/lhr-events-fluidity` worktree is out of scope and must not be merged.

---

### Task 1: Lock the real recent-member contract in tests

**Files:**
- Modify: `/Users/admin/Documents/LHR-community-wall/tests/community-home-ui.test.ts`
- Modify: `/Users/admin/Documents/LHR-community-wall/tests/server-action-guards.test.ts`
- Test: the same files

**Interfaces:**
- Consumes: the current `getCommunityMemberStats` contract and `app/discover/page.tsx` source.
- Produces: assertions that the page distinguishes the eight displayed profiles from the total and that discovery data exposes `created_at` for ordering.

- [ ] **Step 1: Add failing source assertions**

Add these assertions to the community home test:

```ts
expect(page).toContain('created_at?: string')
expect(page).toContain('[...filteredProfiles].sort')
expect(page).toContain('derniers profils visibles')
expect(page.indexOf("id='new-profiles'")).toBeLessThan(page.indexOf("id='community-wall'"))
expect(page.indexOf("id='community-wall'")).toBeLessThan(page.indexOf("id='online-now'"))
```

Add a server-action assertion that the discovery SQL selects `u.created_at`.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
npm test -- --run tests/community-home-ui.test.ts tests/server-action-guards.test.ts
```

Expected: FAIL because discovery does not yet expose `created_at` and the recent slice is not explicitly sorted.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/community-home-ui.test.ts tests/server-action-guards.test.ts
git commit -m "test: define community recent member ordering"
```

### Task 2: Expose creation time for discovery profiles

**Files:**
- Modify: `/Users/admin/Documents/LHR-community-wall/actions/user-actions.ts:364-402`
- Modify: `/Users/admin/Documents/LHR-community-wall/app/discover/page.tsx:25-40`
- Test: `/Users/admin/Documents/LHR-community-wall/tests/server-action-guards.test.ts`

**Interfaces:**
- Consumes: the existing `getDiscoverProfiles(currentUserId, page, pageSize, filters)` action.
- Produces: each returned discovery profile has `created_at: string | Date | null` without changing existing matching or filter behavior.

- [ ] **Step 1: Add `created_at` to the discovery result type and SQL projection**

In `DiscoverProfile`, add:

```ts
created_at?: string | Date | null
```

In the profile `SELECT`, add:

```sql
u.created_at,
```

Do not change the existing matching sort for the general discovery list.

- [ ] **Step 2: Run the focused tests and verify they pass**

Run:

```bash
npm test -- --run tests/community-home-ui.test.ts tests/server-action-guards.test.ts
```

Expected: the server-action query assertions pass; the page ordering assertion remains failing until Task 3.

- [ ] **Step 3: Commit the data contract**

```bash
git add actions/user-actions.ts app/discover/page.tsx tests/server-action-guards.test.ts
git commit -m "feat: expose discovery profile creation dates"
```

### Task 3: Make the community home order truthful and remove duplicate presence

**Files:**
- Modify: `/Users/admin/Documents/LHR-community-wall/app/discover/page.tsx:162-176`
- Modify: `/Users/admin/Documents/LHR-community-wall/app/discover/page.tsx:311-484`
- Modify: `/Users/admin/Documents/LHR-community-wall/app/discover/page.tsx:594-621`
- Test: `/Users/admin/Documents/LHR-community-wall/tests/community-home-ui.test.ts`
- Test: `/Users/admin/Documents/LHR-community-wall/tests/community-wall-ui.test.ts`

**Interfaces:**
- Consumes: `profiles`, `events`, `matches`, `memberStats`, and `CommunityWall`.
- Produces: one ordered primary flow: new members, wall, events and community experiences, profiles/matches, then one online-members section at the bottom.

- [ ] **Step 1: Sort the recent slice by creation date**

Replace:

```ts
const newProfiles = filteredProfiles.slice(0, 8)
```

with:

```ts
const newProfiles = [...filteredProfiles]
  .sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0
    return rightTime - leftTime
  })
  .slice(0, 8)
```

Keep the copy honest: `Les X derniers profils visibles sur Y adhérents.` The separate `+Z en 24 h` stat remains the actual 24-hour registration count.

- [ ] **Step 2: Move the online section after the community activity content**

Place the primary `section id='online-now'` after the upcoming-events and community-experience blocks. Keep its existing real-presence data and empty state.

Remove the duplicate right-sidebar block titled `En ligne dans la communauté`. Do not remove the right-sidebar experience cards, premium teaser, compatible suggestions, or match summary.

- [ ] **Step 3: Update ordering tests**

Assert these source-order relationships:

```ts
expect(page.indexOf("id='new-profiles'")).toBeLessThan(page.indexOf("id='community-wall'"))
expect(page.indexOf("id='community-wall'")).toBeLessThan(page.indexOf("Événements à venir"))
expect(page.indexOf("Événements à venir")).toBeLessThan(page.indexOf("id='online-now'"))
expect(page.match(/En ligne dans la communauté/g) || []).toHaveLength(0)
```

- [ ] **Step 4: Run focused UI tests**

Run:

```bash
npm test -- --run tests/community-home-ui.test.ts tests/community-wall-ui.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the home reframe**

```bash
git add app/discover/page.tsx tests/community-home-ui.test.ts tests/community-wall-ui.test.ts
git commit -m "feat: recenter community home activity"
```

### Task 4: Run the complete validation suite

**Files:**
- Read: `/Users/admin/Documents/LHR-community-wall/package.json`
- Read: `/Users/admin/Documents/LHR-community-wall/tests/`

**Interfaces:**
- Consumes: all commits from Tasks 1-3.
- Produces: verified source ready for direct push.

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: exit code 0.

- [ ] **Step 2: Run all Vitest tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 4: Confirm the worktree and branch**

```bash
git status --short --branch
git log -4 --oneline --decorate
```

Expected: branch is `main`, only intentional commits are present, and no event-fluidity files are staged.

### Task 5: Push `main` and deploy VPS2

**Files:**
- No source changes.

**Interfaces:**
- Consumes: the validated local `main` branch.
- Produces: the recentered community home live at `https://rencontrelovehotel.com`.

- [ ] **Step 1: Push the production branch directly**

```bash
git push origin main
```

Expected: `origin/main` advances to the validated commit.

- [ ] **Step 2: Synchronize the production pod without secrets**

Use the established VPS2 deployment flow with exclusions for `.git`, `node_modules`, `.next`, environment files, secrets, Docker Compose configuration, and local artifact folders. Do not overwrite the remote `app.env`, `.env`, or `docker-compose.yml`.

- [ ] **Step 3: Rebuild and wait for a healthy container**

Run the existing VPS2 compose rebuild for `pod-lhr-app`, then poll its health status until it is `healthy`. If it fails, inspect the container logs before claiming completion.

- [ ] **Step 4: Verify production**

Check all of the following:

```bash
curl -fsSL https://rencontrelovehotel.com/version.json
curl -I -L https://rencontrelovehotel.com/discover
```

Expected: the version timestamp reflects the deployment, the app container is healthy, and `/discover` remains protected for unauthenticated requests.
