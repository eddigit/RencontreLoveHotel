# Production Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolider l'héritage V1/V2 sans perte, identifier chaque déploiement et mesurer les parcours communautaires importants.

**Architecture:** Un script opératoire isolé gère l'audit et la consolidation transactionnelle des identités. La version est calculée au build à partir des sources. Une table d'événements métier minimale alimente des agrégats administrateur sans stocker de contenu sensible.

**Tech Stack:** Next.js 15, TypeScript, PostgreSQL, Vitest, Docker Compose VPS2.

## Global Constraints

- Aucun message, conversation, profil, photo, relation ou événement ne peut être supprimé sans transfert vérifié.
- La consolidation reste en simulation par défaut et exige une sauvegarde récente pour le mode application.
- Toutes les actions administrateur appellent `requireAdmin()`.
- Aucune donnée textuelle intime, email ou mot de passe dans la télémétrie produit.
- Livraison directe sur `main`, puis déploiement VPS2 et smoke test production.

---

### Task 1: Audit et sauvegarde des identités

**Files:**
- Create: `scripts/audit-duplicate-users.mjs`
- Create: `tests/duplicate-user-reconciliation.test.ts`

**Interfaces:**
- Produces: rapport JSON anonymisé et `scoreDuplicateAccount(account)`.

- [ ] Écrire les tests du score et de la sélection stable du compte principal.
- [ ] Vérifier que les tests échouent sans l'implémentation.
- [ ] Implémenter l'audit en lecture seule et le mode JSON.
- [ ] Créer un `pg_dump` daté sur VPS2 et exécuter l'audit production.
- [ ] Vérifier que les volumes du rapport correspondent aux requêtes indépendantes.

### Task 2: Consolidation transactionnelle

**Files:**
- Create: `scripts/reconcile-duplicate-users.mjs`
- Create: `lib/duplicate-user-reconciliation.ts`
- Modify: `tests/duplicate-user-reconciliation.test.ts`
- Create: `migrations/20260711_unique_normalized_user_email.sql`

**Interfaces:**
- Consumes: rapport de Task 1.
- Produces: `buildDuplicateUserMergePlan`, mode `--dry-run`, mode `--apply` et index unique final.

- [ ] Écrire les tests des réaffectations simples, conflits de participants,
  relations symétriques et interdiction des auto-relations.
- [ ] Vérifier les échecs attendus.
- [ ] Implémenter une transaction par groupe avec verrouillage des comptes.
- [ ] Comparer les volumes avant/après en simulation.
- [ ] Appliquer uniquement si chaque groupe conserve tous ses rattachements.
- [ ] Créer l'index unique sur `lower(email)` après zéro doublon.

### Task 3: Révision de déploiement fiable

**Files:**
- Modify: `scripts/update-version.js`
- Modify: `lib/deployment-info.ts`
- Modify: `components/deployment-stamp.tsx`
- Modify: `tests/deployment-info.test.ts`

**Interfaces:**
- Produces: `sourceRevision` déterministe et libellé de déploiement vérifiable.

- [ ] Écrire un test qui refuse une révision `unknown` dans un build sans Git.
- [ ] Vérifier l'échec.
- [ ] Calculer un hash déterministe des sources hors sorties de build.
- [ ] Afficher la révision courte dans le footer.
- [ ] Vérifier le test, le build Docker et le footer en production.

### Task 4: Événements d'activité produit

**Files:**
- Create: `migrations/20260711_product_activity_events.sql`
- Create: `lib/product-activity.ts`
- Modify: actions serveur de recherche, profils, relations, conversations, événements et mur.
- Modify: `actions/admin-stats-actions.ts`
- Create: `tests/product-activity.test.ts`

**Interfaces:**
- Produces: `recordProductActivity(input)` non bloquant et agrégats admin 24 h/7 j.

- [ ] Écrire les tests de liste blanche, absence de contenu sensible et garde admin.
- [ ] Vérifier les échecs.
- [ ] Ajouter la migration et l'enregistreur serveur non bloquant.
- [ ] Brancher uniquement les neuf événements métier listés dans la conception.
- [ ] Ajouter les agrégats au cockpit administrateur.
- [ ] Appliquer la migration et vérifier les premiers événements en production.

### Task 5: Validation et livraison

**Files:**
- Modify: documentation opératoire si les commandes ont évolué.

- [ ] Exécuter la suite Vitest complète, le typage, le build et l'audit high.
- [ ] Vérifier `git diff --check` et l'absence de secrets.
- [ ] Committer et pousser sur `main`.
- [ ] Déployer le conteneur VPS2.
- [ ] Vérifier santé, logs, pages publiques et protections privées.
