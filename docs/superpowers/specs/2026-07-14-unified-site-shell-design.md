# Architecture visuelle unifiée hors administration

## Objectif

Toutes les pages hors `/admin` utilisent une seule architecture visuelle : logo officiel entier, sidebar desktop, barre supérieure mobile, navigation cohérente et zone de contenu alignée. Aucune page ne doit pouvoir masquer ou recréer sa propre navigation principale.

## Diagnostic actuel

Le projet mélange `MainLayout`, `Header`, `LandingHeader`, `LhrV2Shell`, `MobileNavigation` et plusieurs pages sans layout. Le composant `Header` se masque explicitement sur de nombreuses routes, tandis que `LhrV2Shell` n’est présent que sur une partie des pages membres. Certains rendus du logo utilisent `object-cover` dans un conteneur carré et coupent donc l’image verticale officielle.

## Architecture retenue

`app/layout.tsx` place les pages dans un nouveau composant client `SiteShell`. Ce point d’entrée unique garantit que toute route hors administration reçoit la même coque, y compris les pages qui n’utilisent actuellement aucun layout local.

`SiteShell` lit le chemin courant et l’utilisateur depuis `useAuth()` :

- les routes `/admin` sont rendues sans la coque publique et conservent leur architecture actuelle ;
- toutes les autres routes reçoivent la sidebar desktop et la barre mobile communes ;
- la navigation membre affiche Découvrir, Messages, Matchs, Événements, Conciergerie et Profil ;
- la navigation visiteur affiche Accueil, Concept, Rencontres, Événements, Love Rooms et Premium ;
- les actions de connexion, inscription, notifications, profil et déconnexion s’adaptent à la session.

La zone centrale reste pleine largeur dans la coque et accepte les designs existants. Le composant global ne réécrit pas le contenu métier des pages.

## Logo

Un composant `BrandLogo` devient l’unique rendu de marque dans la navigation. Il utilise `/lhr-official-logo.png`, un conteneur au ratio naturel `1162/1354`, `object-contain` et un fond sombre. Aucun emplacement de navigation n’utilise `object-cover` pour le logo.

## Migration des anciens layouts

`MainLayout` devient un wrapper de contenu et conserve uniquement le footer lorsque nécessaire. Il ne rend plus de header public. `LhrV2Shell` devient un cadre de contenu avec titre, sous-titre et action, sans sidebar propre. `LandingHeader` est retiré des pages de présentation car la navigation globale le remplace. Les instances locales de `MobileNavigation` sont supprimées pour éviter les doublons.

Cette migration centralisée évite de modifier la logique métier de chaque page tout en couvrant automatiquement les pages oubliées.

## Responsive et accessibilité

À partir de `lg`, la sidebar reste visible et fixe dans la grille. Sous `lg`, une barre supérieure affiche le logo complet, le titre du site et un bouton ouvrant un tiroir de navigation. Les liens actifs utilisent `aria-current="page"`. Le contenu conserve un espace inférieur suffisant pour les contrôles mobiles et aucun logo ne dépasse de son conteneur.

## Validation

Des tests statiques vérifient le branchement global, l’exclusion admin, les deux navigations, le logo en `object-contain` et l’absence de navigation dupliquée dans les layouts historiques. La suite complète, TypeScript et le build Next.js doivent passer.

La vérification visuelle couvre au minimum `/`, `/events`, une fiche événement, `/love-rooms`, `/discover`, `/messages`, `/matches`, `/profile`, `/login`, `/register` et une page `/admin`. Après sauvegarde, la version est déployée sur VPS2 et Vercel puis contrôlée sur `rencontrelovehotel.com` sans erreur 5xx.
