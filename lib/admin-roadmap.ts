export const roadmapStatuses = ['ok', 'issue', 'developed', 'planned'] as const

export type RoadmapStatus = (typeof roadmapStatuses)[number]

export interface RoadmapItem {
  id: string
  title: string
  category:
    | 'Fonctionnel'
    | 'Technique'
    | 'Design'
    | 'Infrastructure'
    | 'Base de donnees'
    | 'Messagerie'
    | 'Securite'
  status: RoadmapStatus
  priority: 'Haute' | 'Moyenne' | 'Basse'
  phase: string
  owner: string
  note: string
  impact: string
  nextAction: string
  updatedAt: string
}

export const roadmapItems: RoadmapItem[] = [
  {
    id: 'production-vps2-online',
    title: 'Production repositionnee sur VPS2',
    category: 'Infrastructure',
    status: 'ok',
    priority: 'Haute',
    phase: 'Production',
    owner: 'MyBotIA / Damien',
    note: 'La version validee est servie sur rencontrelovehotel.com via le stack VPS2. Le endpoint version.json repond avec le build 16 deploye le 26 juin 2026.',
    impact: 'Le client consulte maintenant la nouvelle version en production, sans dependre de Vercel pour le domaine public.',
    nextAction: 'Maintenir un controle post-bascule: logs, sauvegardes, disponibilite et parcours critiques apres chaque livraison.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'beta-stack-vps2',
    title: 'Stack beta et production isoles sur VPS2',
    category: 'Infrastructure',
    status: 'ok',
    priority: 'Haute',
    phase: 'Infrastructure',
    owner: 'MyBotIA / Damien',
    note: 'Le projet dispose d une pile Docker LHR separee, avec application, base Postgres et fichiers statiques sous controle VPS2.',
    impact: 'Permet de continuer a travailler sur la beta tout en gardant la production exploitable.',
    nextAction: 'Documenter la procedure de rollback et garder les variables sensibles hors Git.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'database-copy',
    title: 'Base de donnees reprise et exploitee sur VPS2',
    category: 'Base de donnees',
    status: 'ok',
    priority: 'Haute',
    phase: 'Migration',
    owner: 'MyBotIA / Damien',
    note: 'Les donnees applicatives ont ete reprises dans Postgres VPS2 avec les comptes existants et les donnees necessaires a la beta/production.',
    impact: 'Le projet n est plus pilote uniquement par une base externe payante pour l exploitation courante.',
    nextAction: 'Automatiser une sauvegarde reguliere et verifier la restauration sur environnement de secours.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'admin-roadmap',
    title: 'Module Roadmap admin',
    category: 'Fonctionnel',
    status: 'ok',
    priority: 'Haute',
    phase: 'Pilotage projet',
    owner: 'MyBotIA',
    note: 'La page admin /admin/roadmap centralise les points OK, les problemes, les lots developpes et les travaux a venir.',
    impact: 'Le client et l equipe peuvent suivre l avancement sans parcourir les messages techniques.',
    nextAction: 'Mettre a jour cette liste apres chaque lot de livraison ou audit significatif.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'deployment-footer',
    title: 'Repere de deploiement visible',
    category: 'Infrastructure',
    status: 'ok',
    priority: 'Moyenne',
    phase: 'Livraison',
    owner: 'MyBotIA',
    note: 'Le footer et version.json permettent d identifier la version livree, le build et la date de deploiement.',
    impact: 'On sait immediatement quelle version est consultee par le client.',
    nextAction: 'Conserver ce repere sur production et beta, avec horodatage lisible apres chaque deploiement.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'auth-and-google-oauth',
    title: 'Authentification conservee et Google OAuth preserve',
    category: 'Fonctionnel',
    status: 'ok',
    priority: 'Haute',
    phase: 'Acces membres',
    owner: 'MyBotIA',
    note: 'La connexion email/mot de passe reste disponible et le flux Google OAuth a ete preserve pour ne pas bloquer les anciens comptes.',
    impact: 'Les utilisateurs existants peuvent continuer a se connecter apres la mise a jour.',
    nextAction: 'Recontroler les URLs de redirection OAuth si un nouveau domaine beta ou preview est ajoute.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'message-schema',
    title: 'Schema messages normalise',
    category: 'Messagerie',
    status: 'ok',
    priority: 'Haute',
    phase: 'Messagerie',
    owner: 'MyBotIA',
    note: 'La lecture des messages est normalisee avec is_read et les conversations agregent les attachments.',
    impact: 'La base technique de la messagerie est plus coherente pour les notifications, listes de conversations et moderation.',
    nextAction: 'Verifier le parcours complet entre deux comptes reels apres chaque deploiement.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'community-home-v2',
    title: 'Accueil communaute modernise',
    category: 'Design',
    status: 'developed',
    priority: 'Haute',
    phase: 'Experience utilisateur',
    owner: 'MyBotIA',
    note: 'La page decouverte a ete repositionnee en page communautaire: profils actifs, matches, evenements, experiences Love Rooms, rideaux ouverts, jacuzzi et conciergerie.',
    impact: 'La premiere impression est plus moderne, vivante et coherente avec le concept Love Hotel Rencontre.',
    nextAction: 'Continuer les tests responsives et ajuster les widgets selon les retours client.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'lhr-v2-shell-layout',
    title: 'Navigation et layout V2 Love Hotel',
    category: 'Design',
    status: 'developed',
    priority: 'Haute',
    phase: 'Experience utilisateur',
    owner: 'MyBotIA',
    note: 'Header, sidebar, logo officiel, largeur utile, cartes et structure generale ont ete repris pour une experience plus premium.',
    impact: 'L application ressemble davantage a un site de rencontre moderne qu a une maquette artisanale.',
    nextAction: 'Poursuivre l harmonisation page par page, en priorite recherche, admin et mobile.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'official-logo-assets',
    title: 'Logo officiel et visuels Love Hotel integres',
    category: 'Design',
    status: 'developed',
    priority: 'Moyenne',
    phase: 'Identite visuelle',
    owner: 'MyBotIA',
    note: 'Le logo officiel et les visuels apereo jacuzzi, rideaux ouverts et conciergerie ont ete integres dans l interface.',
    impact: 'Le produit porte mieux l univers Love Hotel et ses offres differentiantes.',
    nextAction: 'Ranger les assets definitifs et supprimer les anciennes references visuelles non utilisees.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'event-formats-active',
    title: 'Evenements recentres sur jacuzzi et rideaux ouverts',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Haute',
    phase: 'Evenements',
    owner: 'MyBotIA',
    note: 'Les formats restaurant/bar ont ete mis en standby. Les formats actifs sont apereo jacuzzi 2 a 4 couples et rideaux ouverts 2 ou 3 chambres.',
    impact: 'L offre correspond mieux a la realite operationnelle des etablissements et au concept rencontre.',
    nextAction: 'Brancher les evenements sur les disponibilites reelles des chambres et du jacuzzi avant industrialisation.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'event-participation-notifications',
    title: 'Participation aux evenements et notifications admin',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Haute',
    phase: 'Evenements',
    owner: 'MyBotIA',
    note: 'Les membres peuvent rejoindre ou quitter un evenement. Les reservations d evenements declenchent des notifications admin et une notification email configurable.',
    impact: 'Les demandes de participation deviennent exploitables par l equipe qui gere les etablissements.',
    nextAction: 'Verifier le destinataire de production et ajouter un tableau de suivi des demandes par evenement.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'availability-api-discovery',
    title: 'API disponibilites Love Hotel identifiee',
    category: 'Technique',
    status: 'developed',
    priority: 'Haute',
    phase: 'Disponibilites',
    owner: 'MyBotIA',
    note: 'Le widget booking.lovehotel.io expose une API JSON publique de disponibilites via api.lovehotel.io/rooms/availability avec mapping hotel 1 Chatelet et 2 Pigalle.',
    impact: 'On peut techniquement connecter la creation d evenements a de vrais creneaux disponibles.',
    nextAction: 'Creer un adaptateur interne LHR et remplacer la saisie libre par un selecteur de creneaux controles.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'open-curtains-planning',
    title: 'Planning Rideaux ouverts retrouve',
    category: 'Technique',
    status: 'developed',
    priority: 'Moyenne',
    phase: 'Disponibilites',
    owner: 'MyBotIA',
    note: 'Le planning WordPress rideaux ouverts existe via wp-json/zlhu_api/v3/rideaux_ouverts et admin-ajax action zlhu_rideaux_ouverts_ajax.',
    impact: 'Le planning actuel peut servir de reference visuelle ou de source secondaire, mais il renvoie du HTML a parser.',
    nextAction: 'Privilegier l API JSON LoveHotel pour le coeur applicatif et garder ce planning comme compatibilite.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'messaging-media',
    title: 'Messagerie modernisee avec pieces jointes',
    category: 'Messagerie',
    status: 'developed',
    priority: 'Haute',
    phase: 'Messagerie',
    owner: 'MyBotIA',
    note: 'La messagerie supporte maintenant les pieces jointes image, audio et video au niveau schema, action serveur, upload et affichage conversation.',
    impact: 'Le produit couvre les usages attendus d une messagerie de rencontre moderne, au moins en stockage fichier classique.',
    nextAction: 'Tester en charge les limites de taille et cadrer le stockage long terme avant d ouvrir largement la video.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'notifications-system',
    title: 'Notifications in-app admin et utilisateurs',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Haute',
    phase: 'Notifications',
    owner: 'MyBotIA',
    note: 'Un modele notifications enrichi existe avec priorite, categorie, audience, metadata, lecture et notifications admin.',
    impact: 'Les evenements importants peuvent etre visibles dans l application sans se limiter aux emails.',
    nextAction: 'Ajouter une strategie temps reel ou polling propre pour rendre les alertes immediates.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'admin-internal-broadcast',
    title: 'Messages internes admin vers tous les membres',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Haute',
    phase: 'Administration',
    owner: 'MyBotIA',
    note: 'Un module admin permet de publier un message interne dans les comptes utilisateurs sans envoyer d email.',
    impact: 'L equipe peut prevenir toute la communaute depuis l application en cas de nouveaute ou incident.',
    nextAction: 'Ajouter ciblage par audience et statistiques de lecture.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'admin-email-campaigns',
    title: 'Campagnes email admin avec respect opt-out',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Haute',
    phase: 'Administration',
    owner: 'MyBotIA',
    note: 'Le module emails gere templates, audiences, brouillons et exclusions des membres qui ne veulent pas recevoir de campagnes.',
    impact: 'Les communications marketing peuvent etre preparees sans violer les preferences email des membres.',
    nextAction: 'Brancher un fournisseur SMTP/transactionnel de production et tracer les envois reels.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'admin-moderation',
    title: 'Centre de moderation admin',
    category: 'Securite',
    status: 'developed',
    priority: 'Haute',
    phase: 'Administration',
    owner: 'MyBotIA',
    note: 'Une entree admin de moderation existe pour scanner messages, mots-cles et risques de contenu.',
    impact: 'La plateforme peut commencer a encadrer les abus et contenus problematiques.',
    nextAction: 'Ajouter workflow de decision: avertir, masquer, suspendre, bannir et historiser.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'admin-options-modern',
    title: 'Parametres admin modernises',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Moyenne',
    phase: 'Administration',
    owner: 'MyBotIA',
    note: 'La page parametres a ete modernisee avec sections operationnelles: evenements, emails, conciergerie, premium et gouvernance.',
    impact: 'L administration devient plus lisible et plus scalable qu un simple bloc de champs texte.',
    nextAction: 'Raccorder chaque option a des effets applicatifs mesurables et auditer les permissions.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'conciergerie-coquine',
    title: 'Conciergerie coquine mise en avant',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Haute',
    phase: 'Conciergerie',
    owner: 'MyBotIA',
    note: 'La conciergerie remplace Escapade dans le menu, dispose d une page dediee, d un visuel premium et d un formulaire structure.',
    impact: 'Les demandes speciales deviennent un axe commercial clair: Love Room, jacuzzi, rideaux ouverts, limousine, week-end ou experience sur mesure.',
    nextAction: 'Verifier le routage email loolyyb@gmail.com en production et ajouter suivi de statut cote admin.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'conciergerie-workflow',
    title: 'Workflow conciergerie vers admin, email et chat',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Haute',
    phase: 'Conciergerie',
    owner: 'MyBotIA',
    note: 'Les demandes de conciergerie sont enregistrees, notifiees, envoyees par email et peuvent creer un fil de conversation avec l admin.',
    impact: 'Les demandes ne restent plus perdues dans un formulaire invisible.',
    nextAction: 'Faire un test reel de bout en bout sur production avec accuse de reception et controle email.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'profile-and-matching-update',
    title: 'Profil et matching enrichis',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Haute',
    phase: 'Matching',
    owner: 'MyBotIA',
    note: 'Les profils, preferences, rideaux ouverts, apereos jacuzzi, premium teaser et types de rencontres ont ete remis dans le parcours profil/onboarding.',
    impact: 'La compatibilite repose davantage sur le concept Love Hotel et pas seulement sur des champs generiques.',
    nextAction: 'Ajouter une recherche dediee avec filtres par statut, genre, couple, jacuzzi, rideaux ouverts et conciergerie.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'matches-ui',
    title: 'Pages matchs modernisees',
    category: 'Design',
    status: 'developed',
    priority: 'Moyenne',
    phase: 'Matching',
    owner: 'MyBotIA',
    note: 'Les pages de matches et demandes ont ete retravaillees pour s aligner sur le nouveau style communautaire.',
    impact: 'Le parcours de mise en relation est plus lisible pour les membres.',
    nextAction: 'Verifier les regles metier: demande, acceptation, match confirme, ouverture de messagerie.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'security-email-policy',
    title: 'Gouvernance email securisee',
    category: 'Securite',
    status: 'developed',
    priority: 'Haute',
    phase: 'Emails',
    owner: 'MyBotIA',
    note: 'Les emails automatiques sont limites aux usages autorises, notamment renouvellement explicite du mot de passe, et les campagnes respectent les refus.',
    impact: 'Reduit les risques d envois non souhaites et aligne le produit avec les attentes RGPD/consentement.',
    nextAction: 'Auditer tous les points d envoi email et documenter le SMTP/fournisseur exact de production.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'feedback-widget',
    title: 'Widget bug et suggestion communaute',
    category: 'Fonctionnel',
    status: 'developed',
    priority: 'Moyenne',
    phase: 'Support',
    owner: 'MyBotIA',
    note: 'Un point de contact permet aux membres de signaler une suggestion ou un bug vers l admin et l email de suivi configure.',
    impact: 'Les retours terrain peuvent etre captes directement depuis l application.',
    nextAction: 'Ajouter un tableau admin dedie avec statut: nouveau, en cours, resolu.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'premium-teaser',
    title: 'Amorce premium cadree mais offres en standby',
    category: 'Fonctionnel',
    status: 'planned',
    priority: 'Moyenne',
    phase: 'Monetisation',
    owner: 'MyBotIA / Client',
    note: 'La logique premium est pensee comme limitation des matchs, messages, medias et futurs lives, mais aucune offre payante definitive n est activee.',
    impact: 'Le modele economique est prepare sans promettre une offre non validee.',
    nextAction: 'Definir quotas gratuits, avantages premium, prix, stockage media et conditions commerciales.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'availability-event-integration',
    title: 'Brancher les evenements sur les disponibilites reelles',
    category: 'Technique',
    status: 'planned',
    priority: 'Haute',
    phase: 'Disponibilites',
    owner: 'MyBotIA',
    note: 'La source de disponibilites LoveHotel est identifiee mais pas encore connectee a la creation d evenements.',
    impact: 'Aujourd hui un evenement peut etre cree sur une date libre cote LHR sans verifier que la chambre ou le jacuzzi est reellement disponible.',
    nextAction: 'Ajouter une route interne /api/love-hotel/availability, un selecteur de creneaux et une verification serveur avant creation.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'jacuzzi-resource-mapping',
    title: 'Disponibilite jacuzzi a clarifier',
    category: 'Technique',
    status: 'issue',
    priority: 'Haute',
    phase: 'Disponibilites',
    owner: 'MyBotIA / Client',
    note: 'L API trouvee expose clairement les chambres disponibles. La ressource jacuzzi doit etre mappee ou confirmee dans le systeme de reservation.',
    impact: 'Sans mapping jacuzzi fiable, les apereos jacuzzi restent planifiables mais pas garantis par un stock temps reel.',
    nextAction: 'Identifier si le jacuzzi est une chambre, une option, un calendrier separe ou une gestion manuelle admin.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'search-module',
    title: 'Module recherche avancee membres',
    category: 'Fonctionnel',
    status: 'planned',
    priority: 'Haute',
    phase: 'Recherche',
    owner: 'MyBotIA',
    note: 'Il faut une page recherche pour filtrer homme, femme, couple, interesses jacuzzi, rideaux ouverts, rencontres directes et conciergerie.',
    impact: 'Les membres pourront trouver plus vite les profils compatibles meme avec une communaute encore limitee.',
    nextAction: 'Construire une recherche sobre avec filtres courts, resultats visuels et compatibilite visible.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'messaging-rules',
    title: 'Regles de messagerie a verrouiller',
    category: 'Messagerie',
    status: 'planned',
    priority: 'Haute',
    phase: 'Messagerie',
    owner: 'MyBotIA',
    note: 'La messagerie doit confirmer la regle metier: conversation libre seulement apres match accepte, sauf messages admin/conciergerie.',
    impact: 'Evite le spam, protege les membres et donne une vraie valeur au match.',
    nextAction: 'Auditer les routes/actions et ajouter des tests bloquants sur l ouverture de conversation.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'video-live-storage',
    title: 'Videos longues et lives directs a deviser',
    category: 'Messagerie',
    status: 'planned',
    priority: 'Moyenne',
    phase: 'Premium / Media',
    owner: 'MyBotIA / Client',
    note: 'Les partages de videos lourdes et les lives directs ne sont pas industrialises car ils demandent stockage, moderation, bande passante et couts specifiques.',
    impact: 'C est une opportunite premium mais pas un lot a activer sans cadrage cout/securite.',
    nextAction: 'Chiffrer stockage, streaming, retention, moderation et quotas premium.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'typescript-debt',
    title: 'Dette TypeScript, lint et hygiene build',
    category: 'Technique',
    status: 'issue',
    priority: 'Haute',
    phase: 'Qualite technique',
    owner: 'MyBotIA',
    note: 'Le projet contient encore une dette historique importante et beaucoup de changements non consolides dans le worktree.',
    impact: 'Des regressions peuvent passer si la compilation stricte, le lint et les tests ne sont pas retablis progressivement.',
    nextAction: 'Stabiliser les fichiers critiques, reduire les erreurs TypeScript et rebrancher les controles CI par lots.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'security-audit',
    title: 'Audit securite dependances et donnees sensibles',
    category: 'Securite',
    status: 'issue',
    priority: 'Haute',
    phase: 'Avant industrialisation',
    owner: 'MyBotIA',
    note: 'Les dependances, routes admin, uploads, moderation et secrets doivent etre audites avant une montee en charge.',
    impact: 'Le produit traite des donnees sensibles et des medias, donc la securite doit etre mieux formalisee.',
    nextAction: 'Lancer audit dependances, taille upload, permissions admin, logs et sauvegardes.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'docker-image',
    title: 'Image Docker et pipeline a optimiser',
    category: 'Infrastructure',
    status: 'issue',
    priority: 'Moyenne',
    phase: 'Industrialisation',
    owner: 'MyBotIA / Damien',
    note: 'Le deploiement fonctionne mais doit etre allege et documente pour accelerer les livraisons et limiter les erreurs.',
    impact: 'Un pipeline propre reduira les risques lors des futures mises en production.',
    nextAction: 'Rendre le build reproductible, documenter les commandes VPS2 et nettoyer les dependances runtime.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'mobile-polish',
    title: 'Polissage mobile complet',
    category: 'Design',
    status: 'planned',
    priority: 'Moyenne',
    phase: 'Experience mobile',
    owner: 'MyBotIA',
    note: 'Les pages principales ont ete modernisees mais doivent encore etre testees finement sur mobile et tablettes.',
    impact: 'Une grande partie des usages rencontre se fait sur mobile.',
    nextAction: 'Tester accueil, recherche, profil, messagerie, evenements, conciergerie et admin sur plusieurs largeurs.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'observability-backups',
    title: 'Observabilite, sauvegardes et supervision',
    category: 'Infrastructure',
    status: 'planned',
    priority: 'Haute',
    phase: 'Exploitation',
    owner: 'MyBotIA / Damien',
    note: 'La production est en ligne mais la supervision applicative, les alertes et les sauvegardes restaurees doivent etre formalisees.',
    impact: 'Indispensable pour tenir une application client en production avec des donnees membres.',
    nextAction: 'Ajouter checklist quotidienne, sauvegarde Postgres, verification restauration et alertes 500/logs.',
    updatedAt: '2026-06-26'
  },
  {
    id: 'client-demo-followup',
    title: 'Lot client suivant a prioriser',
    category: 'Fonctionnel',
    status: 'planned',
    priority: 'Haute',
    phase: 'Roadmap client',
    owner: 'MyBotIA / Client',
    note: 'La version moderne est validee et mise en production. Le prochain lot doit transformer le concept en parcours exploitable: recherche, disponibilites, evenements reels et admin de suivi.',
    impact: 'C est ce qui fera passer le produit d une belle beta fonctionnelle a une plateforme operationnelle.',
    nextAction: 'Prioriser: 1 recherche membres, 2 disponibilites evenements, 3 moderation/workflow admin, 4 premium/media.',
    updatedAt: '2026-06-26'
  }
]

export function getRoadmapSummary (items: RoadmapItem[]) {
  return items.reduce(
    (summary, item) => {
      summary[item.status] += 1
      return summary
    },
    { ok: 0, issue: 0, developed: 0, planned: 0 } satisfies Record<
      RoadmapStatus,
      number
    >
  )
}

export function getRoadmapItemsByStatus (
  items: RoadmapItem[],
  status: RoadmapStatus
) {
  return items.filter(item => item.status === status)
}
