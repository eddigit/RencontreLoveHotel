# Admin Activity History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher dans l’administration LHR un graphique continu de l’activité membre depuis la première donnée disponible, accompagné d’un indicateur de reprise sur deux fenêtres complètes de 30 jours.

**Architecture:** Une nouvelle action serveur admin agrège l’historique PostgreSQL par jour, semaine ou mois, sépare les conversations entre membres des conversations de service et calcule la reprise sur les messages. Le composant KPI existant charge cet historique séparément et l’affiche dans une carte Recharts à double axe.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, PostgreSQL, Recharts 2.15, Vitest.

## Global Constraints

- L’historique commence à la première donnée disponible et ne possède pas de limite arbitraire de 90 jours.
- Les conversations contenant un administrateur sont exclues des séries membre.
- La journée en cours est exclue des deux fenêtres comparatives de 30 jours.
- Les périodes sans activité sont présentes avec une valeur zéro.
- Toute lecture serveur appelle `requireAdmin()`.
- Aucune nouvelle dépendance n’est ajoutée.
- Le résultat doit être déployé et vérifié sur `https://rencontrelovehotel.com` via VPS2.

---

### Task 1: Historique et signal de reprise côté serveur

**Files:**
- Modify: `actions/messaging-recovery-actions.ts`
- Modify: `tests/messaging-recovery-actions.test.ts`

**Interfaces:**
- Consumes: `MessagingRecoveryScale`, `sql.query`, `requireAdmin()`.
- Produces: `getMessagingRecoveryHistory({ scale })`, `MessagingRecoveryHistory`, `MessagingRecoveryHistoryPoint`, `MessagingRecoveryTrend`.

- [ ] **Step 1: Write the failing authorization and mapping tests**

Ajouter des tests qui exigent l’autorisation admin, simulent une série contenant une période vide et vérifient le contrat suivant :

```ts
expect(result).toEqual({
  startsAt: '2025-01-01',
  trend: {
    status: 'recovering',
    changePercent: 25,
    recentMessages: 100,
    previousMessages: 80
  },
  series: [{
    period: '2025-01-01',
    messages: 0,
    activeConversations: 0,
    createdConversations: 0,
    acceptedMatches: 0
  }]
})
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `npm test -- --run tests/messaging-recovery-actions.test.ts`

Expected: FAIL because `getMessagingRecoveryHistory` is not exported.

- [ ] **Step 3: Implement the minimal history query and mapping**

Ajouter les types publics et une action qui :

```ts
export async function getMessagingRecoveryHistory({
  scale = 'week'
}: { scale?: MessagingRecoveryScale } = {}): Promise<MessagingRecoveryHistory>
```

La requête utilise les CTE `conversation_types`, `period_bounds`, `periods`, `message_counts`, `created_counts`, `match_counts`, `comparison_windows`, puis renvoie la série et les totaux des fenêtres de 30 jours. Le statut vaut `recovering` au-dessus de 5 %, `declining` sous -5 %, sinon `stable`.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `npm test -- --run tests/messaging-recovery-actions.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the server history**

```bash
git add actions/messaging-recovery-actions.ts tests/messaging-recovery-actions.test.ts
git commit -m "feat: add lifetime messaging activity history"
```

### Task 2: Graphique historique dans l’administration

**Files:**
- Modify: `components/admin-messaging-recovery.tsx`
- Modify: `tests/admin-messaging-recovery-ui.test.ts`

**Interfaces:**
- Consumes: `getMessagingRecoveryHistory({ scale })` et son contrat de Task 1.
- Produces: une carte « Activité depuis le lancement » avec double axe et résumé de reprise.

- [ ] **Step 1: Write the failing UI contract test**

Ajouter des assertions pour :

```ts
expect(component).toContain('Activité depuis le lancement')
expect(component).toContain('30 derniers jours complets')
expect(component).toContain("yAxisId='messages'")
expect(component).toContain("yAxisId='activity'")
expect(component).toContain('createdConversations')
expect(component).toContain('activeConversations')
expect(component).toContain('getMessagingRecoveryHistory')
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `npm test -- --run tests/admin-messaging-recovery-ui.test.ts`

Expected: FAIL on the new historical labels and axes.

- [ ] **Step 3: Implement the chart and isolated loading/error state**

Charger `getMessagingRecoveryStats` et `getMessagingRecoveryHistory` en parallèle à chaque changement d’échelle. Ajouter une carte avec : deux `YAxis`, quatre `Line`, un tooltip français, une date de début visible et un badge de tendance calculé par le serveur. Le graphique historique échoue indépendamment des cartes KPI existantes.

- [ ] **Step 4: Run targeted UI and server tests**

Run: `npm test -- --run tests/admin-messaging-recovery-ui.test.ts tests/messaging-recovery-actions.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the admin chart**

```bash
git add components/admin-messaging-recovery.tsx tests/admin-messaging-recovery-ui.test.ts
git commit -m "feat: chart admin activity since launch"
```

### Task 3: Vérification complète et mise en production VPS2

**Files:**
- No source file changes expected.

**Interfaces:**
- Consumes: commits des Tasks 1 et 2.
- Produces: image Docker de production vérifiée sur le domaine public.

- [ ] **Step 1: Run all automated checks**

Run: `npm test -- --run && npm run lint && npm run build`

Expected: tous les tests passent, TypeScript ne signale aucune erreur et Next.js produit le build.

- [ ] **Step 2: Back up production before deployment**

Créer un dump PostgreSQL horodaté et conserver l’image Docker actuelle sous un tag `pre-admin-history`.

- [ ] **Step 3: Build an exact release archive from Git HEAD on VPS2**

Créer une archive `git archive HEAD`, la transférer sur VPS2, vérifier son SHA-256 et construire `pod-lhr-app:latest` depuis ce contexte propre.

- [ ] **Step 4: Recreate only the application container**

Exécuter `docker compose -f docker-compose.lhr.yml up -d --no-deps --force-recreate app` puis attendre l’état `healthy` sans redémarrage.

- [ ] **Step 5: Verify the public application**

Vérifier HTTP 200 sur `/`, `/login`, `/admin` avec redirection suivie et sur une ressource statique. Vérifier dans le bundle serveur la présence de « Activité depuis le lancement » et exécuter la requête historique directement contre PostgreSQL.

- [ ] **Step 6: Audit post-deployment errors**

Vérifier qu’aucun 5xx ni message `error|exception|fatal|failed` n’apparaît depuis le nouveau démarrage.
