# AGENTS.md - Love Hotel Rencontre

## Projet

- Nom : Love Hotel Rencontre / LHR
- Objectif : application Next.js de rencontres, evenements, love rooms, conciergerie et administration.
- Client / pod : MyBotIA, pod LHR.
- Chemin local : `/Users/admin/Documents/LHR`
- Repo GitHub : `github.com/eddigit/RencontreLoveHotel`
- Production connue : `rencontrelovehotel.com` via Vercel, branche de travail/prod actuelle `codex/lhr-conciergerie-main-menu`.

## Doctrine globale

Lire d'abord :

- `/Users/admin/.codex/AGENTS.md`
- `/Users/admin/Documents/MyBotIA Vault/MyBotIA/00-CODEX-ARMAND/ARMAND-BOOTSTRAP.md`
- `/Users/admin/Documents/MyBotIA Vault/MyBotIA/00-CODEX-ARMAND/MYBOTIA-GOVERNANCE.md`

## Memoire projet

- Note projet Obsidian : non trouvee au 8 juillet 2026 dans `/Users/admin/Documents/MyBotIA Vault/MyBotIA/00-CODEX-ARMAND/PROJECTS/`.
- Ne pas recopier l'historique long ici. Creer une note projet dediee si les decisions LHR doivent etre persistees.

## Credentials et acces

Registres a consulter :

- `/Users/admin/Documents/MyBotIA Vault/MyBotIA/00-CODEX-ARMAND/CREDENTIALS-REGISTRY.md`
- `/Users/admin/Documents/MyBotIA Vault/MyBotIA/00-CODEX-ARMAND/INFRASTRUCTURE-INDEX.md`

Secrets attendus par le projet, sans jamais stocker leurs valeurs :

- `DATABASE_URL`, `DATABASE_SSL`
- `NEXTAUTH_SECRET` ou `AUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`
- `CONCIERGERIE_RECIPIENT_EMAIL` ou fallback operationnel documente `ADMIN_NOTIFICATION_EMAIL` / `FEEDBACK_RECIPIENT_EMAIL`
- `NEXT_PUBLIC_BASE_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_ENABLE_OAUTH`

Regles :

- Ne jamais ecrire de token, cle API, mot de passe, cle SSH privee ou URL avec mot de passe dans ce repo.
- Utiliser les CLI/connecteurs deja authentifies : `gh`, `vercel`, MCP, ssh-agent, Keychain.
- Pour Vercel, compte attendu : `gilleskorzec@gmail.com`, sauf instruction contraire explicite.
- Ne pas push, deployer, modifier DNS/Vercel/DB de production sans GO explicite.

## Damien / VPS2

Damien/VPS2 peut aider a rappeler le contexte serveur et la migration PostgreSQL.

- Acces attendu : MCP global `damien` quand disponible, ou SSH local configure via `~/.ssh/config`, ssh-agent et Keychain.
- Avant action VPS2 : confirmer environnement cible, compte, service, sauvegarde et risque.
- Ne pas modifier systemd, firewall, crons, secrets, base production ou donnees utilisateurs sans GO explicite.

## Commandes projet

- Installer : `npm install --legacy-peer-deps`
- Dev : `npm run dev`
- Tests : `npm test -- --run`
- Typecheck : `npm run lint`
- Build : `npm run build`
- Audit high : `npm audit --audit-level=high`

Note dependances :

- Le flag `--legacy-peer-deps` est actuellement requis. `next-auth@4.24.14` declare un peer optionnel `nodemailer@^7.0.7`, alors que le projet utilise `nodemailer@^9.0.3` pour corriger les CVE high.
- Le provider Email de NextAuth n'est pas utilise dans cette app. Ne pas retirer le flag sans migration Auth.js v5 ou resolution explicite de ce conflit.

## Points d'attention LHR

- Next.js App Router, React 19, NextAuth 4, PostgreSQL via `pg`, Vercel Blob, Nodemailer.
- Les server actions admin doivent appeler `requireAdmin()` en interne, pas seulement compter sur le middleware.
- Les routes et actions qui traitent photos, emails, auth, reset password, conciergerie et admin sont sensibles.
- Les pages `/loolyyb` et `/loolyyb-memecoin` existent encore dans le build et doivent etre traitees comme dette produit/SEO si Oracle/Gilles valide leur retrait.
- La migration Neon vers PostgreSQL VPS2 et le SSL DB doivent etre confirmes avant toute action infrastructure.
