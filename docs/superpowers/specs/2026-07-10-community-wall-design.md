# Mur D'Annonces Communauté - Design

## Contexte

Love Hotel Rencontre dispose déjà d'un accueil connecté sur `/discover`, d'une landing publique sur `/`, de server actions protégées par `requireCurrentUser()` / `requireAdmin()`, et d'une fondation de modération avec `moderation_keywords` et `moderation_queue`.

Le mur d'annonces communauté ajoute une activité visible au centre de l'accueil membre sans exposer de contenu réel aux visiteurs anonymes.

## Objectifs

- Permettre aux membres connectés de publier une annonce texte de type `profil`, `evenement` ou `dispo_rideaux_ouverts`.
- Permettre aux membres connectés de commenter les annonces.
- Créer une raison de revenir quotidiennement sur l'accueil communauté.
- Intégrer la modération dès la v1 : mots-clés, signalements, masquage automatique, arbitrage admin.
- Garder la page publique strictement anonymisée avec un teaser de conversion.

## Non-Objectifs V1

- Pas d'upload photo sur le mur.
- Pas de likes.
- Pas d'algorithme de tri.
- Pas d'édition d'annonce après publication.
- Pas de notifications push ou notification auteur sur commentaire.
- Pas de contenu réel du mur sur la landing publique.

## Architecture

### Base de données

Migration versionnée `migrations/20260710_community_wall.sql`.

Tables :

- `wall_posts`
  - `id UUID PRIMARY KEY`
  - `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
  - `type TEXT NOT NULL CHECK (type IN ('profil', 'evenement', 'dispo_rideaux_ouverts'))`
  - `body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500)`
  - `event_id UUID REFERENCES events(id) ON DELETE SET NULL`
  - `expires_at TIMESTAMPTZ`
  - `status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'removed'))`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`

- `wall_comments`
  - `id UUID PRIMARY KEY`
  - `post_id UUID NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE`
  - `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
  - `body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 300)`
  - `status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'removed'))`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`

- `wall_reports`
  - `id UUID PRIMARY KEY`
  - `target_type TEXT NOT NULL CHECK (target_type IN ('wall_post', 'wall_comment'))`
  - `target_id UUID NOT NULL`
  - `reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
  - `reason TEXT`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - unique pair `(target_type, target_id, reporter_id)`

Indexes :

- `idx_wall_posts_feed` on `(status, created_at DESC)` with active-readable filters.
- `idx_wall_posts_user_created` on `(user_id, created_at DESC)`.
- `idx_wall_posts_event` on `(event_id)`.
- `idx_wall_comments_post_created` on `(post_id, created_at ASC)`.
- `idx_wall_comments_user_created` on `(user_id, created_at DESC)`.
- `idx_wall_reports_target` on `(target_type, target_id)`.

The moderation queue migration also expands `moderation_queue.source_type` to accept `wall_post` and `wall_comment`.

### Server Actions

Create `actions/community-wall-actions.ts`.

Public exports:

- `getCommunityWallFeed(input?: { limit?: number })`
  - Requires current user.
  - Returns active posts only.
  - Filters expired `dispo_rideaux_ouverts` posts by `expires_at > NOW()`.
  - Filters linked event posts if the event date/time is past.
  - Includes author id, name, avatar, event summary, active comment count, and first active comments needed by the UI.

- `getWallComposerEvents()`
  - Requires current user.
  - Returns published upcoming events for the event picker.
  - Used only to link an announcement to a real event; posting without `event_id` remains allowed.

- `createWallPost(input)`
  - Requires current user.
  - Validates type, body length, event link, and expiration.
  - `dispo_rideaux_ouverts` requires duration 24 or 48 hours.
  - `evenement` can link only to a published upcoming event, or no event.
  - Enforces max 3 posts per user per rolling 24 hours.
  - Scans active moderation keywords.
  - If keyword matched, inserts post with `hidden` status and creates one `moderation_queue` item.
  - If no keyword matched, inserts post with `active` status.

- `createWallComment(input)`
  - Requires current user.
  - Validates post is visible and not expired.
  - Validates body length max 300.
  - Enforces max 20 comments per user per rolling hour.
  - Scans active moderation keywords.
  - Hidden/comment queue behavior mirrors post creation.

- `reportWallPost(input)` and `reportWallComment(input)`
  - Require current user.
  - Insert a distinct report if not already present.
  - Create or preserve a `moderation_queue` item for the target.
  - Hide the target automatically when report count reaches 3 distinct reporters.

- `removeOwnWallPost(input)`
  - Requires current user.
  - Allows the author to mark their own post as `removed`.
  - Does not delete rows.

Moderation keyword scanning is implemented in a shared helper inside the action file unless an existing helper emerges during implementation. It reads `moderation_keywords WHERE active = true`, matches lowercase substrings, returns highest severity by rank, matched keywords, and action.

### Admin Actions

Extend `actions/admin-moderation-actions.ts`.

Add:

- `getWallModerationQueue()`
  - `requireAdmin()`.
  - Lists moderation queue rows where `source_type IN ('wall_post', 'wall_comment')`, enriched with author profile and excerpt.

- `restoreWallModerationItem(input: { itemId: string })`
  - `requireAdmin()`.
  - Resolves the queue item as `ignored`.
  - Restores the referenced wall post/comment to `active`.
  - Inserts `admin_audit_log`.

- `removeWallModerationItem(input: { itemId: string })`
  - `requireAdmin()`.
  - Resolves the queue item as `actioned`.
  - Marks referenced wall post/comment as `removed`.
  - Inserts `admin_audit_log`.

Existing dashboard counts include wall moderation by default because they count all `moderation_queue` pending rows.

### Member UI

Create:

- `components/community-wall.tsx`
- `components/community-wall-composer.tsx`
- `components/community-wall-post-card.tsx`

Integrate into `app/discover/page.tsx` inside the central column above "En ligne maintenant", because the spec wants the composer and first two announcements visible quickly on mobile.

Behavior:

- Composer at top with three explicit type buttons:
  - `Profil`
  - `Événement`
  - `Rideaux ouverts`
- Textarea max 500 characters with character counter.
- `Rideaux ouverts` shows segmented duration selector `24 h` / `48 h`.
- `Événement` shows optional published-upcoming event selector and "sans lien".
- Submit disabled while pending and after invalid input.
- Success refreshes the feed and clears the form.
- Errors are shown inline in plain French.

Card:

- Avatar and pseudo link to `/profile/{authorId}`.
- Badge per type, with distinct strong treatment for `Rideaux ouverts`.
- Body text.
- Relative timestamp.
- Expiration countdown for `Rideaux ouverts`.
- Event link card for linked events.
- Comment count.
- Comments collapsed by default with "Voir les commentaires".
- Comment form max 300 characters.
- `Signaler` button on posts and comments.
- `Supprimer` button only for the author post.

Empty state:

- Copy: "Le mur est encore calme. Soyez le premier à publier une annonce."
- CTA focuses the composer.

### Public Landing Teaser

Modify `app/landing-page.tsx` with a teaser section:

- Title: "Le mur de la communauté"
- Blurred/anonymized fake rows, no database data.
- CTA to `/register`.
- No real user name, avatar, body, event, count, or timestamp from the wall.

### Admin UI

Modify `app/admin/moderation/page.tsx`.

Add a "Mur" section below the existing recent moderation queue:

- Filtered list of wall queue items.
- Source type badge: annonce/commentaire.
- Author link to profile when `user_id` is present.
- Excerpt.
- Reason and matched keywords.
- Buttons:
  - `Restaurer`
  - `Supprimer`
- Actions call admin server actions with `requireAdmin()`.

### Access Control

- No new public route exposing wall data.
- All wall server actions call `requireCurrentUser()`.
- All wall admin actions call `requireAdmin()`.
- `/discover` is already a protected page and remains the only member entrypoint.
- Landing teaser remains static and anonymized.

### Error Handling

- Validation errors return user-facing French messages.
- Server actions throw for unauthenticated/admin failures through existing helpers.
- Duplicate report by the same user returns success with no duplicate side effect.
- Moderation queue insertion uses `WHERE NOT EXISTS` or equivalent conflict-safe logic to avoid duplicate open queue rows.
- Hidden content remains hidden from `getCommunityWallFeed`.

### Testing Strategy

Vitest coverage:

- Migration creates required tables, constraints, indexes, and moderation source type extension.
- Creating the three post types.
- `Rideaux ouverts` requires 24 h or 48 h expiration and disappears from feed after expiration.
- Event-linked post accepts only published upcoming events and expires when event is past.
- Anti-spam: 3 posts / 24 h, 20 comments / hour.
- Keyword moderation: post/comment becomes `hidden` and inserts queue row.
- Three distinct reports hide post/comment and create queue row.
- Server actions require session.
- Admin moderation actions require admin.
- Landing page contains static teaser copy and does not import/call wall actions.
- `/discover` includes the community wall component.

### Delivery

- Branch: `codex/lhr-community-wall`.
- PR base: `main`.
- Preview Vercel for Gilles validation before merge.
- No production deployment without explicit GO.
