# Recette fonctionnelle de production — 19 juillet 2026

## Périmètre et preuves

- Runtime public : `https://rencontrelovehotel.com`, conteneur VPS `pod-lhr-app`.
- Branche : `main`.
- Commit final : `61b3662` pour le lot fonctionnel et les avatars, précédé des correctifs onboarding `084a796`.
- Base : PostgreSQL `pod-lhr-postgres`, migration additive `20260719_onboarding_matching_preferences.sql` appliquée après sauvegarde de `user_profiles`.
- Comptes : deux comptes synthétiques dédiés à la recette. Aucun mot de passe ni contenu privé d’adhérent n’est consigné ici.
- Contrôle automatisé final : 107 fichiers, 366 tests, TypeScript et build Next.js réussis.

## Résultats

| Domaine | Statut | Résultat observé |
|---|---|---|
| Pages publiques | PASS | Accueil, concept, sécurité, événements, Love Rooms, tarifs, confidentialité, conditions, connexion et inscription chargent sans erreur fatale. |
| Inscription par email | PASS | Création et connexion automatique d’un compte synthétique réussies ; consentements obligatoires et erreur de doublon couverts. |
| Google | PARTIAL | Boutons présents sur connexion et inscription, configuration chargée et connexions Google visibles dans l’audit admin. Le consentement OAuth externe n’a pas été rejoué automatiquement pendant cette passe. |
| Onboarding identité | FIXED + PASS | Sélecteur d’âge natif, date mise à jour à la saisie, diagnostic des champs manquants ; progression réelle vers l’étape 2 validée en production. |
| Onboarding photo | PASS | Étape 2 visible, recommandation forte, avatar natif, formats JPG/PNG/WebP et limite 8 Mo explicités, poursuite sans photo opérationnelle. |
| Onboarding relationnel | PASS | Profils recherchés, intentions, BDSM et univers visibles ; `Sans BDSM` désélectionne bien `Dominant·e` ; bouton final atteint. |
| Persistance des nouveaux critères | PARTIAL | Migration, service d’upsert, lecture et tests automatisés réussis. La validation finale n’a pas été déclenchée sur un compte déjà configuré afin de ne pas écraser ses préférences. |
| Avatar personnel | FIXED + PASS | Upload avatar authentifié supérieur à 1 Mo réussi lors de la recette, session rafraîchie et photo conservée après navigation. |
| Galerie photo | PASS | Upload galerie authentifié réussi ; formats et taille maximale affichés. |
| Avatars natifs | FIXED + PASS | Homme, femme et couple centralisés ; sidebar, header, messagerie et admin n’utilisent plus les anciens visuels génériques. Une URL cassée retombe sur l’image native, pas sur des initiales. |
| Annuaire membres | FIXED + PASS | Route et recherche chargées, biographies absentes non remplacées par un texte inventé, grille desktop configurée à cinq profils. |
| Priorité photo | PASS | Classement testé : vraie photo avant avatar natif, puis mise en avant éditoriale et compatibilité. |
| Matching | FIXED + PASS | Ciblage mutuel, intentions, orientation, BDSM et intérêts intégrés au score ; anciens profils sans critères restent permissifs. Demande et acceptation de match réussies en production. |
| Messagerie | FIXED + PASS | Conversation créée, fil chronologique lisible, message bénin envoyé. Numéro/téléphone bloqué sans persistance avec explication visible. |
| Mur communautaire | PASS | Publication synthétique créée puis supprimée ; aucun artefact restant. |
| Événements | PARTIAL | Liste et formulaires chargent. La saisie automatisée du contrôle natif `datetime-local` n’a pas permis une création complète ; aucune donnée test n’a été laissée. |
| KPI admin | FIXED + PASS | Les compteurs PostgreSQL texte sont convertis en nombres. Ventilation observée : 840 profils, pourcentages cohérents. Jour, semaine et mois produisent des chiffres différents. |
| Utilisateurs admin | FIXED + PASS | Avatar affiché sur chaque carte ; les photos cassées utilisent l’avatar natif. |
| Messages admin | PASS | 351 conversations lors de la passe, recherche synthétique et fil chronologique ouverts. |
| Modération prioritaire | PASS | Alertes de coordonnées externes groupées, profil et conversations accessibles avec justification journalisée. |
| Message officiel | PASS | Message officiel synthétique envoyé depuis le dossier de modération avec confirmation. |
| Export de preuve | PASS | Endpoint d’export du dossier de modération présent et protégé. Le téléchargement n’a pas été conservé localement. |
| Santé production | PASS | Conteneur `healthy`, accueil HTTP 200 et démarrage Next.js sans erreur applicative persistante après le dernier déploiement. |

## Nettoyage et réserves

- Le rôle administrateur temporaire du compte synthétique a été révoqué et vérifié en base (`user`).
- Le post de mur temporaire a été supprimé ; aucun événement temporaire n’a été créé.
- Les comptes synthétiques et la conversation explicitement étiquetée restent disponibles pour les futures recettes reproductibles.
- Deux vérifications restent partielles : consentement OAuth Google entièrement rejoué et création d’événement via le champ natif de date/heure.
- GitHub signale un backlog Dependabot existant distinct de ce lot fonctionnel ; il doit faire l’objet d’un audit dépendances dédié avant correction pour éviter les mises à niveau cassantes.
