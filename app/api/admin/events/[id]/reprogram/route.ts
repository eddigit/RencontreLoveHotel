import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { sql } from "@/lib/db"
import { authOptions } from "@/lib/auth"
import type { NextRequest } from "next/server"

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
  // Met à jour la date de l'événement
  const [event] = await sql`
    UPDATE events SET event_date = ${date}, updated_at = NOW() WHERE id = ${id} RETURNING *
  `
  return NextResponse.json(event)
}
