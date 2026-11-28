import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/lib/server-auth'
import { sql } from '@/lib/db'
import {
  ensurePrivateAlbumSchema,
  isEligibleAlbumMember,
  privateNoStoreHeaders,
  PRIVATE_ALBUM_PHOTO_ID
} from '@/lib/private-album'
import { createNotificationInternal } from '@/lib/notification-service'

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: privateNoStoreHeaders() })
export async function POST(request: NextRequest) {
  try {
    const requester = await requireCurrentUser()
    const body = await request.json()
    const ownerId = body?.ownerId
    if (
      typeof ownerId !== 'string' ||
      !PRIVATE_ALBUM_PHOTO_ID.test(ownerId) ||
      ownerId === requester.id
    )
      return fail('Membre invalide.', 400)
    await ensurePrivateAlbumSchema()
    if (!(await isEligibleAlbumMember(requester.id)))
      return fail('Compte non éligible.', 403)
    const rows = await sql.query<Array<any>>(
      `INSERT INTO private_album_access_requests(owner_id,requester_id)
      SELECT owner.id,$2 FROM users owner JOIN user_profiles op ON op.user_id=owner.id
      WHERE owner.id=$1 AND COALESCE(owner.is_banned,false)=false AND COALESCE(owner.status,'active')='active' AND op.display_profile IS TRUE
        AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=owner.id AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=owner.id))
        AND EXISTS (SELECT 1 FROM private_album_photos p WHERE p.owner_id=owner.id AND p.audience='private')
        AND NOT EXISTS (SELECT 1 FROM private_album_grants g WHERE g.owner_id=owner.id AND g.viewer_id=$2 AND g.revoked_at IS NULL AND g.expires_at>CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING RETURNING id,status,created_at,updated_at,owner_id,requester_id`,
      [ownerId, requester.id]
    )
    if (!rows[0])
      return fail('Demande déjà en cours ou membre inaccessible.', 409)
    const r = rows[0]
    // Notification is deliberately non-critical: a failure must not lose the request.
    try {
      await createNotificationInternal({
        userId: ownerId,
        type: 'private_album_request',
        title: 'Nouvelle demande d’accès',
        description: 'Un membre souhaite accéder à votre album privé.',
        link: '/profile?tab=photos'
      })
    } catch {}
    return NextResponse.json(
      {
        request: {
          id: r.id,
          status: r.status,
          ownerId: r.owner_id,
          requesterId: r.requester_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }
      },
      { status: 201, headers: privateNoStoreHeaders() }
    )
  } catch (e) {
    return fail(
      e instanceof Error && e.message === 'Authentification requise'
        ? 'Connexion requise.'
        : 'Demande impossible.',
      e instanceof Error && e.message === 'Authentification requise' ? 401 : 500
    )
  }
}
export async function GET() {
  try {
    const user = await requireCurrentUser()
    await ensurePrivateAlbumSchema()
    if (!(await isEligibleAlbumMember(user.id)))
      return fail('Compte non éligible.', 403)
    const rows = await sql.query<Array<any>>(
      `SELECT r.id, CASE WHEN r.status = 'granted' AND g.revoked_at IS NOT NULL THEN 'revoked'
        WHEN r.status = 'granted' AND (g.id IS NULL OR g.expires_at <= CURRENT_TIMESTAMP) THEN 'expired'
        ELSE r.status END AS status,r.created_at,r.updated_at,r.owner_id,r.requester_id,owner.name owner_name,requester.name requester_name,g.id grant_id,g.expires_at
      FROM private_album_access_requests r JOIN users owner ON owner.id=r.owner_id JOIN users requester ON requester.id=r.requester_id
      LEFT JOIN private_album_grants g ON g.request_id=r.id
      WHERE (r.owner_id=$1 OR r.requester_id=$1) AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=r.owner_id AND b.blocked_id=r.requester_id) OR (b.blocker_id=r.requester_id AND b.blocked_id=r.owner_id)) ORDER BY r.updated_at DESC`,
      [user.id]
    )
    const map = (r: any) => ({
      id: r.id,
      status: r.status,
      ownerId: r.owner_id,
      requesterId: r.requester_id,
      ownerName: r.owner_name,
      requesterName: r.requester_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      grantId: r.grant_id || null,
      expiresAt: r.expires_at || null
    })
    return NextResponse.json(
      {
        incoming: rows.filter((r) => r.owner_id === user.id).map(map),
        outgoing: rows.filter((r) => r.requester_id === user.id).map(map)
      },
      { headers: privateNoStoreHeaders() }
    )
  } catch (e) {
    return fail(
      e instanceof Error && e.message === 'Authentification requise'
        ? 'Connexion requise.'
        : 'Demandes indisponibles.',
      e instanceof Error && e.message === 'Authentification requise' ? 401 : 500
    )
  }
}
