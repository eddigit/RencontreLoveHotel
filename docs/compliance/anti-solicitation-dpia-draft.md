# Projet d’AIPD — détection anti-sollicitation LHR

> Brouillon à compléter et valider par le DPO avant activation durable.

## Traitement

Analyse locale et déterministe des messages envoyés par les membres pour repérer des combinaisons indiquant une sollicitation sexuelle contre rémunération ou avantage. Le traitement vise la sécurité communautaire, la prévention d’usages interdits et la protection juridique de SARL L’HORA et des membres.

## Nécessité

Le signalement seul intervient après exposition. La détection contextuelle permet de retenir un contenu fortement concordant avant remise. Une simple liste de mots serait trop imprécise ; le score combine plusieurs catégories et impose une intervention humaine.

## Données

Contenu signalé, identifiants techniques, règles déclenchées, score, pseudonyme, décision, accès et recours. Les données peuvent révéler la vie sexuelle. Aucun contenu n’est transmis à une IA externe ou placé dans une notification.

## Risques

- faux positif et restriction injustifiée ;
- accès indu à une conversation intime ;
- fuite d’un extrait ou d’une identité ;
- discrimination dans les décisions ;
- contournement des règles ;
- conservation excessive.

## Mesures

- termes ambigus insuffisants seuls ;
- aucune sanction permanente automatique ;
- mise en attente expliquée et recours humain ;
- dossier ciblé, pseudonymisé et journalisé ;
- séparation adhérent-modérateur/administrateur ;
- contenu absent des logs, emails et statistiques ;
- effacement à 90 jours ou 12 mois, sauf gel juridique ;
- revue des habilitations et des taux de faux positifs.

## Points à confirmer

- base légale précise et articulation avec l’article 9 RGPD ;
- applicabilité détaillée du DSA et éventuelles exemptions ;
- durées définitives ;
- critères d’escalade vers les autorités ;
- information exacte des personnes et exercice du droit d’opposition.
