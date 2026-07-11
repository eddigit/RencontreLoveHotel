# Stabilisation production LHR

## Objectif

Fermer la dette issue des migrations V1/V2 sans perdre de compte, message, photo,
relation ou événement, rendre chaque déploiement identifiable et mesurer les
parcours qui créent réellement de l'activité communautaire.

## Décisions

### Identités historiques

Les 23 groupes d'emails dupliqués seront traités comme une seule identité
fonctionnelle. La consolidation est transactionnelle et précédée d'un `pg_dump`.
Le compte principal est choisi par score d'activité : rôle administrateur,
mot de passe, onboarding, profil, messages, conversations, photos et relations.
Les données des autres comptes sont rattachées au principal avant leur archivage.
Les conflits de relations sont dédupliqués et les auto-relations supprimées.
Après contrôle à zéro doublon, un index unique sur `lower(email)` empêche toute
réapparition.

La première livraison fournit un audit et un mode simulation. L'application en
production n'exécute la consolidation qu'avec un drapeau explicite et une
sauvegarde récente confirmée. Les conversations dont l'autre compte n'existe
plus restent conservées et sont libellées comme historiques.

### Identification des déploiements

Le footer n'affiche plus un compteur figé. Chaque image calcule une révision
source déterministe lorsque Git n'est pas présent dans le contexte Docker. Le
libellé expose date, révision courte et numéro historique pour assurer la
traçabilité sans dépendre de Vercel.

### Mesure produit

Une table `product_activity_events` enregistre uniquement des événements métier
minimaux : recherche, profil consulté, demande de contact, match accepté,
conversation initiée, message envoyé, événement créé, participation et annonce
du mur. Aucun corps de message, email ou donnée intime n'est copié dans cette
table. Les écritures sont serveur, associées à l'utilisateur connecté et
consultables uniquement par un administrateur sous forme de volumes agrégés.

## Sécurité et erreurs

- Toutes les opérations de consolidation utilisent une transaction et des
  verrous sur les comptes concernés.
- Le mode simulation est la valeur par défaut.
- Toute anomalie annule intégralement un groupe sans toucher aux suivants.
- Les actions de consultation et d'agrégation exigent `requireAdmin()`.
- La télémétrie ne doit jamais bloquer le parcours membre en cas d'échec.

## Validation

- Tests unitaires des scores, conflits et gardes.
- Simulation sur la base de production après sauvegarde.
- Contrôles avant/après sur les volumes de messages, conversations, photos,
  événements et relations.
- Suite Vitest, typage, build et audit des dépendances.
- Smoke test du domaine public et des redirections privées après déploiement.
