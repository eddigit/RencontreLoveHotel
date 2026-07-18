# LHR Moderation Investigation Cockpit — Design

**Date:** 18 juillet 2026  
**Statut:** conception approuvée par Gilles  
**Périmètre:** administration et modération LHR

## Objectif

Transformer la file actuelle d’alertes en un véritable cockpit d’enquête humaine prioritaire permettant à LHR de détecter, comprendre, traiter et documenter les risques de prostitution, sollicitation commerciale sexuelle, harcèlement, fraude, danger ou suspicion de minorité.

Le dispositif doit permettre une décision objective à partir du profil et des conversations complètes, tout en conservant une séparation stricte entre les pouvoirs de l’administrateur et ceux des adhérents-modérateurs.

## Décisions validées

- L’administrateur peut consulter toutes les conversations d’un profil faisant l’objet d’un dossier pendant une phase renforcée de six mois à compter de la mise en production de cette fonctionnalité.
- Les conversations sont présentées sous forme de fils chronologiques lisibles, avec bulles gauche/droite, avatars, auteurs, dates, pièces jointes et messages déclencheurs surlignés.
- L’accès intégral est réservé aux administrateurs et chaque ouverture est automatiquement journalisée avec le dossier, l’administrateur, la ressource et l’heure.
- Les adhérents-modérateurs restent pseudonymisés et limités au contenu ciblé du dossier. Ils peuvent recommander une action, mais pas accéder aux coordonnées, exporter, transmettre, suspendre ou bannir définitivement.
- Les échanges avec le membre passent par un canal officiel de modération distinct des conversations privées.
- Les alertes d’un même profil sont regroupées dans un dossier principal sans perdre les sources individuelles.
- Les avatars apparaissent systématiquement dans toutes les surfaces administratives relatives aux profils, messages, conversations et dossiers. Un monogramme sert de repli.
- L’export ne transmet jamais automatiquement les données à un avocat ou aux autorités.

## File prioritaire

La file `/moderation` devient une vue regroupée par membre et triée ainsi :

1. suspicion de prostitution ou sollicitation sexuelle commerciale ;
2. danger ou suspicion de minorité ;
3. harcèlement ou menace ;
4. fraude ou usurpation ;
5. autres infractions à la charte.

Chaque carte affiche : avatar, nom ou pseudonyme selon le rôle, statut du compte, sévérité maximale, nombre d’alertes ouvertes, dernière activité, catégorie principale et état du dossier.

Les alertes sources restent consultables séparément dans le dossier afin de préserver leur provenance et leur chronologie.

## Cockpit administrateur

Le dossier administrateur contient cinq onglets.

### Vue d’ensemble

- avatar, identité, email, identifiant technique, ancienneté et état du compte ;
- niveau de risque et catégories ;
- nombre d’alertes, conversations, messages signalés, restrictions et décisions ;
- chronologie synthétique ;
- actions rapides.

### Profil

- profil communautaire complet ;
- photos et avatar ;
- présentation, localisation, âge déclaré et préférences utiles à l’analyse ;
- instantané probatoire du profil si un gel ou un export a été créé ;
- historique des statuts et sanctions.

### Conversations

- toutes les conversations du membre pendant la phase renforcée ;
- liste triée par score de risque puis activité récente ;
- avatar et nom des interlocuteurs ;
- nombre de messages et de signaux par conversation ;
- fil complet en bulles avec pièces jointes ;
- mise en évidence des messages sources et des mots ou catégories ayant contribué au signal ;
- aucun affichage sous forme d’une ligne administrative isolée par message.

### Canal officiel

- conversation de modération distincte et identifiable par le membre ;
- envoi réservé aux administrateurs ;
- modèles de rappel, demande d’explication, avertissement et notification de mesure ;
- historique immuable dans le dossier ;
- date d’envoi et accusé de lecture lorsque disponible.

### Preuves et historique

- alertes sources ;
- consultations et actions nominatives ;
- décisions humaines et contribution éventuelle de l’automatisation ;
- recours ;
- gels, exports et transmissions ;
- empreintes d’intégrité.

## Actions

Actions directes disponibles :

- voir le profil ;
- voir toutes les conversations ;
- écrire officiellement ;
- maintenir ou lever une restriction automatisée ;
- appliquer ou lever une restriction de messagerie ;
- envoyer un rappel ou avertissement ;
- suspendre temporairement ;
- bannir définitivement ;
- classer sans suite ;
- escalader juridiquement ;
- geler les preuves ;
- préparer ou télécharger un export ;
- enregistrer une transmission.

Les mesures sensibles demandent une confirmation et une motivation. La consultation des conversations ne demande pas de saisie supplémentaire : le dossier ouvert constitue la finalité, et l’accès est automatiquement tracé.

## Modèle probatoire

Un gel probatoire isole les éléments nécessaires au dossier et les soustrait à la purge automatique. Il conserve des instantanés structurés plutôt que de dépendre uniquement de données modifiables :

- identité et profil ;
- photos pertinentes ;
- alertes et signalements ;
- messages et pièces jointes retenus ;
- canal officiel ;
- décisions, recours et actions ;
- journal d’accès ;
- identifiants sources et empreintes SHA-256.

L’export administrateur est une archive ZIP contenant :

- `rapport.html`, imprimable en PDF par le navigateur ;
- `manifest.json` avec périmètre, sources, horodatage et empreintes ;
- `messages.csv` avec les conversations sélectionnées dans l’ordre chronologique ;
- `profil.json` et les médias probatoires disponibles ;
- `audit.csv` pour les accès, décisions, exports et transmissions.

Le registre de transmission conserve le destinataire, le type de destinataire, la référence de réquisition ou de signalement, le fondement communiqué, la date, l’administrateur, le périmètre et l’empreinte de l’archive. L’application ne transmet aucun fichier automatiquement.

## Données et sécurité

Les nouvelles structures sont additives et idempotentes :

- regroupement des dossiers par sujet ;
- canal officiel de modération ;
- événements de dossier ;
- instantanés probatoires ;
- exports et transmissions ;
- journal détaillé des consultations de profil, conversation et preuve ;
- date de fin du régime d’accès renforcé.

Les téléchargements sont générés côté serveur après `requireAdmin()`. Aucun chemin de stockage interne ou secret n’est exposé au client. Les exports sont temporaires et leur génération est journalisée.

## Régime renforcé de six mois

La date de début est enregistrée lors de l’activation en production. La date de fin est calculée à six mois. Avant l’échéance, un administrateur reçoit une alerte de réévaluation. Après l’échéance, l’accès intégral ne doit pas être prolongé silencieusement : une décision motivée doit maintenir le régime ou basculer vers l’accès ciblé.

## Critères d’acceptation

- Un clic depuis une alerte ouvre le dossier regroupé du membre.
- L’admin voit immédiatement l’avatar, le profil et les actions.
- L’admin peut ouvrir toutes les conversations et lire chaque fil comme une messagerie normale.
- Les messages déclencheurs sont visuellement identifiés dans leur contexte.
- L’admin peut envoyer un message officiel sans passer par une conversation personnelle.
- Les restrictions automatiques sont visibles et contrôlables.
- Un bannissement met effectivement le compte hors service et crée une décision motivée.
- Un gel empêche la purge des éléments du dossier.
- Un export contient les sources, messages, profil, médias disponibles, décisions, accès et empreintes.
- Toute consultation sensible, export ou transmission est attribuable à un administrateur.
- Les adhérents-modérateurs ne reçoivent jamais l’identité complète, toutes les conversations, les exports ni les pouvoirs administrateur.
- Les listes admin de profils et messages présentent toujours un avatar ou un monogramme.
- Les alertes répétées ne créent plus une file illisible de cartes identiques.

## Hors périmètre immédiat

- transmission automatique à la police, gendarmerie, PHAROS ou à un avocat ;
- analyse sémantique externe envoyant les conversations à un prestataire tiers ;
- modification du DNS, des comptes ou des mots de passe ;
- création d’une association.

