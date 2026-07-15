import { sql } from '@/lib/db'
import { assertUsersCanInteract } from '@/lib/member-safety'
import { createAppNotificationRecord } from '@/lib/notification-service'

export type EventParticipationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export type EventParticipationDecision = 'accept' | 'reject'

export type EventParticipationResult = {
  success: boolean
  status?: EventParticipationStatus
  error?: string
}

type EventContext = {
  id: string
  creator_id: string
  title: string
  publication_status: string
  is_upcoming: boolean
}

type ParticipationContext = {
  id: string
  event_id: string
  user_id: string
  status: EventParticipationStatus
  creator_id: string
  title: string
}

export async function requestParticipation(input: {
  eventId: string
  actorId: string
}): Promise<EventParticipationResult> {
  const [event] = await sql.query<EventContext[]>(
    `SELECT
       id,
       creator_id,
       title,
       publication_status,
       (event_date + COALESCE(event_time, '23:59:59'::time)) > NOW() AS is_upcoming
     FROM events
     WHERE id = $1`,
    [input.eventId]
  )

  if (!event) return { success: false, error: 'Événement introuvable.' }
  if (event.creator_id === input.actorId) {
    return { success: false, error: 'Vous organisez déjà cet événement.' }
  }
  if (event.publication_status !== 'published') {
    return { success: false, error: 'Cet événement n’est pas encore publié.' }
  }
  if (!event.is_upcoming) {
    return { success: false, error: 'Cet événement est terminé.' }
  }

  await assertUsersCanInteract(input.actorId, event.creator_id)

  const [request] = await sql.query<Array<{ id: string; status: EventParticipationStatus }>>(
    `INSERT INTO event_participants (
       event_id, user_id, status, joined_at, created_at, updated_at
     )
     VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (event_id, user_id) DO UPDATE
     SET status = 'pending',
         decided_by = NULL,
         decided_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE event_participants.status IN ('rejected', 'withdrawn')
     RETURNING id, status`,
    [input.eventId, input.actorId]
  )

  if (!request) {
    const [existing] = await sql.query<Array<{ status: EventParticipationStatus }>>(
      `SELECT status
       FROM event_participants
       WHERE event_id = $1 AND user_id = $2`,
      [input.eventId, input.actorId]
    )
    return existing
      ? { success: true, status: existing.status }
      : { success: false, error: 'La demande n’a pas pu être enregistrée.' }
  }

  await createAppNotificationRecord({
    userId: event.creator_id,
    type: 'event_participation_request',
    title: 'Nouvelle demande de participation',
    description: `Un membre souhaite participer à « ${event.title} ».`,
    link: '/events?view=owned',
    category: 'events',
    metadata: { eventId: event.id, participationId: request.id },
    createdBy: input.actorId
  })

  return { success: true, status: request.status }
}

export async function withdrawParticipation(input: {
  eventId: string
  actorId: string
}): Promise<EventParticipationResult> {
  const [participation] = await sql.query<Array<{ id: string; status: EventParticipationStatus }>>(
    `UPDATE event_participants
     SET status = 'withdrawn',
         decided_by = NULL,
         decided_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE event_id = $1
       AND user_id = $2
       AND status IN ('pending', 'accepted')
     RETURNING id, status`,
    [input.eventId, input.actorId]
  )

  return participation
    ? { success: true, status: participation.status }
    : { success: false, error: 'Aucune participation active.' }
}

export async function decideParticipation(input: {
  participationId: string
  actorId: string
  actorRole?: string | null
  decision: EventParticipationDecision
}): Promise<EventParticipationResult> {
  const [context] = await sql.query<ParticipationContext[]>(
    `SELECT
       ep.id,
       ep.event_id,
       ep.user_id,
       ep.status,
       e.creator_id,
       e.title
     FROM event_participants ep
     JOIN events e ON e.id = ep.event_id
     WHERE ep.id = $1`,
    [input.participationId]
  )

  if (!context) return { success: false, error: 'Demande introuvable.' }
  if (context.creator_id !== input.actorId && input.actorRole !== 'admin') {
    throw new Error('Action réservée à l’organisateur de cet événement.')
  }
  if (context.status !== 'pending') {
    return { success: true, status: context.status }
  }

  const status: EventParticipationStatus = input.decision === 'accept' ? 'accepted' : 'rejected'
  const query = status === 'accepted'
    ? `WITH capacity AS (
         SELECT
           e.id,
           e.max_participants,
           COUNT(accepted.id)::INTEGER AS accepted_count
         FROM events e
         LEFT JOIN event_participants accepted
           ON accepted.event_id = e.id AND accepted.status = 'accepted'
         WHERE e.id = $2
         GROUP BY e.id, e.max_participants
       )
       UPDATE event_participants ep
       SET status = 'accepted',
           decided_by = $3,
           decided_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       FROM events e, capacity
       WHERE ep.id = $1
         AND ep.event_id = e.id
         AND e.id = capacity.id
         AND ep.status = 'pending'
         AND capacity.accepted_count < e.max_participants
       RETURNING ep.id, ep.status`
    : `UPDATE event_participants
       SET status = 'rejected',
           decided_by = $3,
           decided_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND event_id = $2 AND status = 'pending'
       RETURNING id, status`

  const [updated] = await sql.query<Array<{ id: string; status: EventParticipationStatus }>>(
    query,
    [input.participationId, context.event_id, input.actorId]
  )

  if (!updated) {
    return status === 'accepted'
      ? { success: false, error: 'L’événement est complet.' }
      : { success: false, error: 'La demande a déjà été traitée.' }
  }

  await createAppNotificationRecord({
    userId: context.user_id,
    type: 'event_participation_decision',
    title: status === 'accepted' ? 'Participation acceptée' : 'Demande de participation refusée',
    description: status === 'accepted'
      ? `Votre participation à « ${context.title} » est confirmée.`
      : `L’organisateur n’a pas retenu votre demande pour « ${context.title} ».`,
    link: '/events?view=participating',
    category: 'events',
    metadata: { eventId: context.event_id, participationId: context.id, status },
    createdBy: input.actorId
  })

  return { success: true, status: updated.status }
}

export async function listMemberParticipations(actorId: string) {
  const participations = await sql.query<Array<Record<string, unknown>>>(
    `SELECT
       ep.id AS participation_id,
       ep.status AS participation_status,
       ep.updated_at AS participation_updated_at,
       e.*,
       owner.name AS creator_name,
       owner.avatar AS creator_avatar,
       (SELECT COUNT(*) FROM event_participants accepted
        WHERE accepted.event_id = e.id AND accepted.status = 'accepted') AS participant_count
     FROM event_participants ep
     JOIN events e ON e.id = ep.event_id
     JOIN users owner ON owner.id = e.creator_id
     WHERE ep.user_id = $1
       AND ep.status IN ('pending', 'accepted', 'rejected')
       AND e.creator_id <> $1
     ORDER BY e.event_date ASC, e.event_time ASC`,
    [actorId]
  )
  return participations.map(({ booking_reference: _bookingReference, ...participation }) => participation)
}

export async function listOwnedEventRequests(actorId: string) {
  return sql.query(
    `SELECT
       ep.id AS participation_id,
       ep.status AS participation_status,
       ep.created_at AS requested_at,
       e.id AS event_id,
       e.title AS event_title,
       requester.id AS requester_id,
       requester.name AS requester_name,
       requester.avatar AS requester_avatar
     FROM events e
     JOIN event_participants ep ON ep.event_id = e.id
     JOIN users requester ON requester.id = ep.user_id
     WHERE e.creator_id = $1
       AND ep.user_id <> e.creator_id
       AND ep.status = 'pending'
     ORDER BY ep.created_at ASC`,
    [actorId]
  )
}
