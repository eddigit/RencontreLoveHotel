"use server"

import { sql } from "@/lib/db"
import { createAppNotificationRecord } from '@/lib/notification-service'
import { requireAdmin, requireCurrentUser, requireSameUserOrAdmin } from "@/lib/server-auth"
import { notifyAdminByEmail } from '@/lib/admin-email-notifications'
import { sendMemberActivityEmail } from '@/lib/member-activity-email'
import { requestParticipation, withdrawParticipation } from '@/lib/event-participation-service'

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

function hideBookingReference<T extends Record<string, unknown>>(event: T) {
  const { booking_reference: _bookingReference, ...safeEvent } = event
  return safeEvent
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
        e.booking_confirmed,
        e.booking_reference,
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
    await createAppNotificationRecord({
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
    await sendMemberActivityEmail({
      recipientUserId: event.creator_id,
      category: 'events',
      subject: status === 'published'
        ? 'Votre événement est publié'
        : status === 'rejected'
          ? 'Votre événement a été refusé'
          : 'Votre événement doit être corrigé',
      title: `Mise à jour de votre événement : ${event.title}`,
      description: normalizedNote || 'Votre proposition est maintenant visible dans les événements.',
      ctaLabel: 'Voir mon événement',
      ctaPath: `/events/${eventId}`
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
  const currentUser = userId
    ? await requireSameUserOrAdmin(userId)
    : await requireCurrentUser()
  try {
    const events = await getUpcomingEventsQuery(userId || currentUser.id, true)
    return events.map(hideBookingReference)
  } catch (error) {
    if (isMissingPublicationStatusColumn(error)) {
      const events = await getUpcomingEventsQuery(userId || currentUser.id, false)
      return events.map(hideBookingReference)
    }
    throw error
  }
}

export async function getMyEventSubmissions(userId: string) {
  await requireSameUserOrAdmin(userId)

  return sql.query(
    `
      SELECT
        e.*,
        (SELECT COUNT(*) FROM event_participants accepted
         WHERE accepted.event_id = e.id AND accepted.status = 'accepted') AS participant_count,
        (SELECT COUNT(*) FROM event_participants requested
         WHERE requested.event_id = e.id AND requested.status = 'pending') AS pending_request_count
      FROM events e
      WHERE e.creator_id = $1
      ORDER BY e.created_at DESC
      LIMIT 24
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
            e.*, e.creator_id, owner.name as creator_name, owner.avatar as creator_avatar,
            (SELECT COUNT(*) FROM event_participants ep2 WHERE ep2.event_id = e.id AND ep2.status = 'accepted') as participant_count,
            ep.status as participation_status,
            CASE WHEN ep.status = 'accepted' THEN true ELSE false END as is_participating
          FROM events e
          LEFT JOIN users owner ON owner.id = e.creator_id
          LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.user_id = ${userId}
          WHERE (e.event_date + COALESCE(e.event_time, '23:59:59'::time)) > NOW()
            AND e.publication_status = 'published'
          ORDER BY e.event_date ASC
        `
      : await sql`
          SELECT
            e.*, e.creator_id, owner.name as creator_name, owner.avatar as creator_avatar,
            (SELECT COUNT(*) FROM event_participants ep2 WHERE ep2.event_id = e.id) as participant_count,
            ep.status as participation_status,
            CASE WHEN ep.id IS NOT NULL THEN true ELSE false END as is_participating
          FROM events e
          LEFT JOIN users owner ON owner.id = e.creator_id
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
            (SELECT COUNT(*) FROM event_participants ep2 WHERE ep2.event_id = e.id AND ep2.status = 'accepted') as participant_count
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
  await requireCurrentUser()
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
      AND ep.status = 'accepted'
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
  booking_confirmed = false,
  booking_reference,
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
  booking_confirmed?: boolean;
  booking_reference?: string;
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
  const bookingConfirmed = normalizedExperienceType === 'open_curtains' && booking_confirmed === true
  const bookingReference = (booking_reference || '').trim().slice(0, 120) || null
  if (bookingConfirmed && !bookingReference) {
    throw new Error('La référence de réservation est obligatoire pour une chambre confirmée.')
  }

  const [event] = await sql`
    WITH inserted_event AS (
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
        booking_confirmed,
        booking_reference,
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
        ${bookingConfirmed},
        ${bookingReference},
        ${publicationStatus},
        ${effectiveCreatedByRole},
        NOW(),
        NOW()
      )
      RETURNING *
    ), inserted_organizer AS (
      INSERT INTO event_participants (
        event_id, user_id, status, joined_at, created_at, updated_at
      )
      SELECT id, ${creator_id}, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM inserted_event
      ON CONFLICT (event_id, user_id) DO NOTHING
      RETURNING event_id
    )
    SELECT inserted_event.*
    FROM inserted_event
    LEFT JOIN inserted_organizer ON inserted_organizer.event_id = inserted_event.id
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
  const participants = await sql.query<{ user_id: string }[]>(
    `SELECT user_id FROM event_participants WHERE event_id = $1`,
    [eventId]
  )
  for (const participant of participants) {
    await sendMemberActivityEmail({
      recipientUserId: participant.user_id,
      category: 'events',
      subject: `Événement modifié : ${event.title || 'mise à jour'}`,
      title: 'Un événement auquel vous participez a été modifié',
      description: 'Consultez la fiche pour retrouver les informations à jour.',
      ctaLabel: 'Voir l’événement',
      ctaPath: `/events/${eventId}`
    })
  }
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
  return requestParticipation({ eventId, actorId: userId })
}

export async function unsubscribeFromEvent(eventId: string, userId: string) {
  await requireSameUserOrAdmin(userId)
  return withdrawParticipation({ eventId, actorId: userId })
}

export async function removeSubscriberFromEvent(eventId: string, userId: string) {
  await requireAdmin()

  await sql`
    DELETE FROM event_participants WHERE event_id = ${eventId} AND user_id = ${userId}
  `
  return { success: true }
}

export async function getEventSubscriptionsStats({ startDate, endDate, scale }: { startDate: string, endDate: string, scale: "day"|"week"|"month" }) {
  await requireAdmin()

  const unit = scale === 'month' ? 'month' : scale === 'week' ? 'week' : 'day'
  const dateTrunc = `TO_CHAR(DATE_TRUNC('${unit}', created_at AT TIME ZONE 'Europe/Paris'), 'YYYY-MM-DD')`
  const query = `
    SELECT ${dateTrunc} as period, COUNT(*) as count
    FROM event_participants
    WHERE created_at >= ($1::date AT TIME ZONE 'Europe/Paris')
      AND created_at < (($2::date + INTERVAL '1 day') AT TIME ZONE 'Europe/Paris')
    GROUP BY period
    ORDER BY period ASC
  `;
  const stats = await sql.query(query, [startDate, endDate]);
  return stats;
}

export async function getEventById(eventId: string, userId?: string) {
  const currentUser = userId
    ? await requireSameUserOrAdmin(userId)
    : await requireCurrentUser()
  const effectiveUserId = userId || currentUser.id
  try {
    const eventQuery = effectiveUserId
      ? `
      SELECT 
        e.*,
        (SELECT COUNT(*) FROM event_participants accepted WHERE accepted.event_id = e.id AND accepted.status = 'accepted') as participant_count,
        u.name as creator_name,
        u.avatar as creator_avatar,
        ep.status as participation_status,
        CASE WHEN ep.status = 'accepted' THEN true ELSE false END as is_participating
      FROM events e
      LEFT JOIN users u ON e.creator_id = u.id
      LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.user_id = $2
      WHERE e.id = $1
    `
      : `
      SELECT
        e.*,
        (SELECT COUNT(*) FROM event_participants accepted WHERE accepted.event_id = e.id AND accepted.status = 'accepted') as participant_count,
        u.name as creator_name,
        u.avatar as creator_avatar,
        NULL as participation_status,
        false as is_participating
      FROM events e
      LEFT JOIN users u ON e.creator_id = u.id
      WHERE e.id = $1
    `
    const eventParams = [eventId, effectiveUserId]
    const [event] = await sql.query<any[]>(eventQuery, eventParams)

    if (!event) {
      return null
    }

    if (
      event.publication_status !== 'published' &&
      event.creator_id !== currentUser.id &&
      currentUser.role !== 'admin'
    ) {
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
        AND ep.status = 'accepted'
      ORDER BY ep.joined_at ASC
      LIMIT 20
    `,
      [eventId]
    )

    const visibleEvent = event.creator_id === currentUser.id || currentUser.role === 'admin'
      ? event
      : hideBookingReference(event)

    return {
      ...visibleEvent,
      participants: participants || []
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error)
    return null
  }
}

export async function checkUserParticipation(eventId: string, userId: string) {
  await requireSameUserOrAdmin(userId)
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

export async function notifyEventParticipants(
  eventId: string,
  input: { title: string; description: string }
) {
  const admin = await requireAdmin()
  const title = input.title.trim().slice(0, 180)
  const description = input.description.trim().slice(0, 1000)

  if (title.length < 3 || description.length < 3) {
    throw new Error('Titre et message requis')
  }

  const participants = await sql.query<{ user_id: string }[]>(
    `SELECT user_id FROM event_participants WHERE event_id = $1`,
    [eventId]
  )

  for (const participant of participants) {
    await createAppNotificationRecord({
      userId: participant.user_id,
      type: 'event',
      title,
      description,
      link: `/events/${eventId}`,
      category: 'events',
      createdBy: admin.id
    })
    await sendMemberActivityEmail({
      recipientUserId: participant.user_id,
      category: 'events',
      subject: title,
      title,
      description,
      ctaLabel: 'Voir l’événement',
      ctaPath: `/events/${eventId}`
    })
  }

  return { success: true, notifiedCount: participants.length }
}
