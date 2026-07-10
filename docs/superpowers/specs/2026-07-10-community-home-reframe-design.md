# Accueil communauté recentré — Design

**Date :** 10 juillet 2026  
**Projet :** Love Hotel Rencontre  
**Livraison :** directe sur `main`, puis déploiement du pod VPS2

## Objectif

Faire de l'accueil connecté une page de communauté active, lisible et rassurante. Le membre doit comprendre en quelques secondes combien la communauté compte de personnes, qui vient d'arriver et où l'activité se passe aujourd'hui.

## Positionnement retenu

Love Hotel Rencontre est présenté comme une communauté de rencontres qui permet de découvrir des profils, participer à des événements et échanger sur un mur commun. Les Love Rooms et la conciergerie restent des prolongements commerciaux de la rencontre, mais ne dominent pas le premier écran.

La landing publique ne consomme aucune donnée réelle de membres, de mur ou de présence. Elle peut présenter un teaser anonymisé et flouté du mur avec un appel à rejoindre la communauté.

## Hiérarchie de l'accueil connecté

L'ordre fonctionnel est fixe :

1. Identité de la communauté et compteurs réels.
2. Nouveaux membres.
3. Mur de la communauté.
4. Événements à venir.
5. Profils compatibles et matchs.
6. Membres en ligne.
7. Love Rooms et conciergerie.

La page doit conserver une lecture mobile prioritaire. Les deux premiers profils récents doivent être visibles dans la première séquence de consultation, avant le mur. La présence en ligne ne doit jamais être le signal principal lorsque le résultat est vide.

## Compteurs et données

- **Adhérents :** comptes actifs et non bannis dans `users`.
- **Nouvelles adhésions :** comptes actifs et non bannis dont `created_at` est dans les dernières 24 heures.
- **Profils visibles :** profils actifs, non bannis et autorisés par `user_profiles.display_profile`.
- **Sélection récente :** huit profils visibles affichés dans la grille, avec un libellé explicite indiquant qu'ils ne représentent pas toute la communauté.

Le chiffre d'adhérents est calculé côté serveur via `getCommunityMemberStats`, protégé par `requireCurrentUser`. Aucun zéro artificiel ne doit être affiché en cas d'échec de chargement : l'interface utilise un état de chargement neutre et un message de reprise.

## Contenu et interactions

### Nouveaux membres

Le titre est « Nouveaux membres ». Le sous-texte indique la fenêtre et la population, par exemple : « Les 8 derniers profils visibles sur 1 349 adhérents. » Le nombre de cartes affichées est distinct du nombre total d'adhérents.

Chaque carte est cliquable vers le profil, conserve l'avatar réel autorisé, et n'invente pas de présence ou de compatibilité lorsqu'une donnée manque.

### Mur

Le composant existant `CommunityWall` reste membre uniquement. Il accepte une publication texte, une image validée ou les deux, conserve les commentaires repliés et expose le signalement. Les contenus filtrés ou signalés restent soumis à la modération existante. Le mur est placé après la sélection des nouveaux membres et avant `online-now`.

Les surfaces utilisent le fond prune/noir existant et les accents rose, menthe et jaune. La famille de gris boueux `#3C3C3C`, `#333333` et équivalents ne doit pas apparaître dans les surfaces applicatives.

### Événements et offres

Les événements apparaissent après le mur comme occasions de rencontre collective. Les Love Rooms et la conciergerie sont des appels à l'action secondaires, placés après le contenu communautaire. Ils ne doivent pas pousser les membres en ligne au-dessus du mur ou des nouveaux membres.

### Présence

La section `online-now` n'affiche que les profils déclarés actifs par le système de présence. Quand elle est vide, elle affiche une phrase discrète et conserve un accès vers la messagerie sans compteur trompeur.

## Architecture de livraison

La première tranche reste limitée à l'accueil communautaire et à ses textes, compteurs, ordre des sections, états vides et surfaces visuelles. Les fichiers principaux sont `app/discover/page.tsx`, `components/community-wall.tsx`, `actions/user-actions.ts` et les tests UI/serveur correspondants. Les changements d'événements non commités présents dans `codex/lhr-events-fluidity` sont exclus de cette livraison.

La livraison suit le flux demandé par Gilles :

1. modifier directement le worktree de `main` ;
2. exécuter les tests, le lint et le build ;
3. pousser directement `main` ;
4. redéployer le pod VPS2 ;
5. vérifier la version, la santé du conteneur et les routes publiques/protégées.

## Vérification

Les tests doivent couvrir :

- la présence des compteurs adhérents et nouvelles adhésions ;
- la formulation distinguant les huit profils visibles du total ;
- l'ordre nouveaux membres → mur → présence ;
- l'absence des couleurs grises interdites dans les surfaces ;
- le maintien de la séparation entre landing publique et données réelles du mur ;
- le garde de session sur les données communautaires.

La mise en ligne est considérée réussie seulement lorsque le build est terminé, le conteneur est sain et `https://rencontrelovehotel.com/version.json` reflète le nouveau déploiement.
