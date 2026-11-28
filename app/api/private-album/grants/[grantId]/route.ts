import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/lib/server-auth'
import { sql } from '@/lib/db'
import {
  ensurePrivateAlbumSchema,
  isActiveAlbumMember,
  privateNoStoreHeaders,
  PRIVATE_ALBUM_PHOTO_ID
} from '@/lib/private-album'
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ grantId: string }> }
) {
  try {
    const owner = await requireCurrentUser()
    const { grantId } = await params
    if (!PRIVATE_ALBUM_PHOTO_ID.test(grantId))
      return new NextResponse(null, {
        status: 404,
        headers: privateNoStoreHeaders()
      })
    await ensurePrivateAlbumSchema()
    if (!(await isActiveAlbumMember(owner.id)))
      return new NextResponse(null, {
        status: 403,
        headers: privateNoStoreHeaders()
      })
    const rows = await sql.query<Array<{ id: string }>>(
      'UPDATE private_album_grants SET revoked_at=CURRENT_TIMESTAMP WHERE id=$1 AND owner_id=$2 AND revoked_at IS NULL RETURNING id',
      [grantId, owner.id]
    )
    return new NextResponse(null, {
      status: rows[0] ? 204 : 404,
      headers: privateNoStoreHeaders()
    })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'Authentification requise'
            ? 'Connexion requise.'
            : 'Révocation impossible.'
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
