import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { sql } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { notifyEventReservationAdmins } from '@/lib/event-reservation-notifications'
import { randomUUID } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    // Validation de l'ID (UUID)
    const { id } = await params
    const eventId = id
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'ID événement invalide' }, { status: 400 })
    }

    const body = await request.json()
    const { userId: requestedUserId, action } = body
    const userId = session.user.role === 'admin' && requestedUserId
      ? requestedUserId
      : session.user.id

    if (
      requestedUserId &&
      requestedUserId !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 })
    }

    if (!action || !['join', 'leave'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }    // Vérifier que l'événement existe
    const [event] = await sql`
      SELECT id, max_participants, event_date
      FROM events 
      WHERE id = ${eventId}
    `

    if (!event) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })
    }

    // Vérifier que l'événement n'est pas passé
    if (new Date(event.event_date) < new Date()) {
      return NextResponse.json({ error: 'Impossible de participer à un événement passé' }, { status: 400 })
    }

    // Vérifier que l'utilisateur existe
    const [user] = await sql`
      SELECT id FROM users WHERE id = ${userId}
    `

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    if (action === 'join') {
      // Vérifier si déjà inscrit
      const [existing] = await sql`
        SELECT id FROM event_participants 
        WHERE event_id = ${eventId} AND user_id = ${userId}
      `

      if (existing) {
        return NextResponse.json({ error: 'Déjà inscrit à cet événement' }, { status: 409 })
      }

      // Vérifier le nombre maximum de participants
      const [participantCount] = await sql`
        SELECT COUNT(*) as count 
        FROM event_participants 
        WHERE event_id = ${eventId}
      `

      if (Number(participantCount.count) >= Number(event.max_participants)) {
        return NextResponse.json({ error: 'Événement complet' }, { status: 409 })
      }

      // Ajouter la participation
      const participantId = randomUUID();
      await sql`
        INSERT INTO event_participants (id, event_id, user_id, joined_at)
        VALUES (${participantId}, ${eventId}, ${userId}, NOW())
      `
      await notifyEventReservationAdmins({ eventId, userId, action: 'join' })

      return NextResponse.json({ 
        success: true, 
        message: 'Inscription réussie',
        action: 'joined'
      })

    } else if (action === 'leave') {
      // Supprimer la participation
      const result = await sql`
        DELETE FROM event_participants 
        WHERE event_id = ${eventId} AND user_id = ${userId}
      `
      await notifyEventReservationAdmins({ eventId, userId, action: 'leave' })

      return NextResponse.json({ 
        success: true, 
        message: 'Désinscription réussie',
        action: 'left'
      })
    }

  } catch (error) {
    console.error('Erreur lors de la gestion de la participation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
