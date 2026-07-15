# LHR Product & Growth Cockpit Design

## Objective

Build an admin-only cockpit for Love Hotel Rencontre that turns live product data into an evidence-backed diagnosis and a prioritized action plan, while correcting the most important causes of community stagnation: incomplete profiles, repeated exposure, dormant match requests, weak conversation activation, absent future events, and incomplete trust-and-safety workflows.

This design applies only to Love Hotel Rencontre and its production site `rencontrelovehotel.com`.

## Current evidence

The production-configured database audit on 15 July 2026 found:

- 1,308 user accounts and 1,046 profile rows;
- 262 accounts without a profile row;
- about 1,017 profiles eligible under the current display rules;
- 252 profiles with an avatar or photo, 178 with a biography, and 99 with the core age/location/bio fields;
- 2,723 match rows, including 2,432 pending and 265 accepted;
- 318 conversations, including 140 empty conversations, 97 with one message, and only 23 with messages from both participants;
- 22 past events and no future event in the audited database.

The community page currently retrieves 36 candidates, orders that pool by online state, avatar, historical accepted-match count, and creation date, then re-sorts only that pool by compatibility and displays eight. This creates a popularity feedback loop and explains why members repeatedly see the same profiles.

## Product principles

1. Compatibility and commercial promotion are separate. Premium or featured status must never inflate the compatibility score.
2. Visibility is consensual. Creating a missing profile shell does not automatically publish an incomplete profile.
3. Community liquidity is measured from exposure to real conversation, not from account totals.
4. Diagnostics are deterministic and auditable. Every warning cites a metric, threshold, and recommended action.
5. Private content is excluded from analytics. The cockpit uses aggregate counts and event names, never message bodies or intimate free text.
6. The application remains a modular Next.js/PostgreSQL monolith. No microservice rewrite is required at the current scale.
7. Every admin server action must enforce `requireAdmin()` internally.

## Cockpit information architecture

The new `/admin/diagnostic` route is added to the admin navigation. It contains:

- an executive product-health score;
- seven pillar scores: community, profile quality, discovery fairness, matching, messaging, events, and trust/architecture;
- a funnel from accounts to eligible profiles, exposed profiles, match requests, accepted matches, started conversations, reciprocal conversations, and event participation;
- current-period metrics and 30/90-day trends when data exists;
- diagnostic cards with severity, evidence, business impact, exact next action, and effort;
- a prioritized action plan sorted by severity, impact, and effort;
- a data-source and schema-readiness panel so missing migrations cannot silently appear as zero activity.

The first version is rule based. An AI narrative layer is explicitly deferred until the deterministic measures are stable.

## Data model

### Product events

Add `product_events` for privacy-safe product instrumentation:

- `id`, `event_name`, `user_id`, `subject_id`, `session_id`, `source`, `metadata`, `created_at`;
- allowlisted event names only;
- metadata contains bounded categorical or numerical values, not message text, biography text, email addresses, or precise location;
- indexes on `(event_name, created_at)`, `(user_id, created_at)`, and `(subject_id, event_name, created_at)`.

Initial events include `profile_impression`, `profile_opened`, `match_request_sent`, `match_accepted`, `conversation_started`, `message_sent`, `message_replied`, `event_viewed`, `event_joined`, `booking_clicked`, and `conciergerie_submitted`.

### Diagnostic snapshots

Add `diagnostic_snapshots` for daily aggregate history. Each snapshot stores its capture date, the metric payload, overall score, pillar scores, and creation time. It contains aggregates only.

### Match lifecycle

Extend `user_matches` with `expires_at`, `responded_at`, and an optional `context` JSON object that identifies the profile element that prompted a request without copying sensitive content. Add a canonical unordered-pair unique index to prevent reverse duplicates.

### Moderation relationships

Add `user_blocks` and `user_reports`. Blocking hides profiles in both directions, prevents new match requests, removes the active relationship from discovery, and prevents messaging. Reports enter the existing moderation queue when that table is available.

## Discovery ranking

Discovery uses a larger eligible candidate pool and produces a viewer-specific, session-stable order. Hard filters run first:

- not the viewer;
- profile explicitly visible;
- onboarding completed;
- user active and not banned;
- not blocked in either direction;
- not an already accepted, pending, or recently rejected relationship;
- reciprocal gender/orientation compatibility when enough data exists.

Ranking then combines:

- compatibility: 40%;
- profile freshness/activity: 20%;
- exposure deficit over the previous 14 days: 20%;
- profile quality: 10%;
- deterministic exploration/novelty: 10%.

The page displays twelve profiles initially and offers a refresh control that advances to another deterministic batch. No profile can dominate because accepted-match popularity is removed from ranking and recent impressions reduce ranking weight.

## Profile recovery

An idempotent admin recovery action creates private profile shells for accounts that lack `user_profiles`. It does not set `display_profile` to true. The cockpit reports recoverable cohorts:

- missing profile shell;
- onboarding incomplete;
- visible profile without media;
- visible profile without biography;
- profile not updated recently.

The user-facing profile editor shows a completion score and the next concrete improvement. Existing email-governance rules remain unchanged; any recovery email must use the explicit campaign opt-in workflow.

## Match workflow

- Pending requests expire after 30 days and become excluded from active pending counts.
- The receiver can accept or decline; both operations record `responded_at`.
- A newly accepted match creates or reuses a two-person conversation immediately.
- Match requests can reference a profile element such as photo, bio, event interest, or meeting intention.
- Rate limits prevent bulk requests.
- Compatibility scores use reciprocal preferences only; featured and premium signals are removed.
- Accepted, pending, blocked, and recently rejected members do not continue to occupy discovery slots.

## Messaging workflow

- An accepted match always has one valid two-participant conversation.
- Empty conversation cards show contextual opening prompts.
- A first message records `conversation_started`; the first message from the other participant records `message_replied`.
- Read state remains supported.
- Blocking, reporting, and unmatching are available from the conversation.
- The initial release keeps the existing request/refresh transport and avoids a premature WebSocket service. The cockpit measures latency and activity before a real-time transport is selected.
- Attachments keep the existing server-side validation and are covered by moderation and size limits.

## Events and marketing

- The homepage keeps its premium visual positioning.
- Public event teaser pages may be crawlable without exposing attendees or member-only details.
- Event structured data is emitted only for genuinely public/bookable events; member-only events are not falsely marked for Google rich results.
- Acquisition attribution captures source, medium, campaign, and referrer at registration using bounded fields.
- The cockpit reports visit-to-registration data only after instrumentation exists and clearly labels unavailable metrics.
- Organic local content and hotel/event partnerships are prioritized because paid dating advertising requires platform certification and carries sexual-theme restrictions.
- Illustrative people must never be presented as real members without clear disclosure.

## Architecture and migration discipline

- Database schema changes are applied by versioned SQL migrations, never by runtime `ALTER TABLE` calls in member requests.
- The cockpit reports required-column and required-table readiness.
- Expensive aggregates run in parallel and fail per pillar, not as a silent global zero.
- Daily snapshots make trends cheap to render.
- Existing Next.js App Router, server actions, PostgreSQL, NextAuth, and UI components are retained.
- Sensitive routes keep authorization, upload validation, rate limits, and privacy-safe logging.

## Testing and release

The implementation follows test-first development for diagnostic rules, discovery ranking, match lifecycle, moderation guards, instrumentation privacy, admin authorization, and UI entry points. Verification includes targeted tests, the complete Vitest suite, TypeScript, production build, migration validation, and a visual browser pass on desktop and mobile.

Production deployment requires a database backup before migrations, migration application against the confirmed LHR database, application deployment to the service behind `rencontrelovehotel.com`, and post-deployment checks for version, authentication, admin cockpit, discovery, matching, messaging, events, and legal/contact routes.
