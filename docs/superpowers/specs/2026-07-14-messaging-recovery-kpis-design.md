# KPI de relance de la messagerie — conception

## Objectif

Donner à l’administration LHR une lecture immédiate et fiable de la reprise des rencontres et de la messagerie, sans mélanger les échanges entre membres avec les conversations de service (administration et conciergerie).

## Périmètre fonctionnel

Le dashboard `/admin` reçoit un bloc prioritaire « Relance de la messagerie » avec :

- conversations membres créées ;
- conversations membres démarrées, définies comme une conversation recevant son premier message pendant la période ;
- messages envoyés entre membres ;
- conversations membres actives, définies comme ayant au moins un message pendant la période ;
- conversations ayant reçu une réponse, définies comme ayant au moins deux expéditeurs distincts ;
- taux de réponse : conversations ayant reçu une réponse / conversations démarrées ;
- nouveaux matchs acceptés ;
- activité admin/conciergerie affichée séparément pour ne pas gonfler les indicateurs de rencontre.

Les cartes synthétiques portent sur aujourd’hui. Une série historique couvre les 30 derniers jours et propose les regroupements jour, semaine et mois. Les périodes sans activité sont présentes avec une valeur à zéro. Une comparaison avec la période précédente de même durée indique l’évolution de chaque KPI principal.

## Règles de classification

Une conversation « membres » possède exactement deux participants et aucun participant avec le rôle `admin`. Toute conversation comportant un administrateur est classée « service ». Cette classification couvre les échanges de conciergerie qui ouvrent un fil avec l’administration.

Une conversation est « créée » selon `conversations.created_at`. Elle est « démarrée » à la date de son premier message, indépendamment de sa date de création. Elle est « active » pour chaque période durant laquelle au moins un message est envoyé.

Une conversation « avec réponse » contient au moins deux expéditeurs distincts. Cette définition mesure une interaction réelle sans analyser le contenu privé des messages.

## Fiabilité des matchs

La table `user_matches` reçoit une colonne nullable `accepted_at`. La migration initialise les matchs déjà acceptés avec `updated_at`, meilleure approximation historique disponible. Les chemins d’acceptation renseignent ensuite `accepted_at = CURRENT_TIMESTAMP`. Une nouvelle demande ou un refus remet cette valeur à `NULL`.

Les KPI utilisent `accepted_at` et non `created_at`, afin de compter le jour où le match devient réellement utilisable.

## Architecture

Une action serveur admin dédiée charge les KPI avec `requireAdmin()` avant toute requête. Elle accepte une granularité contrôlée (`day`, `week`, `month`) et une fenêtre bornée. Les paramètres ne sont jamais injectés directement dans le SQL hors expressions choisies dans une liste fermée.

Le calcul renvoie :

- un résumé du jour ;
- les valeurs de la période précédente ;
- une série temporelle continue ;
- une synthèse séparée des conversations de service.

Le composant React du bloc gère chargement, erreur et actualisation. Il réutilise les cartes et graphiques déjà employés dans l’administration, avec des libellés métier explicites.

## Présentation

Le bloc est placé avant les KPI généraux existants pour rendre la reprise immédiatement visible. Il comprend :

1. une rangée de cartes : conversations créées, conversations démarrées, messages, matchs acceptés ;
2. une seconde rangée : conversations actives, conversations avec réponse, taux de réponse, activité de service ;
3. un graphique quotidien combinant conversations démarrées, messages et matchs acceptés ;
4. un sélecteur jour/semaine/mois et une légende claire.

Les variations comparent la fenêtre courante à la fenêtre précédente et évitent toute conclusion positive ou négative lorsqu’aucune base de comparaison n’existe.

## Erreurs et confidentialité

Le dashboard ne montre aucun contenu de message ni identité de membre. Une erreur de requête produit un état d’erreur visible au lieu de présenter silencieusement des zéros comme des données réelles. Les KPI restent réservés aux administrateurs.

## Tests

Les tests couvrent :

- le contrôle administrateur avant accès aux KPI ;
- la distinction membres/service ;
- le premier message d’une conversation ;
- la détection d’une réponse par deux expéditeurs ;
- le calcul du taux de réponse et des variations ;
- le remplissage des jours sans activité ;
- l’utilisation de `accepted_at` et sa mise à jour sur tous les chemins d’acceptation ;
- le rendu des libellés essentiels du bloc admin ;
- le comportement d’erreur.

Les vérifications finales sont les tests ciblés, la suite Vitest, le typecheck et le build Next.js.

## Hors périmètre

- analyse du contenu ou de la qualité sémantique des messages ;
- exposition de statistiques individuelles ;
- export CSV ;
- modification ou déploiement de la base de production ;
- nouvelle page analytics distincte.
