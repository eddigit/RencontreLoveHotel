import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { randomUUID } from "crypto"

import type { NextRequest } from "next/server"
export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params
  const body = await request.json()
  // Récupérer l'événement original
  const [original] = await sql`SELECT * FROM events WHERE id = ${id}`
  if (!original) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  // Créer un nouvel événement avec les champs modifiés ou originaux
  const newId = randomUUID()
  const [newEvent] = await sql`
    INSERT INTO events (
      id, title, description, image, event_date, event_time, location, price, max_participants, category, creator_id, prix_personne_seule, prix_couple, payment_mode, conditions, created_at, updated_at
    ) VALUES (
      ${newId},
      ${body.title ?? original.title},
      ${body.description ?? original.description},
      ${body.image ?? original.image},
      ${body.date ?? original.event_date},
      ${original.event_time},
      ${body.location ?? original.location},
      ${body.price ?? original.price},
      ${body.max_participants ?? original.max_participants},
      ${body.category ?? original.category},
      ${original.creator_id},
      ${body.prix_personne_seule ?? original.prix_personne_seule},
      ${body.prix_couple ?? original.prix_couple},
      ${body.payment_mode ?? original.payment_mode},
      ${body.conditions ?? original.conditions},
      NOW(), NOW()
    ) RETURNING *
  `
  return NextResponse.json(newEvent)
}
