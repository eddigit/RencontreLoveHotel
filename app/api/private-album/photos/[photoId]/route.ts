import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/lib/server-auth'
import {
  ensurePrivateAlbumSchema,
  isActiveAlbumMember,
  privateNoStoreHeaders,
  PRIVATE_ALBUM_PHOTO_ID
} from '@/lib/private-album'
import { withTransaction } from '@/lib/db'
import { removeAlbumMediaFromWall } from '@/lib/album-wall-publication'

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const user = await requireCurrentUser()
    const { photoId } = await params
    if (!PRIVATE_ALBUM_PHOTO_ID.test(photoId))
      return NextResponse.json(
        { error: 'Photo invalide.' },
        { status: 400, headers: privateNoStoreHeaders() }
      )
    await ensurePrivateAlbumSchema()
    if (!(await isActiveAlbumMember(user.id)))
      return NextResponse.json(
        { error: 'Compte non éligible.' },
        { status: 403, headers: privateNoStoreHeaders() }
      )
    const rows = await withTransaction(async (client) => {
      const deleted = await client.query(
        'DELETE FROM private_album_photos WHERE id=$1 AND owner_id=$2 RETURNING id',
        [photoId, user.id]
      )
      if (deleted.rows[0])
        await removeAlbumMediaFromWall(client, user.id, photoId)
      return deleted.rows
    })
    if (!rows[0])
      return NextResponse.json(
        { error: 'Photo introuvable.' },
        { status: 404, headers: privateNoStoreHeaders() }
      )
    return new NextResponse(null, {
      status: 204,
      headers: privateNoStoreHeaders()
    })
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error && cause.message === 'Authentification requise'
            ? 'Connexion requise.'
            : 'Suppression impossible.'
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
