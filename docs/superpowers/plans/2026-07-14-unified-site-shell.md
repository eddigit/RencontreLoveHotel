# Unified Site Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à toutes les pages hors administration la même architecture avec logo officiel entier, sidebar desktop, navigation mobile et zone de contenu commune.

**Architecture:** `SiteShell` est monté une seule fois dans le layout racine et choisit une navigation visiteur ou membre avec `useAuth()`. Les anciens composants de layout deviennent des cadres de contenu sans navigation, puis les headers et barres mobiles locales sont retirés pour éliminer les doublons.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Next Image, Lucide React, Vitest.

## Global Constraints

- Toutes les routes hors `/admin` utilisent la coque globale.
- Les routes `/admin` conservent leur architecture actuelle.
- Le logo de navigation utilise `/lhr-official-logo.png`, son ratio naturel et `object-contain`.
- La navigation membre contient Découvrir, Messages, Matchs, Événements, Conciergerie et Profil.
- La navigation visiteur contient Accueil, Concept, Rencontres, Événements, Love Rooms et Premium.
- Une seule sidebar ou navigation mobile peut être rendue par page.
- Aucune logique métier de page ni nouvelle dépendance n’est introduite.
- Le résultat doit être déployé sur VPS2 et Vercel puis vérifié sur `https://rencontrelovehotel.com`.

---

### Task 1: Coque globale et logo officiel

**Files:**
- Create: `components/brand-logo.tsx`
- Create: `components/site-shell.tsx`
- Create: `tests/unified-site-shell.test.ts`

**Interfaces:**
- Consumes: `useAuth()`, `usePathname()`, `NotificationsButton`, `Footer`, `/lhr-official-logo.png`.
- Produces: `BrandLogo({ compact?, priority? })` et `SiteShell({ children })`.

- [ ] **Step 1: Write the failing shell contract test**

Créer `tests/unified-site-shell.test.ts` et vérifier :

```ts
expect(shell).toContain("pathname.startsWith('/admin')")
expect(shell).toContain("label: 'Découvrir'")
expect(shell).toContain("label: 'Événements'")
expect(shell).toContain("label: 'Love Rooms'")
expect(shell).toContain('<BrandLogo')
expect(logo).toContain("src='/lhr-official-logo.png'")
expect(logo).toContain('object-contain')
expect(logo).not.toContain('object-cover')
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run tests/unified-site-shell.test.ts`

Expected: FAIL because the two components do not exist.

- [ ] **Step 3: Implement BrandLogo and SiteShell**

`BrandLogo` conserve le ratio `1162/1354`. `SiteShell` rend directement `children` pour `/admin`, sinon une grille `lg:grid-cols-[220px_minmax(0,1fr)]`, une sidebar desktop, une barre mobile et un tiroir. Les liens sont choisis avec `user ? memberNavItems : visitorNavItems` et le lien actif porte `aria-current='page'`.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- --run tests/unified-site-shell.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the global shell**

```bash
git add components/brand-logo.tsx components/site-shell.tsx tests/unified-site-shell.test.ts
git commit -m "feat: add unified public site shell"
```

### Task 2: Brancher le layout racine et neutraliser les layouts concurrents

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/layout/main-layout.tsx`
- Modify: `components/lhr-v2-shell.tsx`
- Modify: `tests/unified-site-shell.test.ts`

**Interfaces:**
- Consumes: `SiteShell` de Task 1.
- Produces: un seul point de navigation globale et des wrappers historiques limités au contenu.

- [ ] **Step 1: Add failing integration assertions**

```ts
expect(rootLayout).toContain('<SiteShell>')
expect(mainLayout).toContain("pathname.startsWith('/admin')")
expect(mainLayout).not.toContain('<Header session={session} user={user} />\n      <main>{children}</main>')
expect(v2Shell).not.toContain("<aside className='hidden")
expect(v2Shell).not.toContain("src='/lhr-official-logo.png'")
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run tests/unified-site-shell.test.ts`

Expected: FAIL because the root layout does not mount `SiteShell` and the old sidebar remains.

- [ ] **Step 3: Integrate and simplify layouts**

Encapsuler `{children}` avec `<SiteShell>` dans `app/layout.tsx`. Dans `MainLayout`, conserver `Header` et `Footer` uniquement lorsque `pathname.startsWith('/admin')`, sinon retourner les enfants. Dans `LhrV2Shell`, conserver le titre, le sous-titre, l’action et le contenu, sans grille ni sidebar.

- [ ] **Step 4: Run the test and TypeScript**

Run: `npm test -- --run tests/unified-site-shell.test.ts && npm run lint`

Expected: PASS et aucune erreur TypeScript.

- [ ] **Step 5: Commit layout integration**

```bash
git add app/layout.tsx components/layout/main-layout.tsx components/lhr-v2-shell.tsx tests/unified-site-shell.test.ts
git commit -m "refactor: centralize public page architecture"
```

### Task 3: Retirer les navigations locales dupliquées

**Files:**
- Modify: `app/landing-page.tsx`
- Modify: `app/en-direct/page.tsx`
- Modify: `app/loolyyb-memecoin/page.tsx`
- Modify: `app/loolyyb/page.tsx`
- Modify: `app/loolyyb/whitepaper/page.tsx`
- Modify: `app/premium/page.tsx`
- Modify: `app/rencontres/page.tsx`
- Modify: `app/conciergerie/page.tsx`
- Modify: `app/discover/page.tsx`
- Modify: `app/events/page.tsx`
- Modify: `app/love-rooms/[id]/page.tsx`
- Modify: `app/love-rooms/page.tsx`
- Modify: `app/love-rooms/reservation-confirmation/page.tsx`
- Modify: `app/matches/loading.tsx`
- Modify: `app/matches/page.tsx`
- Modify: `app/messages/page.tsx`
- Modify: `app/notifications/page.tsx`
- Modify: `app/profile/[id]/page.tsx`
- Modify: `app/profile/page.tsx`
- Modify: `tests/unified-site-shell.test.ts`

**Interfaces:**
- Consumes: navigation globale de Task 2.
- Produces: des pages sans `LandingHeader` ni `MobileNavigation` local.

- [ ] **Step 1: Add failing duplicate-navigation scan**

Le test parcourt les fichiers sous `app` et exige :

```ts
expect(filesContaining('<LandingHeader')).toEqual([])
expect(filesContaining('<MobileNavigation')).toEqual([])
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run tests/unified-site-shell.test.ts`

Expected: FAIL avec les pages qui rendent encore ces composants.

- [ ] **Step 3: Remove local imports and JSX instances**

Retirer uniquement les imports et balises `LandingHeader` / `MobileNavigation`. Conserver les contenus, formulaires, protections, actions et données inchangés.

- [ ] **Step 4: Run shell tests, existing layout tests and TypeScript**

Run: `npm test -- --run tests/unified-site-shell.test.ts tests/lhr-v2-shell.test.ts tests/lhr-fluid-layout.test.ts && npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit the page migration**

```bash
git add app tests/unified-site-shell.test.ts
git commit -m "refactor: remove duplicate page navigation"
```

### Task 4: Vérification visuelle et régressions

**Files:**
- Modify only if a verified visual defect requires a focused correction.

**Interfaces:**
- Consumes: la coque complète.
- Produces: validation desktop/mobile et build de production.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test -- --run && npm run lint && npm run build`

Expected: toute la suite passe et le build Next.js réussit.

- [ ] **Step 2: Render and inspect representative routes**

Vérifier `/`, `/events`, `/events/[id]` disponible, `/love-rooms`, `/discover`, `/messages`, `/matches`, `/profile`, `/login`, `/register` et `/admin` aux largeurs desktop et mobile. Confirmer un seul menu, le logo entier et l’absence de débordement horizontal.

- [ ] **Step 3: Re-run focused checks after any visual correction**

Run: `npm test -- --run tests/unified-site-shell.test.ts && npm run lint && npm run build`

Expected: PASS.

### Task 5: Sauvegarde et déploiement en production

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: Git HEAD vérifié.
- Produces: VPS2 et Vercel à jour.

- [ ] **Step 1: Back up production**

Créer un dump PostgreSQL horodaté et taguer l’image Docker actuelle `pre-unified-shell`.

- [ ] **Step 2: Build an exact Git archive on VPS2**

Transférer `git archive HEAD`, vérifier son SHA-256 et construire `pod-lhr-app:latest` depuis ce contexte propre.

- [ ] **Step 3: Recreate the application container**

Exécuter `docker compose -f docker-compose.lhr.yml up -d --no-deps --force-recreate app`, puis vérifier `healthy` et zéro redémarrage.

- [ ] **Step 4: Deploy the same revision to Vercel**

Déployer sur `gilles-korzec-projects/love-hotel-rencontre` et attendre l’état `Ready`.

- [ ] **Step 5: Verify production routes and logs**

Contrôler les codes HTTP des routes représentatives, la présence des libellés de coque dans le bundle, puis confirmer zéro 5xx et zéro erreur applicative depuis le redémarrage.
