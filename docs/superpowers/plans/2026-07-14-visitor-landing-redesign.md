# Visitor Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer `/` en landing page visiteur sans sidebar, centrée sur les hôtels Pigalle et Châtelet et les événements créés par la communauté.

**Architecture:** `SiteShell` conserve la sidebar pour les pages applicatives mais rend une branche dédiée sur `/`, composée d’un header visiteur, du contenu de landing et du footer global. La landing est réécrite autour de sections éditoriales autonomes et de visuels existants, sans modifier les fonctions métier.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Next Image, Lucide React, Vitest.

## Global Constraints

- La route `/` ne doit jamais afficher la sidebar.
- Le logo officiel doit rester entièrement visible avec `object-contain`.
- La landing ne doit plus mentionner de restaurant, de bar ou LOOLYYB.
- Les lieux présentés sont Love Hôtel Pigalle et Love Hôtel Châtelet.
- Les expériences centrales sont les événements communautaires, les apéros jacuzzi et Rideaux Ouverts.
- Les pages applicatives et l’administration conservent leurs architectures actuelles.

---

### Task 1: Landing shell visiteur

**Files:**
- Create: `components/visitor-landing-header.tsx`
- Modify: `components/site-shell.tsx`
- Test: `tests/visitor-landing-redesign.test.ts`

**Interfaces:**
- Produces: `VisitorLandingHeader({ isAuthenticated }: { isAuthenticated: boolean })`
- Consumes: `BrandLogo`, `Footer`, `usePathname`, `useAuth`

- [ ] **Step 1: Write the failing shell test**

```ts
it('renders the home route with a visitor header and without the application sidebar', () => {
  const shell = readFileSync('components/site-shell.tsx', 'utf8')
  const header = readFileSync('components/visitor-landing-header.tsx', 'utf8')

  expect(shell).toContain("pathname === '/'")
  expect(shell).toContain('<VisitorLandingHeader')
  expect(header).toContain("href='#hotels'")
  expect(header).toContain("href='#experiences'")
  expect(header).toContain("href='#communaute'")
  expect(header).toContain("href='/login'")
  expect(header).toContain("href='/register'")
})
```

- [ ] **Step 2: Run the test and verify the red state**

Run: `npm test -- --run tests/visitor-landing-redesign.test.ts`

Expected: FAIL because `components/visitor-landing-header.tsx` does not exist and `/` has no dedicated branch.

- [ ] **Step 3: Implement the visitor header and root branch**

Create a sticky full-width header with the compact official logo, desktop anchor navigation, Connexion/Inscription actions and a compact mobile action area. In `SiteShell`, return the following shape before the sidebar branch:

```tsx
if (pathname === '/') {
  return (
    <div className='visitor-landing-shell min-h-screen overflow-x-hidden bg-[#120821] text-white'>
      <VisitorLandingHeader isAuthenticated={Boolean(user)} />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- --run tests/visitor-landing-redesign.test.ts tests/unified-site-shell.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/visitor-landing-header.tsx components/site-shell.tsx tests/visitor-landing-redesign.test.ts tests/unified-site-shell.test.ts
git commit -m "feat: separate visitor landing navigation"
```

### Task 2: Recentrage éditorial de la landing page

**Files:**
- Modify: `app/landing-page.tsx`
- Test: `tests/visitor-landing-redesign.test.ts`

**Interfaces:**
- Consumes: anchor IDs `concept`, `hotels`, `experiences`, `communaute`
- Produces: visitor-facing sections and calls to `/register`, `/login`, `/events`, and `/events/new`

- [ ] **Step 1: Write failing content tests**

```ts
it('presents the two hotels and community-created experiences', () => {
  const landing = readFileSync('app/landing-page.tsx', 'utf8')

  expect(landing).toContain("id='hotels'")
  expect(landing).toContain('Love Hôtel Pigalle')
  expect(landing).toContain('Love Hôtel Châtelet')
  expect(landing).toContain('Créez vos propres événements')
  expect(landing).toContain('Apéros jacuzzi')
  expect(landing).toContain('RIDEAUX OUVERTS')
  expect(landing).toContain('/apero-jacuzzi-rencontre.jpg')
  expect(landing).toContain('/rideaux-ouverts-rencontre.jpg')
  expect(landing).not.toContain('restaurant')
  expect(landing).not.toContain('LOOLYYB')
})
```

- [ ] **Step 2: Run the test and verify the red state**

Run: `npm test -- --run tests/visitor-landing-redesign.test.ts`

Expected: FAIL on hotel/community copy and forbidden legacy offers.

- [ ] **Step 3: Rewrite the landing page**

Implement, in order:

1. Hero with the value proposition and four visual cards: Apéro jacuzzi, Sophia, Événements communautaires, Rideaux Ouverts.
2. `id='hotels'`: Pigalle and Châtelet location cards.
3. `id='experiences'`: jacuzzi, community events, Rideaux Ouverts.
4. `id='communaute'`: event creation and interaction flow.
5. `id='concept'`: concise benefits and final registration CTA.

Delete the legacy crypto, advertisement and hidden footer blocks. Do not include restaurant/bar wording.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run tests/visitor-landing-redesign.test.ts tests/unified-site-shell.test.ts tests/community-home-ui.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/landing-page.tsx tests/visitor-landing-redesign.test.ts
git commit -m "feat: refocus landing on hotels and community"
```

### Task 3: Quality and responsive verification

**Files:**
- Modify only if verification reveals a regression: `components/visitor-landing-header.tsx`, `components/site-shell.tsx`, `app/landing-page.tsx`

- [ ] **Step 1: Run the complete automated verification**

Run: `npm test -- --run && npm run lint && npm run build`

Expected: 0 failed tests, TypeScript exit 0, Next.js build exit 0.

- [ ] **Step 2: Verify desktop rendering**

Check `/` at 1280 px: no sidebar, header visible, logo complete, four hero cards, no horizontal overflow, one footer.

- [ ] **Step 3: Verify mobile rendering**

Check `/` at 390 × 844: compact header, readable hero, two primary actions, stacked sections and no horizontal overflow.

- [ ] **Step 4: Verify application isolation**

Check `/login`, `/love-rooms` and `/events`: application shell behavior remains unchanged; `/admin` remains outside the public shell.

### Task 4: Production deployment and observation

**Files:** none.

- [ ] **Step 1: Confirm production targets**

Confirm VPS2 `pod-lhr`, Vercel project `love-hotel-rencontre`, production environment and account `gilleskorzec` under `gilles-korzec-projects`.

- [ ] **Step 2: Back up production**

Create a PostgreSQL dump and tag the current Docker image before replacement.

- [ ] **Step 3: Deploy VPS2**

Build the committed Git archive as `pod-lhr-app:latest`, recreate only the app container and wait for healthy status.

- [ ] **Step 4: Deploy Vercel production**

Run `vercel deploy --prod --yes --scope gilles-korzec-projects` and require `readyState: READY`.

- [ ] **Step 5: Verify public production**

Verify `/`, `/login`, and `/love-rooms`, then visually inspect desktop and mobile at `https://rencontrelovehotel.com`.

- [ ] **Step 6: Diagnose post-deploy logs**

Require container health `healthy`, restart count `0`, Nginx post-deploy 5xx `0`, PostgreSQL severe errors `0`, and no new application error other than documented stale Server Action calls from pre-deployment tabs.
