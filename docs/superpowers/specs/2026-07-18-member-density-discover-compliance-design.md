# Densité de l’annuaire et rappel conformité dans Discover

**Date :** 18 juillet 2026  
**Projet :** Love Hotel Rencontre

## Objectif

Renforcer la perception d’une communauté active sur les écrans desktop en affichant cinq profils par ligne dans l’annuaire des membres, tout en rendant le rappel anti-prostitution visible dans la colonne gauche de Discover.

## Page Membres

- La grille affiche cinq cartes par ligne dès le breakpoint desktop `lg`.
- Les écrans plus petits conservent la présentation actuelle : une colonne sur mobile et deux colonnes sur tablette.
- Les cartes utilisent une photo carrée afin de réduire leur hauteur et leur empreinte visuelle.
- Les espacements, les tailles typographiques et les actions sont compactés sans supprimer le nom, l’âge, la ville, les badges, la biographie disponible ni l’accès à la messagerie.
- Le bouton principal peut employer le libellé court « Profil » afin de rester lisible dans une carte étroite.
- La pagination reste fixée à 24 profils par page ; la modification concerne uniquement la densité visuelle.

## Page Discover

- L’affiche anti-prostitution existante est réutilisée depuis `/compliance-communaute.png`.
- Elle apparaît dans la colonne gauche immédiatement après le widget « Rechercher des membres » et avant le widget « Bug ou idée ? ».
- Le visuel occupe toute la largeur disponible, conserve son ratio carré et utilise les mêmes arrondis et bordures que les autres widgets.
- Le visuel est cliquable et mène vers `/community-safety` avec un libellé accessible explicite.
- Sur les écrans où la colonne gauche n’est plus latérale, l’affiche conserve le même ordre dans le flux sans débordement horizontal.

## Vérification

- Un test de contrat vérifie les cinq colonnes desktop et la compacité des cartes de l’annuaire.
- Un test de contrat vérifie le chemin de l’image, le lien vers la charte et l’ordre entre les trois widgets de Discover.
- Le typecheck, les contrats critiques et le build de production doivent rester verts.
- Une vérification HTTP du déploiement Vercel confirme que l’image est servie.

## Hors périmètre

- Aucun changement de recherche, de classement ou de pagination des membres.
- Aucun changement du contenu juridique de l’affiche ou de la charte.
- Aucun changement de la sidebar globale du site.
