# Notifications d'activite du compte par e-mail

## Objectif

Permettre a chaque membre de choisir explicitement s'il souhaite recevoir par e-mail les activites importantes de son compte. Aucun e-mail d'activite n'est envoye sans consentement prealable.

## Regles de consentement

- Le consentement aux e-mails d'activite est desactive par defaut.
- L'absence de choix est traitee comme un refus d'envoi.
- Un consentement general doit etre accorde avant qu'une categorie puisse produire un e-mail.
- Le membre peut ensuite activer ou desactiver independamment les categories `messages`, `matchs` et `evenements`.
- Un refus explicite est enregistre et n'est pas redemande a chaque connexion.
- Le membre peut modifier son choix a tout moment depuis la page des preferences e-mail.
- Les campagnes marketing restent independantes de ces reglages.
- Les e-mails indispensables a la securite du compte, comme la verification d'adresse et la reinitialisation du mot de passe, ne sont pas concernes.

## Inscription

Le formulaire d'inscription presente une autorisation facultative, distincte de l'acceptation obligatoire des conditions d'utilisation.

- L'autorisation n'est jamais pre-cochee.
- Si le membre ne l'active pas, les trois categories restent desactivees.
- S'il l'active, les trois categories sont activees initialement et peuvent etre personnalisees ensuite.
- Les inscriptions OAuth suivent la meme regle lors du premier parcours connecte.

## Membres existants

A la premiere connexion suivant la mise en production, un panneau de consentement apparait pour les comptes qui n'ont encore pris aucune decision.

- Action principale : `Autoriser les e-mails`, qui active les trois categories.
- Action secondaire : `Non merci`, qui conserve les trois categories desactivees.
- Un lien `Personnaliser` ouvre les trois choix avant validation.
- La fermeture sans choix ne vaut pas consentement et le panneau pourra etre repropose a une prochaine connexion.
- Apres une acceptation ou un refus explicite, le panneau ne reapparait plus automatiquement.

## Preferences e-mail

La page `/email-preferences` contient quatre reglages lisibles :

1. Autoriser les notifications d'activite par e-mail.
2. Nouveaux messages.
3. Demandes de match et matchs acceptes.
4. Activite des evenements.

Les trois categories sont desactivees visuellement et fonctionnellement lorsque l'autorisation generale est coupee. Le reglage existant des actualites et campagnes reste dans une section separee.

## Evenements declencheurs

### Messages

- Nouveau message recu dans une conversation autorisee.
- L'e-mail ne contient pas le texte prive du message, seulement l'identite d'affichage de l'expediteur et un lien vers la conversation.

### Matchs

- Nouvelle demande de match.
- Match accepte.

### Evenements

- Inscription ou demande de participation concernant le membre.
- Acceptation ou refus d'une participation.
- Modification importante ou moderation d'un evenement cree par le membre.

## Envoi et protection contre le bruit

- Chaque point d'envoi appelle un service central qui verifie le consentement general, la categorie, l'adresse verifiee, le statut actif du compte et la liste de suppression.
- L'envoi d'un e-mail est un effet secondaire : son echec ne doit jamais annuler le message, le match ou l'action evenementielle.
- Chaque e-mail contient un lien direct vers l'activite et un lien vers `/email-preferences`.
- Les erreurs d'envoi sont journalisees sans contenu de message prive ni secret.
- Les notifications internes dans l'application continuent de fonctionner meme lorsque les e-mails sont refuses.

## Donnees

La table `email_preferences` est etendue par une migration versionnee avec :

- `activity_email_consent` booleen, faux par defaut.
- `activity_email_decided_at` nullable pour distinguer l'absence de decision d'un refus explicite.
- `message_email_enabled`, `match_email_enabled`, `event_email_enabled`, faux par defaut.
- Les horodatages et la source du choix sont conserves pour l'audit.

Les comptes existants sans ligne de preference sont consideres sans decision et sans consentement. La migration ne les inscrit jamais automatiquement.

## Architecture

- Les server actions de preferences exigent `requireCurrentUser()`.
- Un composant global connecte affiche le panneau une seule fois lorsque le serveur retourne `decision requise`.
- Un service transactionnel unique applique les regles avant tout envoi d'e-mail d'activite.
- Les actions messages, matchs et evenements transmettent uniquement un type, le destinataire et les identifiants utiles au service.
- Les modeles d'e-mail n'exposent aucune donnee sensible et utilisent l'URL de production configuree.

## Tests obligatoires

- Valeurs par defaut sans consentement.
- Inscription avec et sans autorisation.
- Demande unique a la prochaine connexion d'un membre existant.
- Refus explicite non repropose.
- Activation et desactivation independantes des trois categories.
- Aucun e-mail lorsque le consentement general ou la categorie est desactive.
- Envoi pour message, demande de match, match accepte et activite evenementielle autorisee.
- Absence de contenu prive dans l'e-mail de nouveau message.
- Echec SMTP sans annulation de l'action metier.
- Gardes de session sur toutes les actions de preferences.

## Deploiement

La migration est appliquee avant le nouveau code applicatif. Apres validation des tests et du build, le changement est pousse directement sur `main`, deploye sur VPS2, puis controle par les journaux, la sante du conteneur et un parcours de consentement sans envoi a de vrais membres.
