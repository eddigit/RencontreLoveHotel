import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/lib/server-auth'
import { sql, withTransaction } from '@/lib/db'
import {
  ensurePrivateAlbumSchema,
  isActiveAlbumMember,
  parsePrivateAlbumAudience,
  privateNoStoreHeaders,
  PRIVATE_ALBUM_MAX_PHOTOS,
  publicPrivateAlbumPhoto,
  recodePrivateAlbumImage,
  validatePrivateAlbumVideo
} from '@/lib/private-album'
import {
  AlbumWallPublicationError,
  publishAlbumMediaOnWall
} from '@/lib/album-wall-publication'

export const dynamic = 'force-dynamic'
const error = (message: string, status: number) =>
  NextResponse.json(
    { error: message },
    { status, headers: privateNoStoreHeaders() }
  )

export async function GET() {
  try {
    const user = await requireCurrentUser()
    await ensurePrivateAlbumSchema()
    if (!(await isActiveAlbumMember(user.id)))
      return error('Compte non éligible.', 403)
    const rows = await sql.query<Array<any>>(
      'SELECT id,audience,mime_type,width,height,created_at FROM private_album_photos WHERE owner_id=$1 ORDER BY created_at ASC',
      [user.id]
    )
    return NextResponse.json(
      { photos: rows.map(publicPrivateAlbumPhoto) },
      { headers: privateNoStoreHeaders() }
    )
  } catch (cause) {
    return error(
      cause instanceof Error && cause.message === 'Authentification requise'
        ? 'Connexion requise.'
        : 'Album momentanément indisponible.',
      cause instanceof Error && cause.message === 'Authentification requise'
        ? 401
        : 500
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser()
    await ensurePrivateAlbumSchema()
    if (!(await isActiveAlbumMember(user.id)))
      return error('Compte non éligible.', 403)
    const form = await request.formData()
    const file = form.get('file')
    const audience = parsePrivateAlbumAudience(
      form.get('audience') || 'private'
    )
    const publishToFeed = form.get('publishToFeed') === 'true'
    if (!(file instanceof File) || !audience)
      return error('Fichier ou audience invalide.', 400)
    if (publishToFeed && audience !== 'members')
      return error(
        'Seul un média visible aux membres peut être publié sur le mur.',
        400
      )
    const upload = file.type.startsWith('video/')
      ? await validatePrivateAlbumVideo(file)
      : await recodePrivateAlbumImage(file)
    const media = 'media' in upload ? upload.media : upload.image
    const mimeType = 'mimeType' in upload ? upload.mimeType : 'image/webp'
    const width = 'width' in upload ? upload.width : null
    const height = 'height' in upload ? upload.height : null
    const rows = await withTransaction(async (client) => {
      // A member-row lock makes the quota exact under concurrent uploads.
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [
        user.id
      ])
      const count = await client.query<{ count: string }>(
        'SELECT COUNT(*) FROM private_album_photos WHERE owner_id=$1',
        [user.id]
      )
      if (Number(count.rows[0]?.count) >= PRIVATE_ALBUM_MAX_PHOTOS)
        throw new AlbumWallPublicationError(
          `Maximum ${PRIVATE_ALBUM_MAX_PHOTOS} photos autorisées.`,
          409
        )
      const inserted = await client.query(
        `INSERT INTO private_album_photos(owner_id,audience,image,mime_type,bytes,width,height)
        SELECT u.id,$2,$3,$4,$5,$6,$7 FROM users u
        WHERE u.id=$1 AND COALESCE(u.is_banned,false)=false AND COALESCE(u.status,'active')='active'
        RETURNING id,audience,mime_type,width,height,created_at`,
        [user.id, audience, media, mimeType, media.length, width, height]
      )
      if (publishToFeed && inserted.rows[0])
        await publishAlbumMediaOnWall(client, user.id, inserted.rows[0].id)
      return inserted.rows
    })
    if (!rows[0]) return error('Compte non éligible.', 403)
    return NextResponse.json(
      { photo: publicPrivateAlbumPhoto(rows[0]) },
      { status: 201, headers: privateNoStoreHeaders() }
    )
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'Authentification requise')
      return error('Connexion requise.', 401)
    if (cause instanceof AlbumWallPublicationError)
      return error(cause.message, cause.status)
    if (cause instanceof Error && /^(Image|Vidéo) /.test(cause.message))
      return error(cause.message, 400)
    return error('Envoi impossible.', 500)
  }
}
