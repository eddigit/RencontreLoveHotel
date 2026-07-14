import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { sql } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import type { NextRequest } from "next/server"

function normalizeEventDateTime(value: string) {
  const normalized = value.trim().replace(" ", "T")
  const [datePart, rawTimePart] = normalized.split("T")
  const timePart = rawTimePart || "20:00"
  const timeMatch = timePart.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/)

  return {
    eventDate: datePart,
    eventTime: timeMatch
      ? `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3] || "00"}`
      : "20:00:00"
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 403 })
  }

  const { id } = await params
  const { date } = await request.json()
  const { eventDate, eventTime } = normalizeEventDateTime(date)
  const [event] = await sql`
    UPDATE events
    SET event_date = ${eventDate}, event_time = ${eventTime}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return NextResponse.json(event)
}
