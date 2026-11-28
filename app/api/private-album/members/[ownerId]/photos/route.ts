import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/lib/server-auth'
import { sql } from '@/lib/db'
import {
  ensurePrivateAlbumSchema,
  isEligibleAlbumMember,
  privateNoStoreHeaders,
  PRIVATE_ALBUM_PHOTO_ID,
  publicPrivateAlbumPhoto
} from '@/lib/private-album'
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> }
) {
  try {
    const viewer = await requireCurrentUser()
    const { ownerId } = await params
    if (!PRIVATE_ALBUM_PHOTO_ID.test(ownerId))
      return NextResponse.json(
        { error: 'Membre invalide.' },
        { status: 400, headers: privateNoStoreHeaders() }
      )
    await ensurePrivateAlbumSchema()
    if (!(await isEligibleAlbumMember(viewer.id)))
      return NextResponse.json(
        { error: 'Compte non éligible.' },
        { status: 403, headers: privateNoStoreHeaders() }
      )
    const rows = await sql.query<Array<any>>(
      `SELECT p.id,p.audience,p.mime_type,p.width,p.height,p.created_at,g.expires_at FROM private_album_photos p JOIN users o ON o.id=p.owner_id JOIN user_profiles op ON op.user_id=o.id LEFT JOIN private_album_grants g ON g.owner_id=p.owner_id AND g.viewer_id=$2 AND g.revoked_at IS NULL AND g.expires_at>CURRENT_TIMESTAMP WHERE p.owner_id=$1 AND COALESCE(o.is_banned,false)=false AND COALESCE(o.status,'active')='active' AND op.display_profile IS TRUE AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=$1)) AND (p.audience='members' OR g.id IS NOT NULL) ORDER BY p.created_at ASC`,
      [ownerId, viewer.id]
    )
    const flags = await sql.query<
      Array<{ has_private_media: boolean; pending: boolean }>
    >(
      `SELECT EXISTS(SELECT 1 FROM private_album_photos p JOIN users o ON o.id=p.owner_id JOIN user_profiles op ON op.user_id=o.id WHERE p.owner_id=$1 AND p.audience='private' AND COALESCE(o.is_banned,false)=false AND COALESCE(o.status,'active')='active' AND op.display_profile IS TRUE AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=$1))) AS has_private_media, EXISTS(SELECT 1 FROM private_album_access_requests WHERE owner_id=$1 AND requester_id=$2 AND status='pending') AS pending`,
      [ownerId, viewer.id]
    )
    return NextResponse.json(
      {
        photos: rows.map(publicPrivateAlbumPhoto),
        grantExpiresAt: rows.find((r) => r.expires_at)?.expires_at || null,
        requestPending: flags[0]?.pending === true,
        hasPrivateMedia: flags[0]?.has_private_media === true
      },
      { headers: privateNoStoreHeaders() }
    )
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'Authentification requise'
            ? 'Connexion requise.'
            : 'Album indisponible.'
      },
      {
        status:
          e instanceof Error && e.message === 'Authentification requise'
            ? 401
            : 500,
        headers: privateNoStoreHeaders()
      }
    )
  }
}
