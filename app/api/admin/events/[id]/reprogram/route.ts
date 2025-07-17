import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request, { params }) {
  const { id } = params
  const { date } = await request.json()
  // Met à jour la date de l'événement
  const [event] = await sql`
    UPDATE events SET event_date = ${date}, updated_at = NOW() WHERE id = ${id} RETURNING *
  `
  return NextResponse.json(event)
}
