import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { sql } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const testEvents = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Apéro jacuzzi Pigalle',
    description: 'Petit comité autour du jacuzzi pour 2, 3 ou 4 couples maximum.',
    event_date: '2026-07-10',
    event_time: '21:00:00',
    location: 'Love Hotel Pigalle - Jacuzzi',
    price: 0,
    max_participants: 4,
    image: '/apero-jacuzzi-rencontre.jpg',
    category: 'jacuzzi',
    creator_id: 'admin-456'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002', 
    title: 'Rideaux ouverts Châtelet',
    description: 'Rencontre encadrée dans 2 ou 3 chambres, avec rideaux fermés, entrouverts ou ouverts selon accord.',
    event_date: '2026-07-12',
    event_time: '21:00:00',
    location: 'Love Hotel Châtelet - Chambres rideaux ouverts',
    price: 0,
    max_participants: 3,
    image: '/rideaux-ouverts-rencontre.jpg',
    category: 'open_curtains',
    creator_id: 'admin-456'
  }
]

export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Authentification requise' }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Accès administrateur requis' }, { status: 403 })
  }

  try {
    let created = 0
    let existing = 0
    
    for (const event of testEvents) {
      // Vérifier si l'événement existe déjà
      const existingEvent = await sql`
        SELECT id FROM events WHERE id = ${event.id}
      `
      
      if (existingEvent.length === 0) {
        await sql`
          INSERT INTO events (
            id, title, description, event_date, event_time, 
            location, price, max_participants, image, category, creator_id,
            created_at, updated_at
          ) VALUES (
            ${event.id}, ${event.title}, ${event.description}, 
            ${event.event_date}, ${event.event_time}, ${event.location}, 
            ${event.price}, ${event.max_participants}, ${event.image}, 
            ${event.category}, ${event.creator_id},
            NOW(), NOW()
          )
        `
        created++
      } else {
        existing++
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Événements créés avec succès! ${created} nouveaux événements, ${existing} existants.`,
      created,
      existing
    })
  } catch (error) {
    console.error('Erreur lors de la création des événements:', error)
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création des événements',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}
