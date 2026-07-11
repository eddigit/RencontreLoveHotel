"use server"

import { sql } from "@/lib/db"
import { notifyEventReservationAdmins } from "@/lib/event-reservation-notifications"
import { createAppNotification } from "@/actions/notification-actions"
import { requireAdmin, requireCurrentUser, requireSameUserOrAdmin } from "@/lib/server-auth"
import { notifyAdminByEmail } from '@/lib/admin-email-notifications'

const activeExperienceTypes = ['jacuzzi', 'open_curtains'] as const
type ActiveExperienceType = (typeof activeExperienceTypes)[number]

function normalizeActiveExperienceType(value?: string | null): ActiveExperienceType {
  if (!value) {
    throw new Error("Type d'expérience obligatoire")
  }

  if (!activeExperienceTypes.includes(value as ActiveExperienceType)) {
    throw new Error("Ce format d'événement est en standby")
  }

  return value as ActiveExperienceType
}

function normalizeEventCapacity(
  experienceType: ActiveExperienceType,
  maxParticipants?: number
) {
  const requestedCapacity = Number(maxParticipants || 0)
  const minCapacity = 2
  const maxCapacity = experienceType === 'jacuzzi' ? 4 : 3
  const capacity = requestedCapacity || maxCapacity

  if (capacity < minCapacity) {
    throw new Error(`Capacité minimale : ${minCapacity}`)
  }

  if (capacity > maxCapacity) {
    throw new Error(
      experienceType === 'jacuzzi'
        ? 'Un apéro jacuzzi est limité à 4 couples maximum'
        : 'Un événement rideaux ouverts est limité à 3 chambres maximum'
    )
  }

  return capacity
}

function normalizeEventDateTime(value: string) {
  const normalized = value.trim().replace(' ', 'T')
  const [datePart, rawTimePart] = normalized.split('T')
  const timePart = rawTimePart || '20:00'

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    throw new Error('Date événement invalide')
  }

  const timeMatch = timePart.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!timeMatch) {
    throw new Error('Heure événement invalide')
  }

  return {
    eventDate: datePart,
    eventTime: `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3] || '00'}`
  }
}

function eventDateTimeHasPassed(event: any) {
  if (!event?.event_date) return false

  const datePart = event.event_date instanceof Date
    ? event.event_date.toISOString().slice(0, 10)
    : String(event.event_date).slice(0, 10)
  const timePart = event.event_time ? String(event.event_time).slice(0, 8) : '23:59:59'
  const eventDate = new Date(`${datePart}T${timePart}`)

  return Number.isFinite(eventDate.getTime()) && eventDate < new Date()
}

export type EventModerationDecision = 'publish' | 'request_correction' | 'reject'

function normalizeModerationDecision(
  decision: EventModerationDecision,
  note?: string
) {
  if (!['publish', 'request_correction', 'reject'].includes(decision)) {
    throw new Error('Décision de modération invalide.')
  }

  const normalizedNote = (note || '').trim().slice(0, 2000)
  if (decision !== 'publish' && normalizedNote.length < 8) {
    throw new Error('Une note de modération est obligatoire pour cette décision.')
  }

  return normalizedNote || null
}

export async function getPendingEventModeration() {
  await requireAdmin()

  return sql.query(
    `
      SELECT
        e.id,
        e.title,
        e.location,
        e.event_date,
        e.event_time,
        e.image,
        e.description,
        e.venue,
        e.experience_type,
        e.max_participants,
        e.publication_status,
        e.created_at,
        e.creator_id,
        u.name AS creator_name,
        u.email AS creator_email,
        u.avatar AS creator_avatar
      FROM events e
      JOIN users u ON u.id = e.creator_id
      WHERE e.publication_status = 'pending_review'
      ORDER BY e.created_at ASC
    `,
    []
  )
}

export async function moderateEvent(
  eventId: string,
  decision: EventModerationDecision,
  note?: string
) {
  const admin = await requireAdmin()
  const normalizedNote = normalizeModerationDecision(decision, note)
  const [event] = await sql.query<{
    id: string
    title: string
    creator_id: string | null
    publication_status: string
  }[]>(
    `
      SELECT id, title, creator_id, publication_status
      FROM events
      WHERE id = $1
      LIMIT 1
    `,
    [eventId]
  )

  if (!event) {
    throw new Error('Événement introuvable.')
  }

  if (event.publication_status !== 'pending_review') {
    throw new Error('Cet événement ne figure plus dans la file de validation.')
  }

  const status = decision === 'publish'
    ? 'published'
    : decision === 'reject'
      ? 'rejected'
      : 'pending_review'

  await sql.query(
    `
      UPDATE events
      SET publication_status = $1,
          moderation_note = $2,
          moderated_by = $3,
          moderated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `,
    [status, normalizedNote, admin.id, eventId]
  )

  if (event.creator_id) {
    await createAppNotification({
      userId: event.creator_id,
      type: 'event_moderation',
      title: status === 'published'
        ? 'Votre événement est publié'
        : status === 'rejected'
          ? 'Votre événement a été refusé'
          : 'Votre événement doit être corrigé',
      description: normalizedNote || 'Votre proposition est maintenant visible dans les événements.',
      link: '/events',
      priority: status === 'published' ? 'normal' : 'high',
      category: 'events',
      audience: 'user',
      metadata: { eventId, status, note: normalizedNote },
      createdBy: admin.id
    })
  }

  await notifyAdminByEmail({
    kind: 'event_moderated',
    subject: `Modération événement : ${event.title}`,
    title: 'Décision de modération sur un événement',
    details: [
      { label: 'Événement', value: event.title },
      { label: 'Décision', value: status },
      { label: 'Modérateur', value: admin.email || admin.id }
    ],
    message: normalizedNote,
    actionPath: '/admin/events'
  })

  return { success: true, status }
}

export async function getUpcomingEvents(userId?: string) {
  try {
    return await getUpcomingEventsQuery(userId, true)
  } catch (error) {
    if (isMissingPublicationStatusColumn(error)) {
      return await getUpcomingEventsQuery(userId, false)
    }
    throw error
  }
}

export async function getMyEventSubmissions(userId: string) {
  await requireSameUserOrAdmin(userId)

  return sql.query(
    `
      SELECT
        id,
        title,
        image,
        event_date,
        event_time,
        venue,
        experience_type,
        publication_status,
        moderation_note,
        moderated_at,
        created_at
      FROM events
      WHERE creator_id = $1
        AND publication_status <> 'published'
      ORDER BY created_at DESC
      LIMIT 12
    `,
    [userId]
  )
}

function isMissingPublicationStatusColumn(error: unknown) {
  const dbError = error as { code?: string; column?: string; message?: string }
  return (
    dbError?.code === '42703' &&
    (dbError.column === 'publication_status' ||
      dbError.message?.includes('publication_status'))
  )
}

async function getUpcomingEventsQuery(userId?: string, withPublicationStatus = true) {
  if (userId) {
    const events = withPublicationStatus
      ? await sql`
          SELECT
            e.*, e.creator_id,
            (SELECT COUNT(*) FROM event_participants ep2 WHERE ep2.event_id = e.id) as participant_count,
            CASE WHEN ep.id IS NOT NULL THEN true ELSE false END as is_participating
          FROM events e
          LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.user_id = ${userId}
          WHERE (e.event_date + COALESCE(e.event_time, '23:59:59'::time)) > NOW()
            AND e.publication_status = 'published'
          ORDER BY e.event_date ASC
        `
      : await sql`
          SELECT
            e.*, e.creator_id,
            (SELECT COUNT(*) FROM event_participants ep2 WHERE ep2.event_id = e.id) as participant_count,
            CASE WHEN ep.id IS NOT NULL THEN true ELSE false END as is_participating
          FROM events e
          LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.user_id = ${userId}
          WHERE (e.event_date + COALESCE(e.event_time, '23:59:59'::time)) > NOW()
          ORDER BY e.event_date ASC
        `
    return events || []
  } else {
    const events = withPublicationStatus
      ? await sql`
          SELECT
            e.*, e.creator_id,
            (SELECT COUNT(*) FROM event_participants ep2 WHERE ep2.event_id = e.id) as participant_count
          FROM events e
          WHERE (e.event_date + COALESCE(e.event_time, '23:59:59'::time)) > NOW()
            AND e.publication_status = 'published'
          ORDER BY event_date ASC
        `
      : await sql`
          SELECT
            e.*, e.creator_id,
            (SELECT COUNT(*) FROM event_participants ep2 WHERE ep2.event_id = e.id) as participant_count
          FROM events e
          WHERE (e.event_date + COALESCE(e.event_time, '23:59:59'::time)) > NOW()
          ORDER BY event_date ASC
        `
    return events || []
  }
}

export async function getEventParticipants(eventId: string) {
  const participants = await sql`
    SELECT
      u.id,
      u.name,
      u.avatar,
      up.location
    FROM event_participants ep
    JOIN users u ON ep.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE ep.event_id = ${eventId}
  `

  return participants || []
}

export async function createEvent({ 
  title, 
  location, 
  date, 
  image, 
  category, 
  description, 
  creator_id,
  price = 0,
  prix_personne_seule = 0,
  prix_couple = 0,
  payment_mode = 'sur_place',
  conditions,
  venue,
  experience_type,
  max_participants,
  publication_status = 'published',
  created_by_role = 'member'
}: {
  title: string;
  location: string;
  date: string; // ISO string or date
  image?: string;
  category?: string;
  description?: string;
  creator_id: string;
  price?: number;
  prix_personne_seule?: number;
  prix_couple?: number;
  payment_mode?: 'sur_place' | 'online';
  conditions?: string;
  venue?: 'pigalle' | 'chatelet';
  experience_type?: ActiveExperienceType | string;
  max_participants?: number;
  publication_status?: 'published' | 'pending_review' | 'rejected';
  created_by_role?: 'hotel' | 'admin' | 'member';
}) {
  const currentUser = await requireSameUserOrAdmin(creator_id)
  const isAdminEvent = currentUser.role === 'admin'
  const publicationStatus = isAdminEvent ? 'published' : 'pending_review'
  const effectiveCreatedByRole = isAdminEvent
    ? (created_by_role === 'hotel' ? 'hotel' : 'admin')
    : 'member'
  const { eventDate, eventTime } = normalizeEventDateTime(date)
  const normalizedExperienceType = normalizeActiveExperienceType(experience_type || category)
  const normalizedCategory = normalizedExperienceType
  const normalizedMaxParticipants = normalizeEventCapacity(
    normalizedExperienceType,
    max_participants
  )

  const [event] = await sql`
    INSERT INTO events (
      title, 
      location, 
      event_date, 
      event_time,
      image, 
      category, 
      description, 
      creator_id,
      price,
      prix_personne_seule,
      prix_couple,
      payment_mode,
      conditions,
      venue,
      experience_type,
      max_participants,
      publication_status,
      created_by_role,
      created_at,
      updated_at
    )
    VALUES (
      ${title}, 
      ${location}, 
      ${eventDate},
      ${eventTime},
      ${image || null}, 
      ${normalizedCategory},
      ${description || null}, 
      ${creator_id},
      ${price},
      ${prix_personne_seule},
      ${prix_couple},
      ${payment_mode},
      ${conditions || null},
      ${venue || null},
      ${normalizedExperienceType},
      ${normalizedMaxParticipants},
      ${publicationStatus},
      ${effectiveCreatedByRole},
      NOW(),
      NOW()
    )
    RETURNING *
  `
  await notifyAdminByEmail({
    kind: 'event_created',
    subject: `Nouvel événement : ${title}`,
    title: 'Un événement vient d’être créé',
    details: [
      { label: 'Titre', value: title },
      { label: 'Créateur', value: currentUser.email || creator_id },
      { label: 'Type', value: normalizedExperienceType },
      { label: 'Lieu', value: location },
      { label: 'Date', value: `${eventDate} ${eventTime}` },
      { label: 'Statut', value: publicationStatus }
    ],
    message: description,
    actionPath: '/admin/events'
  })
  return event
}

export async function updateEvent(eventId: string, { 
  title, 
  location, 
  date, 
  image, 
  category, 
  description, 
  price, 
  prix_personne_seule, 
  prix_couple, 
  payment_mode, 
  conditions 
}: {
  title?: string;
  location?: string;
  date?: string;
  image?: string;
  category?: string;
  description?: string;
  price?: number;
  prix_personne_seule?: number;
  prix_couple?: number;
  payment_mode?: 'sur_place' | 'online';
  conditions?: string;
}) {
  const currentUser = await requireCurrentUser()
  const normalizedCategory = category
    ? normalizeActiveExperienceType(category)
    : undefined
  const [existingEvent] = await sql`
    SELECT creator_id FROM events WHERE id = ${eventId}
  `

  if (!existingEvent) {
    throw new Error('Événement introuvable')
  }

  if (currentUser.role !== 'admin' && existingEvent.creator_id !== currentUser.id) {
    throw new Error('Action limitée à votre propre compte')
  }

  const [event] = await sql`
    UPDATE events
    SET
      title = COALESCE(${title}, title),
      location = COALESCE(${location}, location),
      event_date = COALESCE(${date}, event_date),
      image = COALESCE(${image}, image),
      category = COALESCE(${normalizedCategory}, category),
      description = COALESCE(${description}, description),
      price = COALESCE(${price}, price),
      prix_personne_seule = COALESCE(${prix_personne_seule}, prix_personne_seule),
      prix_couple = COALESCE(${prix_couple}, prix_couple),
      payment_mode = COALESCE(${payment_mode}, payment_mode),
      conditions = COALESCE(${conditions}, conditions),
      updated_at = NOW()
    WHERE id = ${eventId}
    RETURNING *
  `
  await notifyAdminByEmail({
    kind: 'event_updated',
    subject: `Événement modifié : ${event.title || eventId}`,
    title: 'Un événement vient d’être modifié',
    details: [
      { label: 'Événement', value: event.title || eventId },
      { label: 'Auteur de la modification', value: currentUser.email || currentUser.id }
    ],
    actionPath: `/events/${eventId}`
  })
  return event
}

export async function deleteEvent(eventId: string) {
  const currentUser = await requireCurrentUser()
  const [existingEvent] = await sql`
    SELECT creator_id, title FROM events WHERE id = ${eventId}
  `

  if (!existingEvent) {
    throw new Error('Événement introuvable')
  }

  if (currentUser.role !== 'admin' && existingEvent.creator_id !== currentUser.id) {
    throw new Error('Action limitée à votre propre compte')
  }

  await sql`
    DELETE FROM events WHERE id = ${eventId}
  `
  await notifyAdminByEmail({
    kind: 'event_deleted',
    subject: `Événement supprimé : ${existingEvent.title || eventId}`,
    title: 'Un événement vient d’être supprimé',
    details: [
      { label: 'Événement', value: existingEvent.title || eventId },
      { label: 'Auteur de la suppression', value: currentUser.email || currentUser.id }
    ],
    actionPath: '/admin/events'
  })
  return { success: true }
}

export async function resetAllEvents() {
  const admin = await requireAdmin()

  const deletedEvents = await sql.query<{ id: string }[]>(
    `
      DELETE FROM events
      RETURNING id
    `,
    []
  )

  await notifyAdminByEmail({
    kind: 'events_reset',
    subject: `${deletedEvents.length} événement(s) supprimé(s)`,
    title: 'La liste des événements vient d’être réinitialisée',
    details: [
      { label: 'Événements supprimés', value: deletedEvents.length },
      { label: 'Action par', value: admin.email || admin.id }
    ],
    actionPath: '/admin/events'
  })

  return { success: true, deletedCount: deletedEvents.length }
}

export async function subscribeToEvent(eventId: string, userId: string) {
  await requireSameUserOrAdmin(userId)

  const [event] = await sql`
    SELECT
      id,
      max_participants,
      event_date,
      event_time,
      publication_status,
      (SELECT COUNT(*) FROM event_participants WHERE event_id = ${eventId}) as participant_count
    FROM events
    WHERE id = ${eventId}
  `

  if (!event) {
    return { success: false, error: 'Événement introuvable' }
  }

  if (event.publication_status && event.publication_status !== 'published') {
    return { success: false, error: 'Événement non publié' }
  }

  if (eventDateTimeHasPassed(event)) {
    return { success: false, error: 'Impossible de participer à un événement passé' }
  }

  if (event?.max_participants && Number(event.participant_count || 0) >= Number(event.max_participants)) {
    return { success: false, error: 'Événement complet' }
  }

  await sql`
    INSERT INTO event_participants (event_id, user_id)
    VALUES (${eventId}, ${userId})
    ON CONFLICT DO NOTHING
  `
  await notifyEventReservationAdmins({ eventId, userId, action: 'join' })
  return { success: true }
}

export async function unsubscribeFromEvent(eventId: string, userId: string) {
  await requireSameUserOrAdmin(userId)

  await sql`
    DELETE FROM event_participants WHERE event_id = ${eventId} AND user_id = ${userId}
  `
  await notifyEventReservationAdmins({ eventId, userId, action: 'leave' })
  return { success: true }
}

export async function removeSubscriberFromEvent(eventId: string, userId: string) {
  await requireAdmin()

  await sql`
    DELETE FROM event_participants WHERE event_id = ${eventId} AND user_id = ${userId}
  `
  return { success: true }
}

export async function getEventSubscriptionsStats({ startDate, endDate, scale }: { startDate: string, endDate: string, scale: "day"|"week"|"month" }) {
  let dateTrunc;
  if (scale === "day") {
    dateTrunc = "TO_CHAR(DATE(created_at), 'YYYY-MM-DD')";
  } else if (scale === "week") {
    dateTrunc = "TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')";
  } else {
    dateTrunc = "TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM-DD')";
  }
  const query = `
    SELECT ${dateTrunc} as period, COUNT(*) as count
    FROM event_participants
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY period
    ORDER BY period ASC
  `;
  const stats = await sql.query(query, [startDate, endDate]);
  return stats;
}

export async function getEventById(eventId: string, userId?: string) {
  try {
    const eventQuery = userId
      ? `
      SELECT 
        e.*,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count,
        u.name as creator_name,
        CASE WHEN ep.id IS NOT NULL THEN true ELSE false END as is_participating
      FROM events e
      LEFT JOIN users u ON e.creator_id = u.id
      LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.user_id = $2
      WHERE e.id = $1
    `
      : `
      SELECT
        e.*,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count,
        u.name as creator_name,
        false as is_participating
      FROM events e
      LEFT JOIN users u ON e.creator_id = u.id
      WHERE e.id = $1
    `
    const eventParams = userId ? [eventId, userId] : [eventId]
    const [event] = await sql.query<any[]>(eventQuery, eventParams)

    if (!event) {
      return null
    }

    // Récupérer les participants
    const participants = await sql.query<any[]>(
      `
      SELECT 
        u.id,
        u.name,
        u.avatar,
        ep.joined_at
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.id
      WHERE ep.event_id = $1
      ORDER BY ep.joined_at ASC
      LIMIT 20
    `,
      [eventId]
    )

    return {
      ...event,
      participants: participants || []
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error)
    return null
  }
}

export async function checkUserParticipation(eventId: string, userId: string) {
  try {
    const [participation] = await sql`
      SELECT id FROM event_participants 
      WHERE event_id = ${eventId} AND user_id = ${userId}
    `
    return !!participation
  } catch (error) {
    console.error('Erreur lors de la vérification de participation:', error)
    return false
  }
}
