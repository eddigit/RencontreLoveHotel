# Migration Base De Donnees VPS2

Objectif: faire tourner Love Hotel Rencontre sur une base PostgreSQL hebergee sur VPS2, en remplacant la dependance Neon par `DATABASE_URL`.

## Etat Code

- Le client applicatif est centralise dans `lib/db.ts`.
- L'application accepte `DATABASE_URL` en priorite, puis `POSTGRES_URL` en compatibilite.
- `DATABASE_SSL=true` active SSL pour PostgreSQL.
- Les imports directs Neon ont ete retires.

## Creation Base VPS2

Sur VPS2, creer une base et un utilisateur dedie:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE lhr;
CREATE USER lhr_app WITH ENCRYPTED PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE lhr TO lhr_app;
\c lhr
GRANT ALL ON SCHEMA public TO lhr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lhr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO lhr_app;
```

Importer le schema si la base est neuve:

```bash
psql "postgresql://lhr_app:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/lhr" -f schema.sql
```

## Transfert Depuis La Base Actuelle

Depuis un poste qui a acces a l'ancienne base:

```bash
pg_dump --format=custom --no-owner --no-acl "$OLD_DATABASE_URL" > lhr.dump
```

Copier le dump vers VPS2:

```bash
scp lhr.dump damien@VPS2:/tmp/lhr.dump
```

Restaurer sur VPS2:

```bash
pg_restore --clean --if-exists --no-owner --no-acl \
  --dbname "postgresql://lhr_app:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/lhr" \
  /tmp/lhr.dump
```

Verifier les tables principales:

```bash
psql "postgresql://lhr_app:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/lhr" \
  -c "SELECT 'users' AS table_name, count(*) FROM users UNION ALL SELECT 'events', count(*) FROM events UNION ALL SELECT 'messages', count(*) FROM messages;"
```

## Variables Vercel

Mettre a jour les variables du projet Vercel `love-hotel-rencontre`:

```env
DATABASE_URL=postgresql://lhr_app:CHANGE_ME_STRONG_PASSWORD@VPS2_HOST:5432/lhr
DATABASE_SSL=false
```

Si PostgreSQL est expose publiquement, preferer SSL:

```env
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

Conserver aussi les variables existantes non liees a la base: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`, `BLOB_READ_WRITE_TOKEN`, SMTP et OAuth.

## Validation

Localement:

```bash
npm run build
npx vitest run tests/db-postgres-client.test.ts
```

Apres deploiement:

```bash
curl -I https://rencontrelovehotel.com
```

Puis verifier dans l'application:

- connexion utilisateur
- chargement profil
- upload/liste/suppression photo
- pages admin statistiques
- inscription evenement

## Etat VPS2 Au 2026-06-10

Stack cree sur VPS2:

```text
/opt/mybotia/pods/pod-lhr
```

Services Docker:

```text
pod-lhr-postgres  postgres:17   healthy
pod-lhr-app       pod-lhr-app   healthy   127.0.0.1:3190->3000
```

Dump source Neon:

```text
/opt/mybotia/backups/lhr/neon-lhr-current.dump
/opt/mybotia/backups/lhr/neon-lhr-20260610T094440Z.dump
sha256: e82cad5801647122226fca2c1c4b7ff7abd8e12cce36c36c6df320bb254fa96f
```

Base restauree dans le Postgres dedie du pod:

```text
database: lhr
user: lhr_app
volume: pod-lhr-pg-data
network: pod-lhr-net
```

Comptages verifies apres restauration:

```text
users=1277
user_profiles=1019
user_preferences=994
user_meeting_types=994
user_additional_options=994
user_matches=2600
conversations=318
conversation_participants=591
messages=397
photos=178
events=22
event_participants=43
conciergerie_requests=10
notifications=2880
```

Verification HTTP locale VPS2:

```text
http://127.0.0.1:3190/      200
http://127.0.0.1:3190/login 200
```

Reste a faire avant bascule publique:

- brancher le reverse proxy/Nginx sur `127.0.0.1:3190`
- pointer le domaine cible vers VPS2 si necessaire
- remplacer les variables Vercel par la base VPS2 uniquement au moment de la bascule
- faire un dernier dump delta Neon juste avant coupure si des utilisateurs ont continue a utiliser le site

## Etat Beta VPS2 Au 2026-06-10

Stack beta creee sur VPS2:

```text
/opt/mybotia/pods/pod-lhr-beta
```

URL beta:

```text
https://beta-lhr.mybotia.com
```

Services Docker beta:

```text
pod-lhr-beta-postgres  postgres:17        healthy
pod-lhr-beta-app       pod-lhr-beta-app   healthy   127.0.0.1:3191->3000
```

Base beta restauree depuis le dump Neon courant:

```text
database: lhr_beta
user: lhr_beta_app
volume: pod-lhr-beta-pg-data
network: pod-lhr-beta-net
```

Comptages verifies dans la base beta:

```text
users=1277
user_profiles=1019
messages=397
events=22
notifications=2880
```

Verification HTTP beta:

```text
http://127.0.0.1:3191/                    200
http://127.0.0.1:3191/login               200
https://beta-lhr.mybotia.com/             200
https://beta-lhr.mybotia.com/login        200
```

Reverse proxy:

```text
/opt/mybotia/nginx/conf/beta-lhr.mybotia.com.conf
certificat: /etc/letsencrypt/live/mybotia.com, SAN *.mybotia.com
```

La stack existante `pod-lhr` reste active separement sur `127.0.0.1:3190`.

## Stabilisation Beta Au 2026-06-10

Changements appliques uniquement a `pod-lhr-beta`:

```text
authOptions extrait dans lib/auth.ts
bouton Google masque par defaut tant que NEXT_PUBLIC_ENABLE_OAUTH != true
messages.read normalise en messages.is_read
```

Migration appliquee:

```text
migrations/20260610_normalize_messages_is_read.sql
```

Verification apres deploiement:

```text
https://beta-lhr.mybotia.com/login  200
https://beta-lhr.mybotia.com/       200
bouton Google dans login HTML       0 occurrence
colonnes messages                   is_read uniquement
pod-lhr-beta-app                    healthy
pod-lhr production                  200
```

## Repere De Deploiement Beta

Depuis le 2026-06-10, le footer affiche la date et l'heure du dernier deploiement beta:

```text
Deploiement : JJ/MM/AAAA HH:mm · build N
```

Le build Docker lance `npm run version` avant `next build`, avec `VERSION_INCREMENT=false`,
pour mettre a jour l'horodatage embarque dans `/public/version.json`.

Avant chaque envoi beta depuis le poste de travail:

```text
npm run version
```

Important: lors d'un redeploiement VPS2, conserver imperativement:

```text
/opt/mybotia/pods/pod-lhr-beta/app.env
/opt/mybotia/pods/pod-lhr-beta/.env
/opt/mybotia/pods/pod-lhr-beta/secrets/
/opt/mybotia/pods/pod-lhr-beta/docker-compose.yml
```

## Quick Fixes Beta Build 7

Date: 2026-06-10

Changements deployes sur `pod-lhr-beta`:

```text
AdminTabs responsive
Roadmap enrichie et textes corriges
compteurs Roadmap sur dashboard admin
routes vides remplacees par redirections/reponse API
messagerie: etats chargement/vide/erreur et suppression boutons media inactifs
reset password: logs sensibles retires
TypeScript reactive dans le build Next
compte admin beta dedie cree en base beta
plans separes crees pour les gros chantiers
```

Verification:

```text
npx vitest run tests/roadmap-data.test.ts tests/deployment-info.test.ts tests/login-oauth-visibility.test.ts tests/auth-config.test.ts tests/messaging-schema-migration.test.ts
10 tests OK
npx tsc --noEmit OK
npm run build OK avec validation TypeScript active
pod-lhr-beta-app healthy
https://beta-lhr.mybotia.com/version.json buildNumber=7
connexion beta-admin@mybotia.com OK
https://beta-lhr.mybotia.com/admin/roadmap 200 avec session admin
bouton Google login 0 occurrence
footer: Deploiement 10/06/2026 13:37 build 7
```
