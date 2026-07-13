# Conciergerie Coquine Conversational Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la Conciergerie Coquine plus engageante et conversationnelle tout en fiabilisant le stockage administratif et l'envoi vers `loolyyb@gmail.com`.

**Architecture:** La page serveur porte la promesse et transmet l'identite de session au formulaire client. La route API normalise, stocke et envoie chaque demande avec le helper de destinataire admin existant. Une migration versionnee ajoute les details utiles au dossier de conciergerie.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, PostgreSQL, Nodemailer, Vitest, Tailwind CSS.

## Global Constraints

- Conserver `/conciergerie-service.jpg`.
- La page reste reservee aux membres connectes.
- Toutes les notifications email de conciergerie utilisent la configuration qui vaut `loolyyb@gmail.com` en production.
- Aucun secret ou identifiant SMTP n'est ecrit dans le depot.
- Aucun paiement ni promesse de disponibilite n'est ajoute.

---

### Task 1: Verrouiller le contrat par les tests

**Files:**
- Modify: `tests/conciergerie-workflow.test.ts`

**Interfaces:**
- Consumes: les fichiers source lus comme contrats de contenu.
- Produces: des attentes sur le nouveau discours, le pre-remplissage et les colonnes detaillees.

- [ ] Ajouter les assertions sur les preuves `lieux`, `partenaires`, `communaute` et sur l'accroche conversationnelle.
- [ ] Ajouter les assertions sur les props `initialName` et `initialEmail`, `aria-pressed` et `aria-live`.
- [ ] Ajouter les assertions sur `venue_preference`, `desired_date`, `party_size` et `mood` dans la route, la migration et l'administration.
- [ ] Executer `npm test -- --run tests/conciergerie-workflow.test.ts` et verifier que les nouvelles attentes echouent pour les elements absents.

### Task 2: Conserver tous les details d'une demande

**Files:**
- Create: `migrations/20260713_conciergerie_request_details.sql`
- Modify: `app/api/conciergerie/route.ts`
- Modify: `app/admin/conciergerie/page.tsx`

**Interfaces:**
- Consumes: `NormalizedConciergerieRequest` et la table `conciergerie_requests`.
- Produces: quatre colonnes textuelles facultatives, renseignees lors de l'insertion et affichees dans l'administration.

- [ ] Ajouter une migration transactionnelle avec les quatre colonnes et `ADD COLUMN IF NOT EXISTS`.
- [ ] Aligner le schema defensif de la route et de l'administration.
- [ ] Inserer les valeurs normalisees dans la table.
- [ ] Lire et afficher les valeurs sur chaque dossier administrateur.
- [ ] Executer le test cible et verifier le passage des assertions de donnees.

### Task 3: Recomposer la page et le formulaire

**Files:**
- Modify: `app/conciergerie/page.tsx`
- Modify: `components/ConciergerieForm.tsx`

**Interfaces:**
- Consumes: `session.user.name` et `session.user.email`.
- Produces: `ConciergerieForm({ initialName, initialEmail })` et un parcours responsive en trois temps.

- [ ] Transmettre l'identite de session au formulaire.
- [ ] Recomposer le hero autour de l'accroche et des trois preuves du reseau.
- [ ] Rendre les libelles du formulaire conversationnels et conserver tous les champs envoyes a l'API.
- [ ] Ajouter les etats accessibles des boutons et du message de resultat.
- [ ] Executer le test cible et verifier qu'il passe.

### Task 4: Verification locale complete

**Files:**
- Review: tous les fichiers modifies par les taches precedentes.

**Interfaces:**
- Consumes: l'ensemble du changement.
- Produces: preuves de qualite avant livraison.

- [ ] Executer `npm test -- --run` et verifier zero echec.
- [ ] Executer `npm run lint` et verifier zero erreur TypeScript.
- [ ] Executer `npm run build` et verifier la generation de `/conciergerie` et `/admin/conciergerie`.
- [ ] Executer `git diff --check` et revoir le diff final.

### Task 5: Livraison et controle production

**Files:**
- Deploy: fichiers applicatifs modifies et migration versionnee.

**Interfaces:**
- Consumes: le commit pousse sur `main`.
- Produces: page et workflow actifs sur `rencontrelovehotel.com`.

- [ ] Sauvegarder PostgreSQL avant la migration.
- [ ] Pousser le commit verifie sur `main`.
- [ ] Appliquer la migration, reconstruire `pod-lhr-app` et attendre l'etat healthy.
- [ ] Verifier la page connectee sur desktop et 390 px, sans debordement.
- [ ] Verifier que le destinataire actif vaut `loolyyb@gmail.com`, que SMTP est pret et qu'aucune erreur recente n'apparait dans les logs.
