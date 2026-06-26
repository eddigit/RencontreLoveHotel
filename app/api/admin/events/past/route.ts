import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { sql } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 403 })
  }

  // Récupère les événements passés
  const events = await sql`
    SELECT *, (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count
    FROM events e
    WHERE e.event_date < NOW()
    ORDER BY event_date DESC
  `
  return NextResponse.json(events || [])
}
