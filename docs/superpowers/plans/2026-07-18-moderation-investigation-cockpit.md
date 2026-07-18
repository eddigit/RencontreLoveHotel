# Plan d’implémentation — cockpit d’enquête de modération

> **Exécution :** appliquer ce plan avec `superpowers:executing-plans` et respecter le cycle test rouge → code minimal → test vert.

**Objectif :** transformer les alertes de modération en dossiers regroupés par profil, consultables en un clic avec avatar, profil, conversations complètes, canal officiel, décisions, gel et export de preuves.

**Architecture :** un dossier `moderation_investigations` regroupe les alertes existantes de `moderation_queue`. Les administrateurs disposent de l’identité et de toutes les conversations du profil pendant la période renforcée de six mois ; chaque ouverture est journalisée. Les adhérents-modérateurs conservent une projection pseudonymisée et ciblée. Les messages officiels sont stockés séparément de la messagerie privée.

**Stack :** Next.js App Router, server actions TypeScript, PostgreSQL, Vitest, Tailwind, `crypto` Node et ZIP généré sans transmission automatique.

---

## Tâche 1 — Schéma d’enquête et garde-fous

**Fichiers :**
- Créer : `migrations/20260718_moderation_investigation_cockpit.sql`
- Modifier : `schema.sql`
- Créer : `tests/moderation-investigation-migration.test.ts`

1. Écrire un test qui exige les tables `moderation_investigations`, `moderation_official_messages`, `moderation_investigation_events`, `moderation_evidence_snapshots`, `moderation_exports`, `moderation_transmissions`, les index et le rattachement `moderation_queue.investigation_id`.
2. Vérifier que le test échoue faute de migration.
3. Créer une migration idempotente, backfiller un dossier par `user_id`, rattacher les alertes et ajouter une échéance d’accès renforcé à six mois.
4. Répliquer le schéma de référence dans `schema.sql`.
5. Exécuter le test ciblé puis committer.

## Tâche 2 — Domaine, liste regroupée et contrôle d’accès

**Fichiers :**
- Créer : `lib/moderation-investigation.ts`
- Créer : `actions/moderation-investigation-actions.ts`
- Créer : `tests/moderation-investigation-actions.test.ts`

1. Tester les priorités métier : prostitution/contrepartie, danger ou mineur présumé, menace/harcèlement, fraude, autre.
2. Tester que `getModerationInvestigations()` exige un rôle de modération, regroupe par profil et ne divulgue identité/avatar/email qu’à l’admin.
3. Tester que `getModerationInvestigation()` journalise l’accès et renvoie au seul admin le profil complet.
4. Implémenter les helpers et les deux actions avec requêtes paramétrées.
5. Exécuter les tests ciblés puis committer.

## Tâche 3 — Conversations complètes et administration globale

**Fichiers :**
- Modifier : `actions/moderation-investigation-actions.ts`
- Modifier : `actions/message-actions.ts`
- Créer : `tests/moderation-conversation-access.test.ts`

1. Tester que seul l’admin peut lister toutes les conversations d’un profil signalé et ouvrir un fil appartenant réellement à ce profil.
2. Tester l’ordre chronologique, les participants avec avatar, les pièces jointes et le marquage des messages à l’origine d’une alerte.
3. Tester la journalisation `conversation_list` et `conversation_thread` avec identifiants de ressource.
4. Ajouter un aperçu global par conversation pour `/admin/messages` afin de supprimer l’affichage « une ligne par message ».
5. Exécuter les tests ciblés puis committer.

## Tâche 4 — Canal officiel et actions immédiates

**Fichiers :**
- Modifier : `actions/moderation-investigation-actions.ts`
- Créer : `app/account/moderation/page.tsx`
- Créer : `tests/moderation-official-channel.test.ts`

1. Tester qu’un admin peut écrire au profil dans un canal officiel distinct et qu’une notification est créée.
2. Tester que le membre ne peut lire que ses propres messages officiels et que la lecture est horodatée.
3. Tester les actions : avertissement, restriction de messagerie, suspension, bannissement permanent, maintien/retrait des automatismes.
4. Implémenter les actions atomiques, l’historique et la vue membre.
5. Exécuter les tests ciblés puis committer.

## Tâche 5 — Gel, export probatoire et registre de transmission

**Fichiers :**
- Créer : `lib/moderation-evidence.ts`
- Créer : `app/api/admin/moderation/investigations/[id]/export/route.ts`
- Modifier : `actions/moderation-investigation-actions.ts`
- Créer : `tests/moderation-evidence-export.test.ts`

1. Tester la construction déterministe du dossier : profil figé, alertes, conversations, pièces jointes référencées, canal officiel, décisions et consultations.
2. Tester les empreintes SHA-256 du manifeste et l’absence de transmission automatique.
3. Tester le gel probatoire et l’enregistrement manuel d’une transmission (destinataire, référence, fondement, date).
4. Implémenter le rapport HTML, les CSV/JSON et l’archive ZIP téléchargée par une route admin.
5. Exécuter les tests ciblés puis committer.

## Tâche 6 — Cockpit visuel et avatars partout

**Fichiers :**
- Modifier : `app/moderation/page.tsx`
- Modifier : `app/moderation/[id]/page.tsx`
- Créer : `components/moderation/moderation-avatar.tsx`
- Créer : `components/moderation/conversation-thread.tsx`
- Modifier : `app/admin/messages/page.tsx`
- Modifier : `app/admin/users/page.tsx`
- Créer : `tests/moderation-investigation-ui.test.ts`

1. Tester par lecture de source la présence des avatars/fallback, filtres de priorité, accès profil, onglets, fil à bulles, canal officiel, boutons de restriction/ban/gel/export.
2. Vérifier l’échec initial.
3. Construire la file regroupée et le cockpit d’enquête ; conserver la projection limitée pour l’adhérent-modérateur.
4. Remplacer l’admin messages par une liste de conversations ouvrant un fil chronologique et ajouter l’avatar dans messages/profils.
5. Exécuter le test ciblé puis committer.

## Tâche 7 — Vérification complète

1. Exécuter `npm test -- --run`.
2. Exécuter `npm run lint`.
3. Exécuter `npm run build`.
4. Relire les protections `requireAdmin()` sur chaque action/route sensible et confirmer qu’aucun secret ni `deployments.log` n’est inclus.
5. Appliquer `superpowers:verification-before-completion`, puis préparer la livraison sans pousser ni déployer automatiquement.
