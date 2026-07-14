# Refonte de la landing page visiteur

## Objectif

La page d’accueil doit présenter Love Hôtel à une personne non connectée. Elle ne doit pas reprendre la sidebar de l’espace membre ni donner l’impression que le visiteur a déjà accès aux messages, matchs ou outils communautaires.

## Architecture de navigation

- La route `/` utilise une architecture visiteur dédiée, sans sidebar.
- Un header léger et responsive affiche le logo officiel, des ancres vers le concept, les hôtels, les expériences et la communauté, ainsi que les actions Connexion et Inscription.
- La sidebar complète reste réservée aux autres pages applicatives et à l’espace membre.
- L’administration conserve son architecture séparée.

## Hiérarchie éditoriale

### 1. Hero

- Promesse centrale : passer de la rencontre en ligne à des expériences réelles.
- Conserver les quatre visuels forts : jacuzzi, Sophia, événement communautaire et Rideaux Ouverts.
- Les appels à l’action principaux conduisent vers l’inscription et la découverte du concept.

### 2. Deux hôtels parisiens

- Mettre en avant Love Hôtel Pigalle et Love Hôtel Châtelet.
- Présenter les hôtels comme les lieux physiques où la communauté se retrouve.
- Supprimer toute référence au restaurant, aux bars ou à une offre qui n’existe plus.

### 3. Expériences

- Mettre en avant les apéros jacuzzi en petit groupe.
- Présenter Rideaux Ouverts comme une expérience consentie où certains membres peuvent s’exhiber derrière un rideau et d’autres observer depuis leur chambre.
- Conserver le speed dating comme exemple d’événement, sans en faire l’unique proposition.

### 4. Communauté créatrice d’événements

- Expliquer que chaque membre peut créer son propre événement.
- Illustrer les invitations, demandes d’apéros jacuzzi, rencontres à plusieurs et interactions autour des hôtels.
- Montrer que la plateforme organise le passage du virtuel au réel, tout en laissant la communauté proposer ses propres formats.

### 5. Pourquoi Love Hôtel

- Reprendre les bénéfices autour de la rencontre réelle, des lieux identifiés, de la liberté de création et du consentement.
- Terminer par un appel à rejoindre la communauté.

## Direction visuelle

- Conserver l’univers violet, rose et noir ainsi que les photographies existantes validées.
- Utiliser une mise en page pleine largeur, immersive et plus éditoriale que l’espace membre.
- Le logo doit être entièrement visible, sans recadrage.
- Le header devient compact sur mobile, avec les deux actions essentielles accessibles.
- Éviter tout débordement horizontal et toute duplication de navigation ou de footer.

## Comportement et limites

- Aucun changement fonctionnel n’est apporté à la messagerie, aux matchs, aux réservations ou à l’administration.
- Les liens vers des fonctions protégées continuent d’utiliser les règles d’authentification existantes.
- La refonte ne crée pas de fausse information commerciale : seuls Pigalle, Châtelet et les expériences décrites sont présentés.

## Vérification

- Tests de structure pour garantir l’absence de sidebar sur `/` et sa présence sur les pages applicatives.
- Tests de contenu pour Pigalle, Châtelet, événements communautaires, apéros jacuzzi et Rideaux Ouverts.
- Vérification TypeScript, compilation de production et contrôle visuel ordinateur/mobile.
- Après sauvegarde, déploiement VPS2 et Vercel, puis vérification du domaine public et des journaux.
