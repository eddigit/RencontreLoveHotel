# LHR Compliance Legal & Safety Hardening — Design

Date : 18 juillet 2026  
Statut : approuvé par le porteur du projet  
Référence : programme Compliance transmis le 18 juillet 2026

## Objectif

Transformer la conformité LHR en architecture produit vérifiable : documents juridiques versionnés, consentements distincts, prévention des échanges commerciaux interdits, modération proportionnée, accès ciblé aux conversations, preuves intègres, confidentialité, conservation et activation contrôlée.

Le système ne déclarera jamais LHR « juridiquement conforme ». Les textes définitifs, l’identité affichée, les durées, les bases légales et les procédures externes resteront soumis à validation avocat/DPO avant activation.

## Décisions validées

1. La surveillance anti-prostitution renforcée dure six mois, mais ne donne aucun droit général de parcourir les conversations.
2. Une conversation privée n’est consultable que dans un dossier actif, pour une cible autorisée, avec un motif explicite et un accès nominativement journalisé.
3. Les membres communiquent exclusivement dans LHR : téléphone, email, messageries externes, invitations, identifiants sociaux de contact et identifiants de paiement sont bloqués avant enregistrement.
4. Un blocage de contenu ne vaut jamais bannissement. Les répétitions et combinaisons commerciales créent une alerte ; les sanctions graves restent humaines.
5. Les canaux officiels LHR/hôtel sont séparés et autorisés par le serveur, jamais par une simple chaîne de texte.
6. Toutes les nouvelles fonctions Compliance sont désactivées par défaut et activées par lots après contrôles.
7. Aucun consentement historique n’est inventé à partir des profils ou anciennes cases.

## Approche retenue

### Alternatives écartées

- **Masquage automatique des coordonnées** : altère le message et rend la preuve ambiguë.
- **Envoi puis revue** : expose déjà la coordonnée au destinataire.
- **Autorisation après un seuil de confiance** : contredit l’objectif de garder les échanges dans LHR et crée une règle difficile à expliquer.

### Solution

Le serveur applique une politique commune avant toute écriture de contenu membre. Le client peut afficher un retour immédiat, mais seule la validation serveur fait foi. Le contenu bloqué n’est pas ajouté à la table métier. Un événement de sécurité minimal conserve les règles déclenchées, un HMAC du contenu normalisé et un extrait masqué ; aucun numéro ou email complet ne va dans les logs ou notifications.

## Découpage des sous-systèmes

### 1. Socle de configuration et feature flags

Responsabilités :

- lire les variables juridiques sans exposer de chaîne vide ;
- calculer l’état de préparation juridique ;
- fournir des flags désactivés par défaut ;
- empêcher paiement et publication juridique si la configuration essentielle manque ;
- afficher les erreurs uniquement dans l’administration.

Unités prévues :

- `config/compliance.ts` : lecture et validation des flags ;
- `lib/legal-entity-config.ts` : identité et contacts configurables ;
- `components/admin/compliance-readiness.tsx` : état sans secret ;
- `.env.compliance.example` : noms de variables et valeurs fictives.

### 2. Documents juridiques et acceptations

Responsabilités :

- charger les sources MDX et leur frontmatter ;
- synchroniser les métadonnées et hashes en base ;
- publier uniquement une version validée par un rôle autorisé ;
- présenter uniquement les versions publiées à l’acceptation ;
- conserver chaque preuve et demander une nouvelle acceptation lors d’un changement matériel.

Les contenus juridiques intégrés restent `draft`. Aucun médiateur, capital, TVA, hébergeur ou prestataire n’est inventé.

### 3. Consentements sensibles, âge et couples

Responsabilités :

- recueillir séparément les finalités obligatoires et facultatives ;
- permettre le retrait avec conséquences expliquées ;
- qualifier l’âge comme auto-déclaré tant qu’aucun prestataire n’est utilisé ;
- relier deux comptes adultes à un profil couple sans compte partagé ;
- bloquer visibilité/activation si un membre n’a pas satisfait les prérequis.

La régularisation des utilisateurs existants ne s’active qu’après publication des documents et validation des parcours.

### 4. Politique de contenu et coordonnées hors plateforme

Responsabilités :

- normaliser Unicode, séparateurs, accents, formes écrites et homoglyphes courants ;
- détecter téléphone FR/international, email, WhatsApp, Telegram, Signal, Snapchat, identifiants sociaux explicitement proposés comme contact, invitations et identifiants de paiement ;
- distinguer les prix légitimes d’événements/hôtel des paiements entre membres ;
- bloquer le contenu membre avant écriture ;
- créer une alerte seulement si répétition, tentative de contournement ou signal commercial combiné.

Interface centrale :

```ts
type SafetySurface =
  | 'message'
  | 'profile'
  | 'member_event'
  | 'wall_post'
  | 'wall_comment'
  | 'attachment_filename'

type SafetySignalCategory =
  | 'phone_number'
  | 'email_address'
  | 'external_messaging'
  | 'external_redirect'
  | 'payment_handle'
  | 'pricing'
  | 'escort'
  | 'sugar'
  | 'commercial_adult_content'
  | 'minor_risk'
  | 'coercion'
  | 'trafficking'
  | 'non_consensual_media'
  | 'financial_scam'
  | 'violence'

type SafetyEvaluation = {
  decision: 'allow' | 'block' | 'hold'
  score: number
  categories: SafetySignalCategory[]
  ruleIds: string[]
  maskedExcerpt: string
  engineVersion: string
}
```

Le service `evaluateMemberContent()` ne dépend pas de l’UI et s’applique dans chaque action/route serveur.

### 5. Signalements, modération et recours

Responsabilités :

- fournir des catégories et cibles canoniques ;
- préserver une preuve avant retrait ;
- séparer signalement, investigation, décision et recours ;
- limiter chaque rôle aux ressources nécessaires ;
- produire une motivation compréhensible et une notification neutre ;
- interdire au décideur initial de revoir l’appel lorsqu’un autre réviseur habilité est disponible.

Le cockpit existant est migré progressivement. Les tables actuelles ne sont pas supprimées tant que les données n’ont pas été rapprochées et vérifiées.

### 6. Accès ciblé aux conversations

Chaque ouverture de fil exige :

- une investigation active ;
- une alerte ou un signalement associé à la conversation, sauf extension motivée par un `compliance_admin` ;
- un motif saisi ;
- un rôle autorisé ;
- une entrée d’audit créée avant la lecture.

Une extension de périmètre est bornée, motivée et révocable. L’échéance des six mois déclenche une réévaluation ; elle ne renouvelle pas automatiquement l’accès.

### 7. Audit, preuve et conservation

Responsabilités :

- journal append-only chaîné par HMAC ;
- métadonnées minimisées et contenus sensibles exclus ;
- snapshots chiffrés au niveau applicatif ;
- legal holds distincts et révisables ;
- politique de conservation centralisée ;
- purge avec simulation, métriques agrégées et exclusion stricte des holds.

La chaîne d’audit ne remplace pas les sauvegardes ni les journaux techniques ; elle prouve la cohérence des actions Compliance.

### 8. Médias privés

Responsabilités :

- arrêter les nouveaux uploads publics lorsque le flag privé est activé ;
- servir les médias via une route autorisée ou une URL signée courte ;
- vérifier que le demandeur participe à la conversation ou possède le rôle et le dossier nécessaires ;
- préférence « autoriser la réception » désactivée par défaut ;
- valider taille, MIME réel et extension ;
- retirer les métadonnées d’images lorsque le pipeline le permet ;
- prévoir l’intégration antivirus sans revendiquer son existence avant configuration.

Les URLs publiques historiques feront l’objet d’un inventaire et d’une migration séparée avec sauvegarde.

### 9. Confidentialité, cookies et suppression

Responsabilités :

- tableau de bord de consentements et versions acceptées ;
- export propriétaire ;
- demande de suppression avec délai et holds ;
- choix cookies symétriques et blocage préalable ;
- visibilité, localisation, emails et médias privés configurables.

### 10. Paiements et frontière hôtelière

Aucun paiement n’est activé dans ce programme tant que l’identité, le médiateur, les CGV, le prestataire et le parcours de résiliation ne sont pas validés. La réservation de chambre reste une prestation autonome et ne reçoit aucune donnée intime, conversation, signalement ou historique de matching.

## Flux de données du blocage de coordonnées

1. Le membre saisit un contenu.
2. Le client peut lancer une prévalidation ergonomique.
3. L’action serveur normalise le texte et appelle `evaluateMemberContent()`.
4. Si `allow`, l’écriture métier continue.
5. Si `block`, aucune écriture métier n’a lieu ; un message explique la règle.
6. Un événement minimal est écrit avec HMAC, catégories, règles, surface et acteur.
7. Si le seuil de répétition ou de combinaison est atteint, une investigation est créée ou enrichie.
8. Aucun contenu brut n’est envoyé dans une notification.

## Gestion des erreurs

- Configuration absente : fonctionnalité concernée désactivée et alerte admin.
- Base d’audit indisponible : les lectures sensibles et publications juridiques échouent fermées.
- Moteur de contenu indisponible : les surfaces critiques échouent fermées lorsque le flag est actif ; les autres restent sur le comportement précédent tant que le flag est inactif.
- Stockage privé indisponible : l’upload est refusé sans bascule vers un espace public.
- Échec de notification : la décision reste enregistrée et une reprise opérationnelle est possible.

## Déploiement

Ordre : migrations additives, configuration, audit, moteur de coordonnées, documents, acceptations, consentements, nouveau signalement, permissions, médias, confidentialité, couples, paiement, Rideaux ouverts.

Chaque lot :

1. tests rouges ;
2. migration validée dans une base isolée ;
3. implémentation minimale ;
4. tests, typecheck et build ;
5. commit dédié ;
6. déploiement du code avec flag `false` ;
7. contrôle production ;
8. activation distincte seulement si les prérequis sont remplis.

## Critères de validation technique

- aucune coordonnée hors plateforme n’est enregistrée sur une surface membre protégée ;
- aucun bannissement permanent automatique ;
- aucune lecture de conversation sans dossier, motif, rôle et audit ;
- aucun média privé nouvellement publié via URL permanente ;
- aucune acceptation liée à un brouillon ;
- aucun consentement sensible déduit de l’historique ;
- aucune information juridique vide ou inventée affichée ;
- aucune fonction Compliance activée par défaut ;
- migrations additives et documentées ;
- tests de permissions, intégration, sécurité et build réussis avant activation.
