# Booked Room Invitations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer une annonce "Rideaux ouverts" en invitation structurée, confirmée par une réservation privée quand elle existe ou clairement signalée comme non garantie, avec candidatures et décisions de l’organisateur.

**Architecture:** Étendre `wall_posts` avec les informations non sensibles de la réservation et conserver la référence privée. Ajouter `wall_participation_requests` comme workflow autonome. Les actions serveur restent dans le domaine du mur, contrôlent la session et créent notifications et conversation après acceptation.

**Tech Stack:** Next.js 15 App Router, React 19, PostgreSQL, server actions, Vitest, NextAuth.

## Global Constraints

- Une invitation peut être proposée sans réservation mais doit afficher « Disponibilité non garantie ».
- Si `booking_confirmed = true`, une référence de réservation non vide est obligatoire.
- La référence de réservation ne doit jamais être renvoyée dans le flux communautaire.
- Une candidature est unique par annonce et membre.
- L’auteur ne peut pas candidater à sa propre annonce.
- Seul l’auteur ou un administrateur peut accepter ou refuser.
- Une acceptation crée une notification et une conversation privée avec l’organisateur.
- Les règles de modération et les limites anti-spam existantes restent actives.

---

### Task 1: Schéma de réservation et candidatures

**Files:**
- Create: `migrations/20260711_booked_room_invitations.sql`
- Test: `tests/booked-room-invitations-migration.test.ts`

**Interfaces:**
- Produces: colonnes structurées sur `wall_posts` et table `wall_participation_requests`.

- [ ] Écrire le test qui exige les champs `venue`, `room_name`, `starts_at`, `guest_capacity`, `booking_confirmed`, `booking_reference` et les statuts de candidature.
- [ ] Exécuter `npm test -- --run tests/booked-room-invitations-migration.test.ts` et confirmer l’échec.
- [ ] Créer la migration additive avec contraintes, index et unicité `(post_id, user_id)`.
- [ ] Relancer le test et confirmer sa réussite.

### Task 2: Actions serveur du workflow

**Files:**
- Modify: `actions/community-wall-actions.ts`
- Test: `tests/community-wall-participation-actions.test.ts`

**Interfaces:**
- Produces: `requestWallParticipation`, `getWallParticipationRequests`, `decideWallParticipationRequest`.
- Consumes: `createNotification`, `findOrCreateConversation`, `requireCurrentUser`.

- [ ] Écrire les tests de réservation obligatoire, candidature unique, interdiction auteur et autorisation de décision.
- [ ] Exécuter les tests ciblés et confirmer l’échec.
- [ ] Étendre `createWallPost` pour les champs structurés et imposer la réservation préalable au type `dispo_rideaux_ouverts`.
- [ ] Implémenter les trois actions de candidature avec requêtes paramétrées.
- [ ] À l’acceptation, créer notification et conversation; au refus, notifier sans conversation.
- [ ] Relancer les tests ciblés et confirmer leur réussite.

### Task 3: Composer et cartes interactives

**Files:**
- Modify: `components/community-wall.tsx`
- Modify: `actions/community-wall-actions.ts`
- Test: `tests/community-wall-booked-invitation-ui.test.ts`

**Interfaces:**
- Consumes: champs d’invitation et actions de Task 2.
- Produces: formulaire structuré et gestion des candidatures dans chaque carte.

- [ ] Écrire le test UI qui exige établissement, chambre, date/heure, capacité, confirmation et référence privée.
- [ ] Ajouter les contrôles au composer uniquement pour "Rideaux ouverts".
- [ ] Ajouter le bouton "Demander à participer" pour les autres membres.
- [ ] Ajouter le panneau auteur avec demandes en attente et boutons Accepter/Refuser.
- [ ] Afficher places restantes et statut de candidature sans afficher la référence.
- [ ] Relancer les tests UI et actions.

### Task 4: Validation et production

**Files:**
- Modify only if required by verification findings.

- [ ] Exécuter `npm test -- --run`.
- [ ] Exécuter `npm run lint`.
- [ ] Exécuter `npm run build`.
- [ ] Sauvegarder PostgreSQL de production.
- [ ] Appliquer la migration avec `ON_ERROR_STOP=1`.
- [ ] Pousser `main`, reconstruire le pod et vérifier santé, schéma et protections anonymes.
