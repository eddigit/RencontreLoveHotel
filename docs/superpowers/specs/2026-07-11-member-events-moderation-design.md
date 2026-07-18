# Événements membres et modération V3

**Date :** 11 juillet 2026  
**Projet :** Love Hotel Rencontre  
**Déploiement :** commit direct sur `main`, puis VPS2 après validation automatisée

## Objectif

Permettre à chaque membre activé de proposer une expérience avec une image de couverture, tout en garantissant qu’aucune proposition membre ne soit visible avant validation admin. Le profil admin devient la file de modération opérationnelle : prévisualisation, publication, demande de correction ou refus, avec notification au membre.

## Diagnostic actuel

- `actions/event-actions.ts` force désormais correctement les nouvelles créations membre à `pending_review`, mais l’interface de création conserve un wording de publication immédiate et n’envoie qu’une URL d’image.
- `getUpcomingEvents()` ne renvoie que les événements publiés ; une proposition membre n’a donc pas d’écran de suivi.
- `/admin/events` affiche les événements publiés et passés, mais ne fournit pas de file dédiée aux propositions en attente.
- `events` possède déjà `publication_status`, `created_by_role`, `experience_type`, `venue`, `event_date` et `event_time`. La migration complète ce modèle avec le suivi de modération sans modifier les inscriptions existantes.
- La validation photo existante (`lib/image-upload-validation.ts`) sera réutilisée pour éviter une seconde politique de sécurité.

## Contrat produit

### États

- `pending_review` : proposition membre reçue, invisible dans le catalogue public.
- `published` : proposition validée, visible et réservable.
- `rejected` : proposition refusée, invisible ; le membre reçoit le motif.

Les événements historiques déjà publiés ne sont ni supprimés ni masqués par cette tranche. Le nouveau contrôle s’applique aux créations et aux décisions admin futures.

### Création membre

Le formulaire `/events/new` devient un parcours court :

1. choix du format (`jacuzzi` ou `open_curtains`) ;
2. lieu (`Pigalle` ou `Châtelet`) ;
3. date et heure ;
4. titre, description et capacité contrôlée ;
5. une image de couverture facultative, avec aperçu et image par défaut par format.

Le serveur ignore toute demande cliente de publication, force `pending_review` pour un membre et limite la couverture à une image validée par taille, MIME, signature binaire et extension. L’image est stockée dans Vercel Blob sous `event-covers/<user-id>/...`.

### Modération admin

La page `/admin/events` reçoit une section prioritaire `Propositions à valider` :

- aperçu image, titre, format, lieu, date/heure, capacité et auteur ;
- lien vers le profil auteur ;
- actions `Publier`, `Demander une correction` et `Refuser` ;
- note admin obligatoire pour une demande de correction ou un refus ;
- publication atomique du statut et notification au membre.

Les server actions de lecture et d’écriture appellent `requireAdmin()` dans leur corps. La file est triée par ancienneté, puis les événements publiés restent dans les sections existantes.

### Notification membre

Chaque décision crée une notification ciblée `event_moderation` avec le statut, le motif éventuel et un lien vers `/events`. Aucune notification globale ni email automatique n’est ajouté dans cette tranche.

## Données

Migration `migrations/20260711_event_moderation.sql` :

- `moderation_note TEXT` nullable ;
- `moderated_by UUID REFERENCES users(id) ON DELETE SET NULL` ;
- `moderated_at TIMESTAMPTZ` nullable ;
- index sur `(publication_status, created_at DESC)` ;
- contrainte de cohérence : note obligatoire pour `rejected` et `pending_review` après décision de correction.

Aucune suppression de ligne, d’inscription ou d’image existante.

## Hors périmètre de cette tranche

- refonte complète de la messagerie ;
- triage IA automatique et correction autonome du code ;
- notifications email événement ;
- nouveaux formats d’événements au-delà des deux formats actifs.

## Critères d’acceptation

- Un membre peut soumettre un événement avec ou sans image.
- La proposition apparaît dans son suivi avec le statut `À valider` et n’est pas dans le catalogue public.
- Un admin voit la file, ouvre le profil, publie, demande une correction ou refuse.
- Une note est obligatoire pour les décisions négatives.
- Le membre reçoit une notification après chaque décision.
- Les événements historiques, inscriptions et conversations restent inchangés.
- Les tests couvrent les gardes membre/admin, les statuts, la note obligatoire, l’upload contrôlé et la non-exposition publique des événements en attente.
