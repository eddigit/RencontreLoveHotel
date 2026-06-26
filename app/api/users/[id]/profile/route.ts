import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET (_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions)
  const { id } = await context.params

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Authentification requise' }, { status: 401 })
  }

  if (session.user.id !== id && session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Accès non autorisé' }, { status: 403 })
  }

  const [profile] = await sql.query(
    `SELECT *
     FROM user_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [id]
  )

  if (!profile) {
    return NextResponse.json({ message: 'Profil introuvable' }, { status: 404 })
  }

  return NextResponse.json({ profile })
}
