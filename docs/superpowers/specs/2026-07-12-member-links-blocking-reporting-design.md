# Liens membres, blocage personnel et signalement

Date : 12 juillet 2026

## Objectif

Faciliter la mise en relation en rendant chaque identité de membre cliquable vers son profil, tout en donnant aux adhérents deux outils de sécurité distincts : bloquer personnellement un membre et signaler un profil à la modération.

## Principes produit

- Un blocage est une décision personnelle entre deux comptes. Il ne suspend pas le compte bloqué pour le reste de la communauté.
- Un signalement demande un arbitrage administratif. Il ne bannit jamais automatiquement un compte.
- Seul un administrateur peut suspendre ou bannir un compte pour toute la plateforme.
- Les termes `compte suspendu` ou `compte banni` restent réservés aux décisions administratives. L'interface membre utilise `membre bloqué`.
- Les futures conditions générales préciseront les motifs et sanctions. Cette version utilise déjà des motifs explicites de sécurité et de respect.

## Liens vers les profils

L'avatar et le nom d'un membre ouvrent `/profile/{userId}` dans les surfaces relationnelles principales :

- liste et détail des conversations ;
- matchs reçus, envoyés et acceptés ;
- auteurs des annonces et commentaires du mur ;
- créateurs et participants visibles des événements ;
- notifications qui concernent un membre.

Les conversations administratives conservent leur destination de support et ne sont pas présentées comme un profil membre ordinaire.

## Blocage personnel

Une table `user_blocks` conserve `blocker_id`, `blocked_id`, `created_at`, avec une paire unique et l'interdiction de se bloquer soi-même.

Depuis le profil ou la conversation, le membre peut choisir `Bloquer ce membre`. Une confirmation explique les effets. Seul l'auteur du blocage peut ensuite débloquer.

Effets immédiats dans les deux sens :

- aucun nouveau message ou média ;
- aucune nouvelle demande de match, acceptation ou invitation relationnelle ;
- retrait des suggestions, recherches, listes de membres en ligne et contenus relationnels personnalisés l'un pour l'autre ;
- conservation de l'ancienne conversation en lecture seule ;
- aucun effet sur la visibilité du membre auprès des autres adhérents.

Les contrôles sont effectués côté serveur dans les actions de messagerie, de match et de recherche. Masquer seulement les boutons dans l'interface n'est pas suffisant.

## Signalement d'un profil

Une table `profile_reports` conserve le déclarant, le profil signalé, un motif, un commentaire facultatif, le statut de traitement, les informations d'arbitrage et les dates.

Motifs initiaux :

- comportement irrespectueux ou harcèlement ;
- faux profil ou usurpation ;
- contenu inapproprié ;
- sollicitation commerciale ou spam ;
- comportement dangereux ;
- non-respect des règles de la communauté ;
- autre.

Un signalement crée une entrée dans la modération existante, avec lien vers le profil, identité du déclarant et contexte disponible. Une notification administrative est envoyée à l'adresse opérationnelle configurée, actuellement `loolyyb@gmail.com` via la configuration serveur.

Plusieurs signalements distincts augmentent la priorité de la file, sans masquer ni bannir automatiquement le profil. L'administrateur peut classer, avertir, suspendre ou bannir selon son enquête.

## Interface

Dans une conversation membre :

- avatar et pseudo cliquables ;
- commande visible `Voir le profil` ;
- menu de sécurité avec `Signaler ce profil` et `Bloquer ce membre` ;
- après blocage, compositeur désactivé et message clair `Conversation en lecture seule` ;
- action `Débloquer ce membre` uniquement pour l'auteur du blocage.

Sur un profil, les deux commandes apparaissent dans la zone d'actions sans concurrencer l'action principale de match ou de message. Le signalement ouvre une fenêtre avec motif obligatoire et commentaire facultatif. Le blocage demande une confirmation distincte.

## Sécurité et confidentialité

- Toutes les actions exigent la session courante et ignorent tout identifiant d'auteur fourni par le navigateur.
- Les requêtes de lecture excluent les relations bloquées dans les deux directions.
- Le profil bloqué n'est pas informé de l'identité du bloqueur ni du contenu d'un signalement.
- Un membre ne peut pas signaler son propre profil.
- Les signalements répétés identiques d'un même déclarant vers le même profil sont regroupés afin d'éviter le spam.
- Les actions administratives de traitement exigent `requireAdmin()`.

## Erreurs et compatibilité

- Les conversations historiques importées restent lisibles après blocage, mais aucun nouvel envoi n'est accepté.
- Si une relation est bloquée pendant qu'une conversation est ouverte, le prochain envoi est refusé côté serveur et l'interface passe en lecture seule au rafraîchissement.
- Les anciennes notifications et conversations ne sont pas supprimées.
- Les comptes déjà suspendus par l'administration restent gérés par le mécanisme d'authentification existant, indépendamment de `user_blocks`.

## Tests requis

- création, unicité, suppression et interdiction de l'auto-blocage ;
- interdiction serveur d'envoyer, créer une conversation, demander ou accepter un match après blocage ;
- filtrage réciproque des annuaires et suggestions sans impact sur les autres membres ;
- conversation historique conservée en lecture seule ;
- création d'un signalement avec motif obligatoire et file de modération ;
- absence de bannissement automatique, y compris après plusieurs déclarants ;
- gardes de session et `requireAdmin()` ;
- liens de profil présents dans la messagerie, les matchs, le mur et les événements ;
- vérification mobile et desktop du profil, de la conversation et des fenêtres de confirmation.

## Hors périmètre

- rédaction juridique complète des conditions générales ;
- score automatique de dangerosité ;
- bannissement entièrement automatisé ;
- communication au membre signalé avant décision administrative.
