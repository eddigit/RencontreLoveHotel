# Audit d’état Compliance LHR

Date de l’audit : 18 juillet 2026  
Projet : Love Hôtel Rencontres  
Branche : `compliance/legal-safety-hardening`  
Statut : audit technique initial, à compléter par une validation avocat/DPO

## Périmètre et méthode

Cet audit compare le dépôt LHR au programme `COMPLIANCE.md`. Il repose sur la lecture des routes Next.js, actions serveur, migrations PostgreSQL, composants d’inscription, schéma, tests et documents existants. Il ne constitue pas une consultation juridique et ne déclare pas le service conforme.

Niveaux de risque :

- **Critique** : exposition immédiate de données intimes, absence de consentement requis, accès excessif ou activation commerciale risquée.
- **Élevé** : mécanisme juridique ou de preuve incomplet pouvant empêcher de démontrer les diligences.
- **Moyen** : fonctionnalité partielle, documentation ou gouvernance insuffisante.
- **Faible** : amélioration de cohérence ou de maintenabilité.

## Synthèse exécutive

LHR possède déjà un socle anti-sollicitation substantiel : règles pondérées, absence de bannissement automatique sur mot-clé, signalement membre, adhérents-modérateurs, décisions humaines, recours, journalisation ciblée, investigations, gel de preuve et export. Ce socle doit être conservé et normalisé dans l’architecture Compliance cible.

Les écarts les plus urgents sont :

1. les pièces jointes de messagerie sont stockées avec un accès Blob public ;
2. aucun consentement distinct ne couvre actuellement les données relatives à la vie sexuelle et à l’orientation ;
3. les documents juridiques sont codés en dur et présentés comme en vigueur sans publication versionnée ;
4. le statut « couple » correspond à un seul compte et non à deux adultes authentifiés ;
5. l’accès administratif renforcé aux conversations repose sur une période générale de six mois, sans justification saisie pour chaque ouverture ;
6. aucune architecture complète de retrait de consentement, confidentialité, purge, cookies ou résiliation électronique n’existe ;
7. les coordonnées téléphoniques, emails et identifiants externes ne sont pas empêchés dans les contenus membres.

## Matrice d’écarts

| Domaine | État actuel | Fichiers concernés | Risque | Modification proposée | Migration | Tests nécessaires |
|---|---|---|---|---|---|---|
| Configuration juridique | Identité, adresse, RCS, contact, hébergeurs et affirmations de paiement codés en dur dans les pages | `app/terms/page.tsx`, `app/privacy/page.tsx` | Élevé | Registre de configuration serveur, validation des champs essentiels, placeholders jamais publics, alerte admin | Non | Configuration absente, incomplète et complète |
| Centre juridique | Routes `/terms`, `/privacy`, `/community-safety` seulement ; aucun centre unique | `app/terms`, `app/privacy`, `app/community-safety` | Élevé | Créer `/legal` et les routes documentaires prévues | Non | Routes publiques, statuts et liens |
| Sources juridiques | Contenus React codés en dur ; aucun MDX ni en-tête structuré | mêmes fichiers | Élevé | Créer `content/legal/*.mdx`, chargeur et validation de frontmatter | Non | Parsing, statut brouillon, hash |
| Publication juridique | Des textes indiquent « en vigueur » sans workflow de publication | `app/privacy/page.tsx`, `app/community-safety/page.tsx` | Critique | Brouillon par défaut ; publication réservée à `legal_admin` ; aucun texte brouillon proposé à l’acceptation | Oui | Publication autorisée/interdite, configuration manquante |
| Acceptations | Table `legal_acceptances` liée à un type et une chaîne de version, sans document source ni hash ; trois acceptations créées ensemble | `lib/legal-policy.ts`, `lib/user-service.ts`, migration `20260715_anti_solicitation_compliance.sql` | Élevé | Tables `legal_document_versions` et `user_legal_acceptances`, source, HMAC IP/UA, version publiée | Oui | Acceptation atomique, unicité, conservation ancienne version |
| Reconsentement | Aucun contrôle central des versions publiées obligatoires | middleware, auth, routes protégées | Élevé | Garde serveur et page `/legal-review`, blocage limité aux fonctions concernées | Oui | Nouvelle version, changement matériel, refus |
| Consentement sensible | Orientation, statut, préférences libertines et rideaux ouverts collectés après une case CGU globale | `components/onboarding-form.tsx`, `lib/onboarding-service.ts`, `schema.sql` | Critique | Consentements explicites par finalité, écran d’information, retrait et conséquences | Oui | Inscription sans consentement, octroi, retrait, preuve |
| Consentements facultatifs | Pas de séparation structurée marketing, localisation, visibilité ou expérimentation | inscription, onboarding, préférences | Élevé | Cases distinctes non précochées et stockage versionné | Oui | Valeurs par défaut et révocation |
| Majorité | Déclaration « au moins 18 ans » ; anniversaire stocké ; aucun niveau d’assurance | `app/register/page.tsx`, `components/onboarding-form.tsx`, `users`, `user_profiles` | Élevé | Employer « déclaré », ajouter niveau, fournisseur et référence technique | Oui | Calcul de majorité, niveau et vocabulaire |
| Comptes couples | `user_profiles.status='couple'` sur un compte unique | `schema.sql`, onboarding, filtres | Critique | Deux comptes individuels, profil couple, invitations et activation conditionnelle | Oui | Invitation, double acceptation, suspension, dissolution |
| Anti-prostitution | Moteur pondéré actif, dossiers et décisions humaines ; catégories encore limitées | `lib/anti-solicitation-policy.ts`, `lib/moderation-case-service.ts`, migrations 20260715 | Moyen | Étendre catégories, versionner le moteur, conserver le principe aucune sanction automatique | Oui, additive | Variantes, obfuscations, faux positifs, répétition |
| Coordonnées hors plateforme | Aucun blocage téléphone, email, messagerie externe, lien d’invitation ou identifiant de paiement | messages, profils, mur, événements membres | Critique | Moteur commun de normalisation et blocage avant écriture ; audit minimisé ; alerte sur répétition/contexte commercial | Oui pour journal minimal | Téléphone/email clair et obfusqué, handles, faux positifs, canaux officiels |
| Signalements | `user_reports`, `wall_reports` et `moderation_queue` coexistent ; catégories et cibles partielles | `actions/member-safety-actions.ts`, migrations produit/modération | Élevé | Table canonique `moderation_reports`, cibles typées, catégories complètes, adaptation progressive | Oui | Chaque cible, permission horizontale, risque critique |
| Preuves | Snapshots et SHA-256 existent mais `snapshot JSONB` n’est pas chiffré au niveau applicatif | migration 20260718, actions investigation | Critique | Chiffrement enveloppe, hash du chiffré et accès par rôle | Oui | Chiffrement, altération, accès interdit |
| Décisions | `moderation_decisions` et événements d’investigation existent ; motifs et actions ne sont pas unifiés | actions modération/investigation | Moyen | Modèle canonique de décision motivée, référence de politique et notification neutre | Oui | Chaque action, durée, notification, automatisation |
| Recours | Recours membre disponible par `caseId`, sans file admin dédiée ni garantie de séparation du décideur | `/account/appeals`, `moderation_appeals` | Moyen | Route par action, file Compliance, contrôle du réviseur différent si disponible | Oui | Propriété, double décision, issue du recours |
| Rôles Compliance | Seulement `admin` et `community_moderator` | `lib/moderation-auth.ts`, `users.role` | Élevé | Rôles support/moderator/senior/compliance/legal avec matrice serveur | Oui | Permissions par ressource et action |
| Accès aux conversations | Admin uniquement, investigation active et accès journalisé, mais toutes les conversations du profil sont visibles durant six mois | `actions/moderation-investigation-actions.ts` | Critique | Dossier actif + motif obligatoire par ouverture + périmètre ciblé ; six mois = surveillance renforcée, jamais droit général | Oui | Sans dossier, hors cible, motif absent, expiration, audit |
| Journal d’audit | Plusieurs journaux spécialisés, sans chaîne de hachage centrale | `admin_audit_log`, `moderation_case_access`, événements investigation | Élevé | `compliance_audit_log` chaîné/HMAC et service unique sans contenu sensible | Oui | Chaînage, concurrence, altération, redaction |
| Conservation | 90/365 jours codés dans le service et `legal_hold` booléen local | `lib/moderation-retention.ts`, services modération | Élevé | Configuration centralisée, tables `legal_holds`, purge dry-run puis tâche contrôlée | Oui | Hold actif, libération, purge, idempotence |
| Confidentialité utilisateur | Pas de `/settings/privacy`, export global ni workflow complet de suppression | profil/compte | Critique | Tableau de bord, consentements, visibilité, export et suppression différée | Oui | Propriété, export, retrait, suppression avec hold |
| Médias privés | Pièces jointes image/audio/vidéo envoyées vers Vercel Blob avec `access: 'public'` et URL permanente | `app/api/messages/attachments/route.ts`, `message_attachments` | Critique | Stockage privé, route d’accès autorisée, URL courte, préférence opt-in, validation réelle ; EXIF/antivirus à intégrer | Oui | URL expirée, participant requis, MIME/taille, préférence |
| Rideaux ouverts | Préférence et événements existent sans consentement par session/adulte | préférences, événements, conciergerie | Critique | Feature flag désactivé, sessions et consentements individuels révocables | Oui | Activation, révocation, âge, visibilité |
| Paiements/abonnements | Aucun fournisseur de paiement ou abonnement fonctionnel identifié ; textes évoquent des crédits et paiements | pages premium/CGU/événements | Élevé | Fail-closed ; ne rien activer avant identité, CGV, médiateur, preuve d’achat et résiliation | Oui lors du lot paiement | Configuration, achat, rétractation, résiliation |
| Réservation hôtelière | Pages Love Rooms et confirmation existent, sans intégration de paiement identifiée | `app/love-rooms/**` | Moyen | Frontière explicite entre hôtel et rencontre, données minimales et prestataire configurable | Selon modèle | Absence de données intimes transmises |
| Cookies | Aucun gestionnaire ni page dédiée ; aucun outil analytics tiers identifié dans le code audité | layout/config | Élevé | Inventaire des traceurs, CMP interne, refus symétrique, blocage préalable | Oui si preuve compte | Accept/refuse, absence de traceur avant choix, retrait |
| Emails | Templates marketing versionnés partiellement ; messages Compliance incomplets | migration email, actions notification/email | Moyen | Modèles neutres versionnés pour chaque événement Compliance | Oui, additive | Objet neutre, contenu minimal, préférence |
| Sécurité | Gardes admin serveur présentes sur plusieurs actions ; middleware ; rate limit mémoire ; CSP absente ; uploads privés insuffisants | middleware, `lib/rate-limit.ts`, `next.config.js`, routes upload | Élevé | CSP, rate limit partagé, validation MIME, antivirus, logs centralisés, anti-énumération | Selon outil | Tests API, fichiers, limites, erreurs |
| Feature flags | Aucun ensemble Compliance prévu | environnement/config | Critique | Flags serveur désactivés par défaut et contrôles d’activation | Non | Défaut false, production incomplète, bascule |
| Tests | 304 tests existants, notamment modération ; aucun Playwright ni suite Compliance complète | `tests/**`, `package.json` | Élevé | Unitaires, intégration, permissions, migrations, E2E ; ajouter Playwright si retenu | Non | Liste du cahier, couverture et cas manuels |

## Services tiers identifiés

- PostgreSQL via `pg` ;
- NextAuth avec authentification credentials, Google et Facebook conditionnels ;
- Vercel Blob pour les médias ;
- SMTP/Nodemailer pour les emails ;
- Cloudflare et hébergement VPS2 dans l’infrastructure de production ;
- aucune intégration Stripe ou autre fournisseur de paiement détectée ;
- aucun service analytics, pixel publicitaire ou session replay détecté dans le code audité.

Les contrats, localisations, transferts, durées et rôles de chaque fournisseur doivent être confirmés dans le registre de traitement. La présence dans le code ne confirme ni contrat ni conformité.

## Données existantes et migration

- Ne pas transformer les lignes `legal_acceptances` existantes en consentements sensibles.
- Importer les acceptations historiques uniquement comme preuves de l’ancien mécanisme, avec origine `legacy`, sans les déclarer équivalentes aux nouveaux documents.
- Placer les comptes existants dans un état agrégé « régularisation requise » lorsque les flags seront activés.
- Ne jamais déduire le consentement du champ `orientation`, `status`, `open_curtains` ou d’une utilisation passée.
- Ne pas convertir automatiquement un compte `couple` en deux personnes : demander l’invitation d’un second adulte.
- Conserver les dossiers de modération et leurs holds pendant la migration.

## Ordre de correction recommandé

1. Feature flags, configuration, audit central et migrations additives.
2. Blocage des coordonnées et fermeture des nouveaux uploads publics.
3. Centre juridique versionné et acceptations publiées.
4. Consentements sensibles, majorité et régularisation.
5. Signalements/décisions/recours canoniques et permissions Compliance.
6. Stockage privé et accès contrôlé aux médias.
7. Confidentialité, export, suppression, rétention et holds.
8. Comptes couples et Rideaux ouverts désactivés jusqu’à validation.
9. Cookies et emails Compliance.
10. Paiements, résiliation et frontière hôtelière seulement après validation juridique et configuration complète.

## Sources officielles de cadrage

- CNIL, données sensibles : <https://www.cnil.fr/fr/definition/donnee-sensible>
- CNIL, sites et applications de rencontres : <https://www.cnil.fr/fr/sites-et-applications-de-rencontres-comment-proteger-votre-intimite>
- CNIL, AIPD : <https://www.cnil.fr/fr/ce-quil-faut-savoir-sur-lanalyse-dimpact-relative-la-protection-des-donnees-aipd>
- CNIL, cookies : <https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi>
- Légifrance, proxénétisme : <https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070719/LEGISCTA000006165301/>
- Légifrance, résiliation électronique : <https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046190107>
- EUR-Lex, règlement (UE) 2022/2065 : <https://eur-lex.europa.eu/eli/reg/2022/2065/oj?locale=fr>
- Arcom, référentiel de vérification d’âge pour les services concernés : <https://www.arcom.fr/se-documenter/espace-juridique/textes-juridiques/referentiel-technique-sur-la-verification-de-lage-pour-la-protection-des-mineurs-contre-la-pornographie-en-ligne>

## Conclusion autorisée à ce stade

Le dépôt contient un socle sérieux de prévention anti-sollicitation, mais les mécanismes juridiques, de consentement sensible, de confidentialité et de protection des médias restent incomplets. Les lots suivants doivent rester désactivés en production tant que les migrations, tests, informations légales et validations requises ne sont pas achevés.
