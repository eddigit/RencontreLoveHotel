# LHR Premium Events and Production Stabilisation Design

## Objective

Deliver a first production release that makes Love Hotel Rencontre more coherent, premium and commercially credible while fixing the most visible member-facing failures. The release must preserve every current VPS2 production change before altering or redeploying the application.

## Scope

This design covers the first priority release only:

- reconcile the local repository with the actual VPS2 production source without overwriting server-only work;
- integrate the two supplied Paris nightlife photographs into event-related presentation;
- remove obsolete or unsupported restaurant, LOOLYYB, partner and audience claims from active commercial journeys;
- separate public authentication journeys from the authenticated application shell;
- repair the production failures visible on Messages and Matches;
- stop verbose profile and personal-data logging;
- stabilize shared headers, logos, empty states and responsive presentation;
- reinforce consent, privacy, moderation and user-control reassurance;
- test, build, create rollback protection, deploy, and verify the real VPS2-backed production domain and the linked Vercel project.

Deeper redesigns, new business models, database restructuring and unrelated administration work remain outside this release.

## Production truth and source reconciliation

`rencontrelovehotel.com` currently resolves to VPS2 and is served by the healthy `pod-lhr-app` container. The linked Vercel production deployment exists but is not the DNS origin serving the main domain.

The VPS2 working directory contains source files that are absent locally, and its `.git` metadata points to an invalid historical worktree. Therefore:

1. Produce a secret-free inventory and comparison of the local and VPS2 sources.
2. Retrieve only application source that differs, excluding environments, secrets, database backups, generated output, logs and dependencies.
3. Reconcile changes file by file in the local Git repository.
4. Preserve server-only product work unless it conflicts directly with this approved release.
5. Run the complete local verification suite before any remote mutation.

No deployment may replace the VPS2 source tree until this reconciliation is complete and reviewed through Git diff.

## Event visual direction

The user-supplied files are the approved event imagery:

- `evenemtns coquin paris loolyyb.png`: wide Paris limousine scene, used for wide event hero, campaign or empty-state presentation;
- `evenement coquin paris LooLyyb.png`: portrait still life, used for event cards, supporting panels or narrow/mobile presentation.

They will be copied into `public/` under neutral, descriptive filenames that do not mention LOOLYYB. Their visible copy and alternative text will describe premium Paris events, not a cryptocurrency, partnership or guaranteed service.

The imagery should appear only where it strengthens event discovery or event creation. Existing approved jacuzzi, Sophia and Rideaux Ouverts imagery remains in place where it is already the more accurate visual.

## Public experience

The landing page remains a visitor-only experience with a simple public header. Event sections will gain a clearer premium Paris image and direct links to view upcoming events or create a profile.

Public pages must not show the member sidebar merely because an authenticated browser visits `/login` or `/register`. Authentication pages use a focused, reassuring layout with a route back to the public landing and no private navigation clutter.

The obsolete `/rencontres` presentation will be rewritten or redirected into the current positioning. It must not claim a restaurant, 40,000 members, twelve monthly events, a four-star hotel, unnamed premium partners or LOOLYYB benefits unless independently documented and approved.

## Authenticated experience

The existing shared member shell remains the base architecture. Changes focus on consistency rather than a new navigation system:

- stable logo dimensions and no cropping at mobile breakpoints;
- consistent header height, page title spacing and action placement;
- useful event empty states without oversized blank skeletons;
- user-facing language instead of internal terms such as “V2”, “architecture cible” or repository details;
- direct bridges from matches and messages to events, Love Rooms and conciergerie where relevant.

## Messages and Matches reliability

The current errors will be diagnosed from the server action boundary through PostgreSQL schema compatibility. The implementation must preserve the authentication and authorization guards already present.

Expected behavior:

- a member can load their own conversations and match categories;
- an empty dataset produces a helpful empty state, not an error;
- a genuine server or schema problem produces a discreet user message and a structured server log without profile payloads;
- polling does not create repeated error noise or unnecessary requests;
- stale Server Action requests after deployment are handled through cache/version refresh guidance and deployment verification.

## Privacy and reassurance

Production logs must not serialize complete profile collections, personal descriptions, image URLs, SQL parameters containing user data or matching payloads. Development-only diagnostics must be gated or removed.

Marketing and interface reassurance will cover:

- explicit consent and reversible levels of exposure;
- confidentiality of exchanges and conciergerie requests;
- profile visibility controls;
- moderation and community rules;
- no fabricated reviews, statistics or partnerships.

## Testing and verification

Implementation follows test-first changes for behavior and regression-sensitive UI contracts. Required local checks are:

- focused Vitest tests for every corrected behavior;
- `npm test -- --run`;
- `npm run lint`;
- `npm run build`;
- `npm audit --audit-level=high`.

Visual verification covers desktop and mobile for the landing page, login, registration, events, Love Rooms, community, profile, matches, messages and conciergerie.

Before deployment, confirm the VPS2 target, container name, PostgreSQL dependency, Vercel project `love-hotel-rencontre`, Vercel account `gilleskorzec@gmail.com`, and rollback image. A database backup is required only if the diagnosed fix needs a migration or data change.

After deployment, verify the main domain, public routes, private/admin protection, event images, responsive layouts, application and proxy logs, PostgreSQL connectivity, and the absence of new HTTP 5xx errors.

## Success criteria

The release is successful when:

- no VPS2-only source change has been lost;
- event-related surfaces use the supplied photographs appropriately;
- active public journeys contain no obsolete restaurant or LOOLYYB offer and no unsupported claims;
- Messages and Matches load successfully or show valid empty states;
- public authentication pages no longer expose the member shell;
- mobile logos and headers render without cropping or overflow;
- production logs no longer dump profile payloads;
- tests, type checking and build pass;
- the deployed production domain is visually and operationally verified on desktop and mobile.
