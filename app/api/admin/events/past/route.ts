import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  // Récupère les événements passés
  const events = await sql`
    SELECT *, (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count
    FROM events e
    WHERE e.event_date < NOW()
    ORDER BY event_date DESC
  `
  return NextResponse.json(events || [])
}
