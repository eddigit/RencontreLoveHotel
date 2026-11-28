import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/lib/server-auth'
import {
  ensurePrivateAlbumSchema,
  privateNoStoreHeaders,
  PRIVATE_ALBUM_PHOTO_ID
} from '@/lib/private-album'
import { albumVideoResponse } from '@/lib/album-video-response'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const viewer = await requireCurrentUser()
    const { photoId } = await params
    if (!PRIVATE_ALBUM_PHOTO_ID.test(photoId))
      return NextResponse.json(
        { error: 'Photo invalide.' },
        { status: 400, headers: privateNoStoreHeaders() }
      )
    await ensurePrivateAlbumSchema()
    const rows = await sql.query<Array<{ image: Buffer; mime_type: string }>>(
      `SELECT p.image,p.mime_type FROM private_album_photos p
      JOIN users owner ON owner.id=p.owner_id LEFT JOIN user_profiles owner_profile ON owner_profile.user_id=owner.id
      JOIN users viewer ON viewer.id=$2 LEFT JOIN user_profiles viewer_profile ON viewer_profile.user_id=viewer.id
      WHERE p.id=$1 AND COALESCE(owner.is_banned,false)=false AND COALESCE(owner.status,'active')='active'
        AND COALESCE(viewer.is_banned,false)=false AND COALESCE(viewer.status,'active')='active'
        AND (p.owner_id=$2 OR (owner_profile.display_profile IS TRUE AND viewer_profile.display_profile IS TRUE
          AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.blocker_id=p.owner_id AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=p.owner_id))
          AND (p.audience='members' OR EXISTS (SELECT 1 FROM private_album_grants g WHERE g.owner_id=p.owner_id AND g.viewer_id=$2 AND g.revoked_at IS NULL AND g.expires_at > CURRENT_TIMESTAMP))))`,
      [photoId, viewer.id]
    )
    if (!rows[0])
      return NextResponse.json(
        { error: 'Photo inaccessible.' },
        { status: 404, headers: privateNoStoreHeaders() }
      )
    const bytes = new Uint8Array(rows[0].image)
    const headers = privateNoStoreHeaders({
      'Content-Type': rows[0].mime_type,
      'Content-Disposition': 'inline',
      'Cross-Origin-Resource-Policy': 'same-origin'
    })
    if (rows[0].mime_type.startsWith('video/'))
      return albumVideoResponse(
        bytes,
        rows[0].mime_type,
        request.headers.get('range'),
        headers
      )
    return new NextResponse(bytes, { headers })
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error && cause.message === 'Authentification requise'
            ? 'Connexion requise.'
            : 'Photo indisponible.'
      },
      {
        status:
          cause instanceof Error && cause.message === 'Authentification requise'
            ? 401
            : 500,
        headers: privateNoStoreHeaders()
      }
    )
  }
}
