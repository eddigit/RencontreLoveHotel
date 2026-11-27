import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { isMemberId } from '@/lib/member-id'

export async function GET(req: NextRequest) {
  const viewer = (await getServerSession(authOptions))?.user?.id
  if (!viewer) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
  const owner = req.nextUrl.searchParams.get('userId')
  if (!owner || !isMemberId(owner)) return NextResponse.json({ error: 'Profil invalide' }, { status: 400 })
  try {
    const photos = await sql`
      SELECT p.id, p.url, p.is_primary FROM photos p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ${owner}
        AND (u.id = ${viewer} OR (
          COALESCE(u.is_banned, false) = false AND COALESCE(u.status, 'active') = 'active'
          AND EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = u.id AND up.display_profile IS TRUE)
          AND NOT EXISTS (SELECT 1 FROM user_blocks b
            WHERE (b.blocker_id = u.id AND b.blocked_id = ${viewer})
               OR (b.blocker_id = ${viewer} AND b.blocked_id = u.id))
        ))
      ORDER BY p.created_at ASC
    `
    return NextResponse.json({ photos }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Galerie momentanément indisponible' }, { status: 500 })
  }
}
