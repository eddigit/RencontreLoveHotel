# LHR Anti-Prostitution Compliance Design

**Status:** Approved for implementation on 15 July 2026. Legal wording remains a draft pending review by a French lawyer or DPO before final publication.

## Purpose

Love Hotel Rencontre (LHR), operated by SARL L’HORA, must prevent the platform, its member community, its events, and the Love Hotel Paris Châtelet premises from being used to offer, request, negotiate, or facilitate sexual activity in exchange for money, gifts, accommodation, transport, services, or any other advantage.

The system must demonstrate serious, proportionate, documented prevention without claiming that LHR can determine criminal liability. It must distinguish legitimate hotel, event, and concierge prices from prohibited member-to-member sexual solicitation.

## Legal and Governance Baseline

The compliance file will distinguish binding obligations, community rules that are stricter than the law, recommended safeguards, and points requiring professional legal validation.

Primary sources:

- [French Criminal Code, article 225-5](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006417853/2025-01-29): definition of procuring, including assisting, protecting, or profiting from another person's prostitution.
- [French Criminal Code, article 225-6](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006417855/2020-01-08): conduct assimilated to procuring, including acting as an intermediary in specified circumstances.
- [French Criminal Code, article 225-10](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070719/LEGISCTA000006165301/2025-06-19/): risks related to knowingly tolerating prostitution or client solicitation in premises, and knowingly providing premises for prostitution.
- [French Criminal Code, article 611-1](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070719/LEGISCTA000032398609/2026-04-14): soliciting, accepting, or obtaining a sexual relationship in exchange for remuneration or an advantage in kind.
- [Court of Cassation, Criminal Chamber, 9 October 1996, 95-81.232](https://www.legifrance.gouv.fr/juri/id/JURITEXT000007066349): an intermediary risk identified where manifestly prostitution-related advertisements were distributed with contact details.
- [Regulation (EU) 2022/2065, Digital Services Act](https://eur-lex.europa.eu/eli/reg/2022/2065/oj?locale=fr): terms transparency, notice and action, statements of reasons, human review, complaint handling, and transparency duties where applicable.
- [CNIL guidance on sensitive data and DPIAs](https://www.cnil.fr/fr/comment-gerer-vos-donnees): sex-life and sexual-orientation data are specially protected, and systematic monitoring may require a DPIA.
- [CNIL guidance on access rights](https://www.cnil.fr/fr/securite-gerer-les-habilitations): least privilege, named access, revocation, and periodic review.

SARL L’HORA remains the publisher, service operator, data controller, and final moderation authority. The platform may appoint named `community_moderator` members under a written mandate, confidentiality charter, training, and revocable least-privilege access. Community moderators do not receive general access to private conversations and cannot impose permanent bans or make reports to authorities.

A future association may organize a genuine non-profit member community and member events, but it is a separate legal project. Until it exists and inter-entity agreements have been reviewed, LHR must not claim publicly that such an association exists.

## Public Information and User Commitment

The anti-solicitation policy appears at four levels:

1. The public home page contains a concise and visible community-safety statement and a link to the full charter.
2. The login page contains a compact reminder that paid or compensated sexual solicitation is prohibited and subject to proportionate moderation.
3. Registration requires separate, unchecked confirmations that the user is at least 18, accepts the current terms/privacy documents, and accepts the anti-solicitation charter. The server rejects missing confirmations and records the accepted document versions and timestamp.
4. The terms and a dedicated community-safety charter define prohibited behavior, detection safeguards, human review, sanctions, appeals, and lawful preservation or transmission of evidence.

The public wording must state that:

- LHR is an adult social and dating community, not a marketplace for sexual services;
- offering, requesting, promoting, or negotiating sexual contact for money or any advantage is prohibited;
- official LHR hotel, room, event, and concierge prices are legitimate commercial services and are not member remuneration;
- automated signals may create a confidential alert but do not impose a permanent ban;
- only authorized people may review strictly necessary evidence;
- LHR may preserve and transmit relevant evidence when required or permitted by law;
- no partnership with police, PHAROS, an association, or another specialist service is claimed unless a real documented relationship exists.

## Contextual Detection

The current retrospective keyword scan is replaced by a deterministic, local classifier invoked when a message is sent. No message content is sent to an external AI provider.

Signal families include:

- money and payment methods;
- price and negotiation language;
- gifts and benefits in kind;
- service or performance language;
- time-based or exchange-based negotiation;
- external contact channels;
- explicit sexual-service language;
- repetition or substantially identical outbound messages.

Each rule has a category, weight, severity, active state, and optional phrase form. A single ambiguous term such as `cadeau`, `prix`, or `tarif` cannot by itself create a high-severity case or ban a member. Strong phrases and concordant categories increase the score.

Initial outcomes:

- `allow`: deliver normally and retain no moderation evidence;
- `warn`: deliver, show a rule reminder, and create a confidential low/medium case only when the configured persistence threshold is reached;
- `hold`: do not deliver until an authorized human reviews the content; explain the restriction to the sender;
- `restrict`: for critical combinations, do not deliver and apply a temporary messaging restriction pending administrator review.

No permanent account sanction is automatic. The initial production thresholds and rule set are versioned and test-covered. Official event, room, and concierge content sources are outside the member-message classifier.

## Moderation Case Flow

The moderation system uses focused cases instead of unrestricted conversation browsing.

A case records:

- source type and source identifier;
- subject member and optional reporter;
- policy version, matched rule identifiers, categories, score, and severity;
- the exact flagged content and only a small, explicitly requested adjacent context;
- status, assignment, decisions, reasons, and appeal state;
- named access events;
- retention deadline.

Roles:

- `community_moderator`: sees a pseudonymized subject, flagged content, and minimal context; may mark a false positive, recommend a warning, or escalate;
- `admin`: may reveal identity when necessary, warn, restrict, suspend, ban, reverse a decision, or prepare a lawful authority referral;
- ordinary members: may report another member using a dedicated `paid_sexual_solicitation` reason and may block that member immediately.

Every case view is logged with actor, purpose, case, and timestamp. There is no general search or chronological inbox of all private messages for community moderators. The existing admin bulk-message moderation screen and retrospective scan must be removed from normal operation or converted to case-only access.

## Decisions, Reasons, and Appeals

Available actions are:

1. no action / false positive;
2. educational reminder;
3. formal warning;
4. temporary messaging restriction;
5. temporary account suspension;
6. permanent ban by an administrator;
7. evidence preservation and legal escalation by an administrator.

Negative decisions include a plain-language reason, the contractual ground, whether automation contributed, the duration, and an appeal link. Appeals are reviewed by a different authorized person where practicable. A decision is never confirmed solely by the same automated signal that created the case.

## Data Protection and Retention

The anti-solicitation processing is added to the processing register and a focused DPIA because message analysis may reveal information relating to sex life and may constitute systematic monitoring.

Data minimization rules:

- no external AI or third-party message analysis;
- no content retained for an `allow` result;
- isolated weak terms do not create a named case;
- case access is named, role-based, purpose-bound, and auditable;
- excerpts are never copied into email notifications or application logs;
- alerts contain only case identifiers and severity;
- user-facing analytics use aggregate counts only.

Provisional retention, subject to lawyer/DPO approval:

- false positive or no-action case: 90 days after closure;
- warning, restriction, suspension, ban, or appeal: 12 months after final decision;
- legal hold: until the documented hold is lifted, with periodic review.

A scheduled cleanup deletes expired case evidence and access logs according to the final retention policy while retaining only anonymous aggregate statistics.

## Event Safeguards

Every LHR event must carry a compliance record with:

- legal organizer and responsible contact;
- venue and venue agreement;
- member-only or public classification;
- price breakdown showing that payment covers the event, venue, room, hospitality, or stated service and never access to another member;
- insurance, alcohol, safety, capacity, and authorization checks where applicable;
- on-site consent and anti-solicitation rules;
- named incident contact and escalation path;
- incident log and post-event review.

Member-created event descriptions and comments pass through the same contextual policy engine, with event-specific price fields excluded from anti-solicitation scoring.

## Failure Modes

- If classification fails, the message is not silently lost. It is sent only when no critical rule can be evaluated; otherwise the user receives a temporary retry response and no moderation conclusion is recorded.
- If case creation fails after a held message, the message stays undelivered and the sender receives a retryable error.
- Notification failures do not expose content and do not roll back the case.
- Unauthorized access returns a generic denial and creates a security audit event without exposing whether a case exists.
- Rule updates are atomic, versioned, and attributable to an administrator.

## Verification and Evidence

Automated tests cover:

- public home, login, registration, terms, and charter wording;
- server-side rejection of incomplete or stale consent;
- versioned consent evidence;
- ambiguous single terms, strong phrases, combined categories, accents, casing, and false positives;
- official event/room price exclusions;
- message delivery, warning, hold, and critical restriction behavior;
- dedicated reporting and blocking;
- community-moderator least privilege and case pseudonymization;
- admin-only sanctions and appeals;
- audit access records and retention cleanup;
- absence of message text in logs and notifications.

Release checks are the full test suite, TypeScript check, production build, dependency audit, and visual verification of the public, login, registration, charter, reporting, and moderation surfaces.

## Production Rollout

Deployment targets the Vercel production project `love-hotel-rencontre` under the expected `gilleskorzec@gmail.com` account. Database migrations require an explicit backup or confirmed rollback path before application. The sequence is:

1. deploy additive database structures and inactive rules;
2. deploy UI, consent, reporting, case access, and classifier code;
3. seed and activate the reviewed rule set;
4. verify production flows non-destructively with fictitious content;
5. monitor case creation, false positives, errors, and access logs;
6. tune thresholds without weakening the prohibition or enabling automated permanent sanctions.

