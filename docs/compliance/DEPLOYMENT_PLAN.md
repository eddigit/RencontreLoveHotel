# Déploiement du socle Compliance LHR

## Principe de sécurité

Le code est livré avec tous les indicateurs Compliance à `false`. Une fonctionnalité sensible n'est activée qu'après validation de sa configuration, de la migration, des tests authentifiés et de son mécanisme de retour arrière. Aucun secret ni aucune valeur juridique n'est conservé dans ce document.

## Préparation

1. Confirmer la cible VPS2, le service Docker `app`, le domaine `rencontrelovehotel.com` et la branche publiée.
2. Vérifier que les variables nécessaires sont gérées par le mécanisme de secrets de production. La clé `LEGAL_AUDIT_HMAC_SECRET` est obligatoire avant l'activation du blocage de coordonnées ou de la lecture auditable.
3. Conserver tous les indicateurs `COMPLIANCE_*` à `false` pendant la première livraison.
4. Produire un dump PostgreSQL horodaté et son empreinte SHA-256, puis vérifier que l'archive est lisible.

## Migration additive

1. Exécuter `migrations/20260718_compliance_foundation.sql` dans une transaction avec arrêt sur erreur.
2. Confirmer la présence de `compliance_audit_log`, `compliance_safety_events`, de leurs index et des colonnes `access_reason`, `scope_basis`, `authorized_by`.
3. Comparer les volumes des tables métier avant/après : la migration ne doit supprimer ni modifier aucune ligne membre.

## Livraison désactivée

1. Déployer uniquement les fichiers commités et reconstruire l'image de l'application.
2. Recréer le conteneur `app`, attendre son état sain et contrôler les erreurs de démarrage.
3. Vérifier `/login`, la redirection d'une route admin non authentifiée, la messagerie normale et le tableau de préparation Compliance authentifié.
4. Confirmer que les deux protections `contactSafety` et `scopedConversationAccess` sont affichées « Inactif ».

## Activation contrôlée

Activer un seul indicateur à la fois. Avant chaque activation : configuration complète, test avec un compte de recette, contrôle de la trace HMAC sans contenu brut, vérification d'un cas autorisé et d'un cas bloqué, puis surveillance des erreurs et faux positifs.

L'ordre recommandé est : journal Compliance, blocage des coordonnées externes, accès modération justifié, puis modules juridiques et consentements après validation du conseil français.

## Retour arrière

Le retour arrière applicatif consiste à repasser immédiatement l'indicateur concerné à `false` et à recréer le conteneur. Les tables additives et les traces déjà créées sont conservées ; elles ne doivent pas être supprimées pendant un incident. En cas de défaut de migration, arrêter l'activation, restaurer la sauvegarde uniquement après diagnostic et conserver les journaux techniques de l'opération.
