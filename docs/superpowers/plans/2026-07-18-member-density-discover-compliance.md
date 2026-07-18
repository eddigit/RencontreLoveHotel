# Member Density and Discover Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher cinq profils compacts par ligne desktop dans l’annuaire et insérer l’affiche anti-prostitution entre les widgets de recherche et de feedback de Discover.

**Architecture:** Les changements restent limités aux deux pages clientes existantes. Des tests de contrat lisent leurs sources pour protéger les breakpoints, l’asset, le lien et l’ordre des widgets sans introduire de nouveau composant ou de nouvelle donnée.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- La grille Membres utilise cinq colonnes dès `lg`.
- Mobile reste à une colonne et tablette à deux colonnes.
- La pagination reste à 24 profils par page.
- Discover réutilise `/compliance-communaute.png` et pointe vers `/community-safety`.
- Le visuel apparaît après « Rechercher des membres » et avant `CommunityFeedbackWidget`.
- Aucun changement du classement, de la recherche, de la pagination ou du contenu juridique.

---

### Task 1: Protéger les contrats visuels

**Files:**
- Modify: `tests/member-directory-ui.test.ts`
- Modify: `tests/community-home-ui.test.ts`

**Interfaces:**
- Consumes: sources de `app/members/page.tsx` et `app/discover/page.tsx`.
- Produces: contrats Vitest sur la grille et l’ordre des widgets.

- [ ] **Step 1: Écrire les assertions en échec**

Ajouter dans le test de l’annuaire :

```ts
expect(pageSource).toContain("lg:grid-cols-5")
expect(pageSource).toContain("aspect-square")
expect(pageSource).toContain(">Profil</Link>")
```

Ajouter dans le test de Discover :

```ts
expect(page).toContain("src='/compliance-communaute.png'")
expect(page).toContain("href='/community-safety'")
expect(page.indexOf("href='/members'")).toBeLessThan(page.indexOf("src='/compliance-communaute.png'"))
expect(page.indexOf("src='/compliance-communaute.png'")).toBeLessThan(page.indexOf('<CommunityFeedbackWidget />'))
```

- [ ] **Step 2: Vérifier l’état RED**

Run: `npm test -- --run tests/member-directory-ui.test.ts tests/community-home-ui.test.ts`

Expected: FAIL sur les cinq colonnes, la photo carrée et le nouveau widget Discover absents.

### Task 2: Densifier la page Membres

**Files:**
- Modify: `app/members/page.tsx:352-397`
- Test: `tests/member-directory-ui.test.ts`

**Interfaces:**
- Consumes: `CommunityMember`, `imageFor`, `profileTypeLabel`, `orientationLabel` existants.
- Produces: la grille responsive et les cartes compactes, sans nouvelle API.

- [ ] **Step 1: Implémenter la grille et les cartes compactes**

Remplacer la grille par :

```tsx
<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
```

Utiliser `aspect-square`, réduire les rayons, espacements et titre, tronquer la ville, conserver les badges et afficher le bouton principal avec le libellé `Profil`.

- [ ] **Step 2: Vérifier le test Membres**

Run: `npm test -- --run tests/member-directory-ui.test.ts`

Expected: PASS.

### Task 3: Ajouter le rappel conformité dans Discover

**Files:**
- Modify: `app/discover/page.tsx:309-323`
- Test: `tests/community-home-ui.test.ts`

**Interfaces:**
- Consumes: composant `Image` déjà importé et asset public `/compliance-communaute.png`.
- Produces: un lien accessible vers `/community-safety` dans le flux de la colonne gauche.

- [ ] **Step 1: Insérer le widget**

Entre le lien Membres et `CommunityFeedbackWidget`, ajouter :

```tsx
<Link
  href='/community-safety'
  aria-label='Prostitution interdite — consulter notre charte de sécurité'
  className='group block overflow-hidden rounded-2xl border border-red-500/30 bg-black/55 shadow-lg shadow-red-950/20 transition hover:border-red-400/55'
>
  <span className='relative block aspect-square'>
    <Image
      src='/compliance-communaute.png'
      alt='Prostitution interdite — rencontres authentiques uniquement'
      fill
      className='object-cover transition duration-300 group-hover:scale-[1.02]'
      sizes='260px'
    />
  </span>
</Link>
```

- [ ] **Step 2: Vérifier le test Discover**

Run: `npm test -- --run tests/community-home-ui.test.ts`

Expected: PASS.

### Task 4: Validation et livraison

**Files:**
- Verify: `app/members/page.tsx`
- Verify: `app/discover/page.tsx`
- Verify: `tests/member-directory-ui.test.ts`
- Verify: `tests/community-home-ui.test.ts`

**Interfaces:**
- Consumes: scripts npm du projet et projet Vercel lié.
- Produces: commit `main`, push GitHub et déploiement production Vercel.

- [ ] **Step 1: Vérifier les tests ciblés et critiques**

Run: `npm test -- --run tests/member-directory-ui.test.ts tests/community-home-ui.test.ts && npm run verify:critical`

Expected: tous les tests passent.

- [ ] **Step 2: Vérifier TypeScript et le build**

Run: `npm run lint && npm run build`

Expected: exit code 0.

- [ ] **Step 3: Commit et push**

```bash
git add app/members/page.tsx app/discover/page.tsx tests/member-directory-ui.test.ts tests/community-home-ui.test.ts docs/superpowers/plans/2026-07-18-member-density-discover-compliance.md
git commit -m "feat: densify member discovery surfaces"
git push origin main
```

- [ ] **Step 4: Déployer et vérifier Vercel**

Run: `vercel deploy --prod --yes`

Expected: deployment `READY`, cible `production`, commit `main`; l’asset `/compliance-communaute.png` répond en 200 sur le déploiement Vercel.
