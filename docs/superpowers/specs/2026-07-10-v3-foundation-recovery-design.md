# Love Hotel Rencontre V3 — Design de remise à niveau du socle

**Date :** 10 juillet 2026  
**Livraison :** directe sur `main`, puis déploiement VPS2  
**Périmètre :** fiabilité de la communauté, messagerie, support membre et événements

## Diagnostic de référence

La production contient actuellement 1 349 comptes actifs non bannis, 1 084 profils visibles et exactement 1 048 profils visibles dont l'onboarding est terminé. Le chiffre métier de la communauté V3 est donc **1 048 membres activés**, pas le nombre brut de comptes et pas le nombre de cartes visibles sur l'accueil.

La messagerie contient 327 conversations, 444 messages et 196 conversations avec historique. Les 283 conversations à deux participants n'ont pas de `user_matches` accepté. La règle actuelle qui conditionne l'affichage et l'envoi à un match accepté masque donc l'historique importé et bloque les réponses.

Les retours communauté ne sont pas persistés dans une table dédiée. Ils créent une notification admin et envoient un email, mais ne permettent ni suivi, ni statut, ni réponse reliée au membre.

La base contient un seul événement futur publié. `createEvent` force actuellement le statut `published`, ce qui rend le workflow de validation membre inopérant.

## Objectifs

- Donner une définition unique et réutilisable du membre communautaire.
- Afficher le nombre réel de membres activés et uniquement des profils effectivement montrables.
- Restaurer la lecture et la réponse aux conversations historiques importées sans auto-créer de faux matchs.
- Créer un support membre traçable, répondable depuis l'admin et relié à la messagerie.
- Rendre la publication d'événements explicite, sûre et lisible.
- Ajouter des tests de contrat et des contrôles SQL de production avant chaque migration.

## Contrat de membre communautaire

Un membre communautaire est un utilisateur qui respecte toutes les conditions suivantes :

```sql
COALESCE(u.is_banned, false) = false
AND COALESCE(u.status, 'active') <> 'banned'
AND u.onboarding_completed = true
AND up.display_profile = true
```

La vérification email reste une contrainte d'accès aux flux qui l'exigent ; elle ne change pas le compteur historique de 1 048 sans décision métier séparée. Les actions serveur, la découverte, les compteurs admin et les campagnes ciblées doivent utiliser ce contrat ou une variante nommée explicitement.

## Messagerie : politique d'accès V3

La table `conversations` reçoit un champ `access_mode` contrôlé par une contrainte :

- `match` : conversation directe créée pour un match accepté ;
- `legacy_import` : conversation historique importée contenant déjà des messages ;
- `admin` : conversation entre un membre et un administrateur.

La migration classe sans supprimer :

- les conversations avec un participant admin en `admin` ;
- les conversations avec au moins deux participants, un historique de messages et aucun match accepté en `legacy_import` ;
- les autres conversations en `match`.

Règles serveur :

- un participant peut lire une conversation dont il est membre et dont le mode est `match`, `legacy_import` ou `admin` ;
- un membre peut répondre à une conversation `legacy_import` existante ;
- une nouvelle conversation membre-membre exige toujours un match accepté ;
- une nouvelle conversation admin peut être créée par le chemin admin ;
- l'identité du membre et la liste des participants restent vérifiées à chaque action ;
- les comptes bannis ou désactivés ne peuvent ni lire ni écrire.

Les conversations vides héritées sans match accepté restent masquées et ne sont pas converties artificiellement en match.

## Support membre et feedback

Une table `community_feedback` persistante est ajoutée avec : `id`, `reporter_id`, `kind`, `message`, `page`, `status`, `assigned_admin_id`, `conversation_id`, `created_at`, `updated_at`, `responded_at`, `closed_at`, `last_reply_at` et `metadata`.

À l'envoi du widget :

1. valider la session et le contenu ;
2. insérer le feedback ;
3. créer ou réutiliser le fil admin du membre ;
4. créer la notification admin avec le lien vers le dossier ;
5. envoyer l'email opérationnel ;
6. retourner un identifiant de suivi sans exposer de données internes.

Dans l'admin, le dossier permet de filtrer `ouvert`, `en cours`, `répondu`, `fermé`, d'assigner un admin et de répondre dans le fil. Le membre reçoit toujours la notification interne. L'email de réponse est envoyé uniquement si la préférence explicite correspondante est activée.

## Événements

- événement créé par un membre : `pending_review` ;
- événement créé par un admin ou un établissement : `published` ;
- événement refusé : `rejected` avec motif admin ;
- lecture publique membre : uniquement événements publiés et futurs ;
- capacités, lieu et type d'expérience validés côté serveur ;
- tableau admin : file à publier, événements futurs, passés et refusés.

Le comportement actuel de publication forcée est supprimé. Les événements existants publiés restent conservés ; les événements passés ne remontent plus dans les listes actives.

## Notifications et cohérence

Les notifications restent dans la table existante, mais toutes les actions de lecture et de marquage vérifient l'utilisateur courant. Les types métier (`new_message`, `match_request`, `community_feedback`, `event_reservation`, etc.) sont normalisés dans l'interface au lieu d'être forcés dans un petit type historique.

Une opération de nettoyage séparée documentera les notifications et messages historiques non lus. Elle ne supprimera rien sans comptage, sauvegarde et validation explicite.

## Découpage de livraison

1. **Visibilité et messagerie historique** : migration `access_mode`, filtres membres activés, lecture et réponse des conversations importées.
2. **Support membre** : table feedback, admin inbox, réponse reliée, notifications et préférence email.
3. **Événements** : publication contrôlée, validation admin, lectures futures uniquement et états visibles.
4. **Observabilité V3** : compteurs activés, messages accessibles, feedback ouverts, événements futurs, erreurs runtime et smoke tests de relance.

Chaque tranche est testée, poussée directement sur `main`, déployée sur VPS2 et vérifiée par SQL et HTTP. Les données de production sont sauvegardées avant toute migration et aucun reset global n'est autorisé.
