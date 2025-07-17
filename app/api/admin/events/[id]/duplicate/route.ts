import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { randomUUID } from "crypto"

import type { NextRequest } from "next/server"
export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params
  const { date } = await request.json()
  // Récupérer l'événement original
  const [original] = await sql`SELECT * FROM events WHERE id = ${id}`
  if (!original) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  // Créer un nouvel événement avec toutes les propriétés copiées
  const newId = randomUUID()
  const [newEvent] = await sql`
    INSERT INTO events (
      id, title, description, image, event_date, event_time, location, price, max_participants, category, creator_id, prix_personne_seule, prix_couple, payment_mode, conditions, created_at, updated_at
    ) VALUES (
      ${newId}, ${original.title}, ${original.description}, ${original.image}, ${date}, ${original.event_time}, ${original.location}, ${original.price}, ${original.max_participants}, ${original.category}, ${original.creator_id}, ${original.prix_personne_seule}, ${original.prix_couple}, ${original.payment_mode}, ${original.conditions}, NOW(), NOW()
    ) RETURNING *
  `
  return NextResponse.json(newEvent)
}
