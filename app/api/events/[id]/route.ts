import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validation de l'ID (UUID)
    const { id } = await params
    const eventId = id
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'ID événement invalide' }, { status: 400 })
    }

    // Récupérer l'événement avec les informations de participation
    const [event] = await sql`
      SELECT 
        e.*,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count,
        u.name as creator_name
      FROM events e
      LEFT JOIN users u ON e.creator_id = u.id
      WHERE e.id = ${eventId}
    `

    if (!event) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })
    }

    // Récupérer les participants (limité pour la confidentialité)
    const participants = await sql`
      SELECT 
        u.id,
        u.name,
        u.avatar,
        ep.joined_at
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.id
      WHERE ep.event_id = ${eventId}
      ORDER BY ep.joined_at ASC
      LIMIT 20
    `

    return NextResponse.json({
      ...event,
      participants: participants || []
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
