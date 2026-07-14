import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { sql } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import { randomUUID } from "crypto"

import type { NextRequest } from "next/server"

function normalizeDatePart(value: unknown) {
  if (!value) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function normalizeEventDateTime(value: unknown, original: any) {
  if (!value) {
    return {
      eventDate: normalizeDatePart(original.event_date),
      eventTime: String(original.event_time || "20:00:00").slice(0, 8)
    }
  }

  const normalized = String(value).trim().replace(" ", "T")
  const [datePart, rawTimePart] = normalized.split("T")
  const timePart = rawTimePart || String(original.event_time || "20:00:00")
  const timeMatch = timePart.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/)

  return {
    eventDate: datePart,
    eventTime: timeMatch
      ? `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3] || "00"}`
      : String(original.event_time || "20:00:00").slice(0, 8)
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json()
  // Récupérer l'événement original
  const [original] = await sql`SELECT * FROM events WHERE id = ${id}`
  if (!original) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  const { eventDate, eventTime } = normalizeEventDateTime(body.date, original)
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
      ${eventDate},
      ${eventTime},
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
