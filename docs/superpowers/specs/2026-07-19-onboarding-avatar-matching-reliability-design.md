# Onboarding, avatars et matching fiable — conception

Date : 19 juillet 2026  
Projet : Love Hotel Rencontre (LHR)  
Branche canonique : `main`

## Objectif

Rendre le premier parcours membre fiable et cohérent : inscription, onboarding, ajout d’une première photo, avatar natif homme/femme/couple en l’absence de photo, critères relationnels explicites et matching réellement fondé sur une compatibilité mutuelle. La livraison ne pourra être déclarée réussie qu’après des tests automatisés et des parcours utilisateurs authentifiés sur le runtime public.

## Constat vérifié

- Les trois avatars natifs existent : `default-member-man.jpg`, `default-member-woman.jpg` et `default-member-couple.jpg`.
- Leur résolution est centralisée dans `defaultMemberImage`, mais plusieurs écrans utilisent encore des images génériques différentes.
- L’éditeur du profil envoie l’avatar par une Server Action soumise à la limite Next.js de 1 Mo.
- L’interface et la validation des routes photo annoncent une limite de 8 Mo.
- La tentative utilisateur échoue avant le stockage avec le journal serveur `413 — Body exceeded 1 MB limit`.
- Une route HTTP authentifiée existe déjà pour la galerie, mais elle n’est pas utilisée pour l’avatar principal.
- L’onboarding décrit l’identité, l’orientation et quelques activités, sans représenter précisément les profils recherchés, les intentions relationnelles multiples ni les affinités BDSM.
- Le calcul actuel pondère orientation, événements et types de rencontre, mais ne vérifie pas une recherche mutuelle explicite.

## Principes validés

1. La première photo personnelle est fortement recommandée, jamais obligatoire.
2. Le refus ou le report d’une photo ne bloque pas l’accès à la communauté.
3. Sans photo personnelle, un avatar natif cohérent avec le profil homme, femme ou couple est affiché partout.
4. L’avatar natif reste un fallback calculé ; il n’est pas enregistré comme une vraie photo dans `users.avatar` ou `photos`.
5. Seule une photo réellement ajoutée par le membre compte pour la complétude et la priorité accordée aux profils avec photo.
6. Un membre peut rechercher plusieurs catégories simultanément : hommes, femmes et couples.
7. Orientation, profils recherchés, intentions relationnelles et affinités BDSM sont des axes séparés.
8. Les anciens profils sans nouveaux critères restent visibles et compatibles par défaut jusqu’à leur mise à jour.

## Parcours d’onboarding

L’onboarding passe à cinq étapes cohérentes :

1. **Identité du profil** : homme seul, femme seule ou couple ; genre/composition pertinente ; date de naissance et orientation.
2. **Photo principale** : aperçu de l’avatar natif correspondant, choix d’une photo personnelle, progression d’envoi, message de succès ou erreur explicite, et action secondaire « Continuer avec l’avatar proposé ».
3. **Recherche relationnelle** : profils recherchés en choix multiples et intentions recherchées en choix multiples.
4. **Affinités et univers** : centres d’intérêt, activités Love Hotel, rideaux ouverts, libertinage et affinités BDSM facultatives.
5. **Récapitulatif** : résumé des choix, possibilité de revenir en arrière et validation finale.

La photo doit être ajoutée dès sa sélection, par la même route que l’éditeur de profil. L’échec de l’envoi ne doit jamais effacer les autres réponses de l’onboarding.

## Modèle relationnel

### Identité et orientation

Les champs existants `status`, `gender` et `orientation` sont conservés pour compatibilité. Les valeurs affichées sont formulées clairement : hétéro, bi, gay ou lesbienne selon le profil. Le compte couple conserve son identité de couple ; sa composition ne doit pas être déduite d’un genre individuel incohérent.

Pour un couple, `couple_composition` accepte `mixed`, `male_male`, `female_female` ou `other`. Pour un profil individuel, ce champ reste vide. Le champ `gender` reste `male` ou `female` pour un profil individuel et devient `couple` pour un compte couple.

### Profils recherchés

Un nouveau champ en tableau stocke zéro à trois valeurs contrôlées :

- `male`
- `female`
- `couple`

Une liste vide signifie « préférence non renseignée » pour les anciens profils et ne provoque aucun filtrage.

### Intentions relationnelles

Un tableau contrôlé autorise plusieurs choix :

- relation sérieuse ;
- relation régulière ;
- rencontre occasionnelle ;
- relation libertine ;
- relation amicale.

### Affinités BDSM

Un tableau facultatif autorise :

- découverte ;
- dominant·e ;
- soumis·e ;
- switch ;
- sans BDSM.

« Sans BDSM » est exclusif des autres valeurs. L’absence de réponse reste neutre et ne pénalise pas le score.

## Calcul de compatibilité

Le calcul reste borné de 0 à 100 et devient explicable :

- compatibilité mutuelle des profils recherchés : 30 points ;
- intentions relationnelles communes : 25 points ;
- compatibilité d’orientation : 20 points ;
- affinités BDSM compatibles : 15 points ;
- centres d’intérêt et univers Love Hotel communs : 10 points.

Quand les deux membres ont renseigné les profils recherchés, l’absence de compatibilité mutuelle exclut la recommandation automatique. Quand un profil ancien ne les a pas renseignés, le comportement reste permissif. Les profils avec une vraie photo sont départagés avant ceux qui n’ont qu’un avatar natif, sans masquer les profils natifs.

La compatibilité BDSM récompense les couples de rôles complémentaires dominant·e/soumis·e, les profils switch compatibles avec dominant·e, soumis·e ou switch, et les intérêts communs de découverte. « Sans BDSM » ne rapporte des points qu’avec « Sans BDSM ». Une préférence BDSM incompatible ne masque pas un profil ; elle ne rapporte simplement aucun point BDSM.

L’ordre des recommandations éligibles est : vraie photo en premier, statut éditorial `featured`, puis score décroissant. Ce classement conserve la priorité produit déjà demandée pour les membres ayant réellement ajouté une photo.

L’interface doit expliquer les principaux facteurs d’un score : profils recherchés compatibles, intentions communes, orientation, BDSM et intérêts.

## Architecture photo

Une route authentifiée unique prend en charge l’avatar principal. Elle :

1. vérifie la session et associe toujours l’écriture au membre connecté ;
2. valide une taille maximale de 8 Mo ;
3. accepte uniquement JPEG, PNG et WebP ;
4. vérifie la signature binaire et ne fait pas confiance à l’extension ;
5. choisit elle-même l’extension et le chemin Blob ;
6. enregistre l’URL dans `users.avatar` uniquement après réussite du stockage ;
7. retourne une erreur structurée et visible ;
8. ne transmet jamais le fichier par une Server Action limitée à 1 Mo.

Le code de validation existant est partagé par l’avatar et la galerie. Les anciennes Server Actions d’upload dupliquées sont retirées lorsqu’elles ne sont plus appelées.

## Résolution globale des avatars

`defaultMemberImage` devient la seule règle pour toutes les représentations de membres : profil personnel, fiche publique, annuaire, Discover, matching, messagerie, en-tête, sidebar, mur communautaire, notifications, modération et administration.

Ordre de résolution :

1. photo personnelle enregistrée ;
2. photo principale de galerie lorsque la surface l’autorise ;
3. avatar natif selon `status` puis `gender` ;
4. avatar couple uniquement lorsque l’identité n’est pas encore renseignée.

Les images de chat, forêt, logo et placeholders génériques ne doivent plus représenter un membre.

## Gestion des erreurs

- La sélection d’un fichier trop lourd affiche « Photo trop lourde : maximum 8 Mo » avant ou après la réponse serveur, sans bloquer le formulaire.
- Un format non autorisé ou un fichier corrompu affiche une explication précise.
- Une erreur Blob ou base affiche une erreur réessayable et conserve les données saisies.
- Un succès remplace immédiatement l’aperçu et marque visuellement « Photo enregistrée ».
- Le bouton est désactivé pendant l’envoi pour empêcher les doublons.
- Les erreurs techniques restent journalisées sans exposer de secret ni le contenu du fichier.

## Migration et compatibilité

Une migration additive ajoute à `user_profiles` :

- `couple_composition TEXT NULL` limité à `mixed`, `male_male`, `female_female` ou `other` ;
- `seeking_profile_types TEXT[] NOT NULL DEFAULT '{}'` limité à `male`, `female` et `couple` ;
- `relationship_intents TEXT[] NOT NULL DEFAULT '{}'` limité à `serious`, `regular`, `casual`, `libertine` et `friendship` ;
- `bdsm_roles TEXT[] NOT NULL DEFAULT '{}'` limité à `discovery`, `dominant`, `submissive`, `switch` et `none`.

Une contrainte interdit `none` avec une autre valeur BDSM. La migration ne réécrit pas les profils existants et ne modifie aucune photo actuelle. Les services de lecture acceptent les tableaux vides pendant le déploiement progressif. Le rollback applicatif reste possible sans perte des données existantes.

## Stratégie de tests

### Tests automatisés

- unité : résolution homme/femme/couple, vraie photo prioritaire et absence de faux positif « vraie photo » ;
- unité : validation JPEG/PNG/WebP, signature, limite 8 Mo et erreurs ;
- route : refus anonyme, avatar associé au compte connecté, succès Blob, échec Blob et échec DB ;
- onboarding : étape photo facultative, progression, report avec avatar natif et conservation des réponses après erreur ;
- migration : contraintes et valeurs par défaut ;
- matching : recherches multiples, compatibilité mutuelle, intentions, BDSM, anciens profils et classement avec vraie photo ;
- intégrité UI : aucune surface membre ne réintroduit un placeholder générique interdit ;
- non-régression : suite critique, suite complète, TypeScript et build Next.js.

### Tests utilisateurs authentifiés

Les tests utilisent des comptes de contrôle dédiés, jamais le mot de passe ou la photo d’un adhérent réel :

1. inscription classique complète ;
2. inscription Google complète ;
3. onboarding homme sans photo et avatar homme sur toutes les surfaces ;
4. onboarding femme sans photo et avatar femme ;
5. onboarding couple sans photo et avatar couple ;
6. envoi d’un JPEG valide supérieur à 1 Mo et inférieur à 8 Mo ;
7. remplacement de l’avatar depuis le profil ;
8. refus d’un fichier trop lourd, corrompu ou non-image avec message visible ;
9. paramétrage de plusieurs profils et intentions recherchés ;
10. vérification du classement matching et de l’explication du score ;
11. navigation Discover → fiche → demande de match → acceptation → conversation ;
12. contrôle des avatars dans la messagerie, l’administration et la modération.

Chaque parcours est consigné dans un rapport avec : date et heure, commit, URL/runtime, compte de contrôle anonymisé, étapes exécutées, résultat attendu, résultat observé, capture ou signal DOM utile, contrôle base et extrait de journal expurgé. Un échec reste ouvert dans le rapport jusqu’à correction et nouvelle exécution complète.

### Validation de production

La livraison suit cet ordre : tests automatisés complets, build, déploiement du runtime public, attente de santé, puis parcours utilisateurs authentifiés sur `rencontrelovehotel.com`. La base est contrôlée avant et après : compte de test unique, avatar attendu, nouvelles préférences attendues et absence de doublons. Les journaux sont inspectés après chaque parcours.

Une fonctionnalité n’est déclarée « validée » que si son parcours réel a été exécuté. Les éléments non testables faute d’authentification ou de consentement explicite sont signalés comme non vérifiés, jamais comme fonctionnels.

## Critères d’acceptation

- Une photo comprise entre 1 et 8 Mo peut devenir l’avatar depuis le profil public en production.
- L’onboarding recommande clairement la photo sans la rendre obligatoire.
- Chaque profil sans photo affiche partout le bon avatar homme/femme/couple.
- Les placeholders génériques ne représentent plus les membres.
- Les nouveaux critères relationnels sont enregistrés, éditables et intégrés au score.
- Un ancien profil sans nouveaux critères reste visible.
- L’ensemble des tests automatisés passe.
- Les douze parcours utilisateurs sont consignés avec résultat, environnement et preuve observable.
- Aucun statut global « tout est OK » n’est donné si un parcours critique reste non vérifié.
