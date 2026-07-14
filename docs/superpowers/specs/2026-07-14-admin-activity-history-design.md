# Historique d’activité admin depuis le lancement

## Objectif

Ajouter au tableau de bord administrateur un graphique historique qui permet de constater objectivement la reprise de l’activité depuis le début des données disponibles.

## Expérience administrateur

Le bloc « Activité depuis le lancement » apparaît dans la section prioritaire « Relance de la messagerie ». Il affiche un graphique unique avec quatre séries : messages entre membres, conversations actives, conversations créées et matchs acceptés.

Le graphique utilise deux axes verticaux : les messages sur l’axe gauche, les conversations et les matchs sur l’axe droit. Cette séparation évite que le volume des messages écrase visuellement les autres indicateurs. Les filtres Jour, Semaine et Mois changent le regroupement sans limiter l’historique.

Un résumé de reprise compare les 30 derniers jours complets aux 30 jours précédents. Il indique une reprise si le nombre de messages augmente de plus de 5 %, une baisse sous -5 %, et une activité stable entre les deux. Les valeurs absolues et le pourcentage restent visibles pour rendre le diagnostic vérifiable.

## Données et règles métier

Le début de l’historique est la première date disponible parmi les conversations, messages et matchs acceptés. L’historique ne mélange pas les conversations de service contenant un administrateur avec l’activité réelle entre membres.

Les périodes sans activité sont renvoyées avec des zéros afin que la courbe reste continue. Le regroupement utilise PostgreSQL `generate_series` et `DATE_TRUNC`. L’accès reste protégé par `requireAdmin()` dans l’action serveur.

La comparaison de reprise porte sur les messages entre membres, métrique la plus directe de l’usage réel de la messagerie. La journée en cours est incluse dans le graphique mais exclue de la comparaison entre fenêtres complètes afin d’éviter une fausse baisse en cours de journée.

## Architecture

L’action `getMessagingRecoveryHistory()` est ajoutée à `actions/messaging-recovery-actions.ts`. Elle renvoie la date de début, la série complète et le résumé de reprise. Le composant `AdminMessagingRecovery` charge les KPI courts et l’historique en parallèle, puis rend le nouveau graphique avec Recharts.

Aucune nouvelle dépendance n’est ajoutée. Les erreurs d’historique n’empêchent pas l’affichage des KPI existants : le graphique affiche son propre état d’erreur.

## Vérification

Les tests couvrent l’autorisation administrateur, le remplissage des périodes vides, l’absence de limite arbitraire à 90 jours, le calcul des fenêtres de 30 jours et les libellés/axes du graphique. La livraison exige les tests ciblés, la suite complète, le contrôle TypeScript, le build de production, la migration déjà présente et une vérification HTTP du domaine public après déploiement VPS2.
