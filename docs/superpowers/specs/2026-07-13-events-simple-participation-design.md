# Événements simples et participation maîtrisée

**Date :** 13 juillet 2026  
**Projet :** Love Hotel Rencontre  
**Livraison :** commit direct sur `main`, sauvegarde PostgreSQL, migration et déploiement VPS2

## Objectif

Rendre le parcours événements compréhensible sans explication : voir les prochains moments, proposer un événement en moins de deux minutes, demander à participer, puis suivre la décision de l'organisateur. La validation admin existante reste obligatoire avant toute publication.

## Diagnostic confirmé

- `/events` redirige parfois un membre connecté vers `/login` parce que l'effet client agit avant la fin du chargement de session.
- La production contient 33 événements, 3 événements futurs et 55 participations, tandis que l'accueil connecté affiche zéro événement à venir.
- La page actuelle place au même niveau les formats, les filtres, les propositions personnelles et un agenda externe de grande hauteur.
- Les cartes proposent deux actions concurrentes (`Participer` et `Voir les détails`) sans expliquer si la participation est immédiate.
- La création en trois étapes expose des paramètres de prix et de paiement inutiles pour une invitation communautaire.
- Deux chemins techniques gèrent la participation : server actions et route API. Ils doivent converger vers un seul contrat métier.

## Parcours membre

### Page principale

La page `/events` porte le titre `Événements` et présente uniquement :

1. une action primaire `Proposer un événement` ;
2. trois vues : `À venir`, `Mes événements`, `Mes participations` ;
3. deux filtres secondaires : `Jacuzzi` et `Rideaux ouverts` ;
4. une liste chronologique de cartes ;
5. un lien discret vers l'agenda externe Rideaux ouverts, sans iframe dans le flux principal.

Une carte affiche l'image, le format, la date et l'heure, l'établissement, l'organisateur, le statut de réservation de chambre, les places restantes et une seule action principale. Le détail reste accessible en cliquant sur le titre ou la carte.

L'état vide indique `Aucun événement publié pour le moment` et propose immédiatement `Lancer le premier événement`.

### Demande de participation

Pour un événement publié, l'action principale est `Demander à participer`. L'action crée une demande `pending` et devient `Demande envoyée`. L'organisateur reçoit une notification et peut ouvrir le profil du demandeur, accepter ou refuser.

Après acceptation, l'état devient `Participation acceptée` et le membre reçoit une notification avec un lien vers l'événement. Après refus, l'état devient `Demande refusée`. Le membre peut retirer une demande en attente ou quitter un événement accepté.

La capacité est consommée uniquement par les demandes acceptées. Une acceptation est refusée atomiquement si la dernière place a déjà été prise.

L'organisateur est automatiquement participant accepté à son propre événement et ne voit jamais le bouton de demande.

### Création simplifiée

`/events/new` devient un formulaire progressif sur une seule page :

- choix visuel `Apéro jacuzzi` ou `Rideaux ouverts` ;
- établissement `Pigalle` ou `Châtelet` ;
- date et heure futures ;
- capacité avec une valeur proposée par le format ;
- titre et invitation courte ;
- photo facultative avec l'image du format par défaut.

Pour `Rideaux ouverts`, une question supplémentaire apparaît : `La chambre est-elle déjà réservée ?`

- `Oui` : la référence de réservation est obligatoire ; la carte affichera `Chambre réservée` sans exposer la référence aux autres membres.
- `Pas encore` : la proposition reste autorisée ; la carte affichera `Chambre à confirmer` et un lien `Réserver une chambre` est présenté.

Les prix, le paiement et les conditions commerciales disparaissent du formulaire membre. Ils restent disponibles dans les outils admin existants.

Après envoi, l'utilisateur arrive dans `Mes événements` avec le statut `En attente de validation`. La page explique en une phrase que l'administrateur doit publier la proposition. Les états disponibles sont `En attente`, `À corriger`, `Publié` et `Refusé`.

## Parcours organisateur

Dans `Mes événements`, chaque événement publié affiche un compteur `Demandes reçues`. L'organisateur ouvre une liste compacte avec avatar, pseudo, lien vers le profil et actions `Accepter` ou `Refuser`.

Les actions sont limitées au créateur de l'événement et aux administrateurs. Elles sont idempotentes et vérifient côté serveur le statut de l'événement, la capacité et les blocages entre membres.

## Parcours administrateur

La file `/admin/events` existante reste le point de modération. Les créations membres restent invisibles tant qu'elles ne sont pas publiées. La notification email actuelle vers `loolyyb@gmail.com` et la notification admin interne sont conservées.

La carte de modération ajoute le statut de réservation, sans afficher la référence complète dans la liste. La référence reste consultable dans le détail admin uniquement.

## Données et sécurité

La table `events` reçoit :

- `booking_confirmed BOOLEAN NOT NULL DEFAULT FALSE` ;
- `booking_reference TEXT` nullable ;
- une contrainte exigeant une référence non vide quand `booking_confirmed = TRUE` pour `open_curtains`.

La table `event_participants` reçoit :

- `status TEXT NOT NULL DEFAULT 'accepted'` avec `pending`, `accepted`, `rejected`, `withdrawn` ;
- `decided_by UUID` nullable ;
- `decided_at TIMESTAMPTZ` nullable ;
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`.

Les participations historiques sont conservées en `accepted`. Aucune donnée existante n'est supprimée. Les server actions vérifient la session avec `requireCurrentUser()` ou l'identité avec `requireSameUserOrAdmin()`. Les décisions d'organisateur vérifient également `creator_id` en base.

## Compteurs et cohérence

Tous les compteurs d'événements futurs utilisent la date et l'heure combinées et uniquement le statut `published`. Le compteur de participants utilise uniquement le statut `accepted`. Le même contrat est partagé par l'accueil, `/events`, le détail et l'admin.

Le chargement de `/events` et du détail attend la fin de `isLoading` avant toute redirection. La route API historique de participation délègue au même service métier ou est retirée si elle n'a plus de consommateur.

## Notifications

- Création : notification admin et email existants.
- Modération : notification du créateur existante.
- Nouvelle demande : notification de l'organisateur.
- Acceptation ou refus : notification du demandeur.
- Retrait : mise à jour silencieuse, sans email.

Aucun email automatique supplémentaire n'est envoyé aux membres dans cette tranche ; leurs préférences d'activité restent respectées.

## Critères d'acceptation

- Un membre connecté ne subit plus de redirection intempestive depuis `/events`.
- L'accueil et `/events` affichent le même nombre d'événements futurs publiés.
- Un membre propose un Jacuzzi ou Rideaux ouverts depuis un formulaire court.
- Une proposition Rideaux ouverts peut être soumise avec ou sans réservation, avec le statut adéquat.
- Une création membre reste invisible avant validation admin.
- Un membre envoie une demande de participation et voit immédiatement son état.
- L'organisateur accepte ou refuse depuis `Mes événements` et la capacité reste cohérente.
- Les profils sont accessibles depuis les demandes reçues.
- Les événements et participations historiques restent disponibles.
- Les parcours desktop et mobile sont vérifiés sur la production après déploiement.

## Hors périmètre

- paiement en ligne des événements ;
- synchronisation automatique avec le moteur de réservation Love Hotel ;
- liste d'attente automatique après événement complet ;
- notifications push mobiles ;
- nouveaux formats au-delà de Jacuzzi et Rideaux ouverts.
