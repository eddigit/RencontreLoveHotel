"use server"

import { sql } from "@/lib/db"
import { notifyEventReservationAdmins } from "@/lib/event-reservation-notifications"
import { requireAdmin, requireCurrentUser, requireSameUserOrAdmin } from "@/lib/server-auth"

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
          WHERE e.event_date > NOW()
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
          WHERE e.event_date > NOW()
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
          WHERE e.event_date > NOW()
            AND e.publication_status = 'published'
          ORDER BY event_date ASC
        `
      : await sql`
          SELECT
            e.*, e.creator_id,
            (SELECT COUNT(*) FROM event_participants ep2 WHERE ep2.event_id = e.id) as participant_count
          FROM events e
          WHERE e.event_date > NOW()
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
  await requireSameUserOrAdmin(creator_id)

  const betaPublicationRule = "publication_status = 'published'"
  const publicationStatus = betaPublicationRule.includes('published') ? 'published' : publication_status
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
      ${created_by_role},
      NOW(),
      NOW()
    )
    RETURNING *
  `
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
  return event
}

export async function deleteEvent(eventId: string) {
  const currentUser = await requireCurrentUser()
  const [existingEvent] = await sql`
    SELECT creator_id FROM events WHERE id = ${eventId}
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
  return { success: true }
}

export async function resetAllEvents() {
  await requireAdmin()

  const deletedEvents = await sql.query<{ id: string }[]>(
    `
      DELETE FROM events
      RETURNING id
    `,
    []
  )

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
