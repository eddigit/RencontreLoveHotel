# Conciergerie Coquine Conversational Redesign

**Date:** 13 juillet 2026
**Statut:** approuve par la demande directe de Gilles
**Cible:** membres connectes, production `rencontrelovehotel.com`

## Objectif

Transformer la page Conciergerie Coquine en un parcours engageant qui montre la valeur concrete du reseau Love Hotel : connaissance des lieux, partenaires activables, experience de la communaute et organisation sur mesure. Conserver le visuel actuel et garantir que chaque demande est stockee dans l'administration puis notifiee par email a `loolyyb@gmail.com` via la configuration de production.

## Experience membre

La page suit une conversation en trois temps :

1. **Vous avez une envie.** Le visuel existant porte une accroche directe et un bouton vers la demande.
2. **Nous savons qui appeler.** Trois preuves expliquent le reseau : lieux connus, partenaires et connexions, communaute et formats deja pratiques.
3. **Construisons-la ensemble.** Le formulaire accepte une idee encore floue, guide le membre sans lui imposer un cahier des charges et annonce une reponse personnelle.

Le formulaire reste sur une seule page. Les types de demande sont regroupes en choix explicites et les champs sont organises comme une conversation : idee, identite, contexte, description, budget facultatif. Le nom et l'email du membre connecte sont pre-remplis.

## Donnees et email

La route `/api/conciergerie` continue de verifier et normaliser les donnees cote serveur. Elle stocke aussi `venue_preference`, `desired_date`, `party_size` et `mood`, afin que le dossier administratif reste complet meme si la notification email rencontre un incident.

Le destinataire est fourni par la configuration centralisee `ADMIN_NOTIFICATION_EMAIL`, actuellement verifiee en production comme egale a `loolyyb@gmail.com`. Le SMTP de production est egalement verifie comme configure. L'email contient tous les champs, un `replyTo` vers le membre et un lien vers l'administration.

## Administration

La page `/admin/conciergerie` affiche les informations de contexte conservees : lieu, periode, taille du groupe, ambiance, budget, statut d'envoi email et coordonnees. Les reponses restent possibles par email et, lorsqu'une conversation existe, par la messagerie interne.

## Responsive et accessibilite

La page est mobile d'abord, sans debordement horizontal. Le visuel reste lisible sans prendre toute la hauteur de l'ecran. Les choix de type sont de vrais boutons avec etat selectionne et attribut `aria-pressed`. Les messages de resultat utilisent une zone `aria-live`.

## Validation

- Tests Vitest du contenu, du pre-remplissage, du stockage detaille et du routage email.
- Typecheck et build Next.js complets.
- Verification visuelle desktop et mobile sur la production.
- Verification du destinataire actif et du SMTP sans exposer de secret.
- Sauvegarde de la base avant migration et controle des logs apres deploiement.
