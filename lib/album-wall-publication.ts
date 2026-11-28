import type { PoolClient } from 'pg'

export class AlbumWallPublicationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

/** Called inside the upload transaction after locking the owner's row. */
export async function publishAlbumMediaOnWall(
  client: PoolClient,
  ownerId: string,
  mediaId: string
) {
  const { rows } = await client.query<{
    audience: string
    mime_type: string
    bytes: number
  }>(
    'SELECT audience, mime_type, bytes FROM private_album_photos WHERE id = $1 AND owner_id = $2',
    [mediaId, ownerId]
  )
  const media = rows[0]
  if (media?.audience !== 'members') {
    throw new AlbumWallPublicationError(
      'Seul un média visible aux membres peut être publié sur le mur.',
      400
    )
  }
  const quota = await client.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM wall_posts WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '24 hours' AND status <> 'removed'`,
    [ownerId]
  )
  if (quota.rows[0].total >= 3) {
    throw new AlbumWallPublicationError(
      'Vous avez déjà publié trois annonces en 24 h. Décochez la publication sur le mur pour ajouter ce média à votre galerie.',
      429
    )
  }
  const video = media.mime_type.startsWith('video/')
  const contentUrl = `/api/private-album/photos/${mediaId}/content${video ? '?media=video' : ''}`
  // The historical wall schema reserves image_mime_type for still images.
  await client.query(
    `INSERT INTO wall_posts (user_id, type, body, status, image_url, image_mime_type, image_size_bytes)
     VALUES ($1, 'profil', '', 'active', $2, $3, $4)`,
    [ownerId, contentUrl, video ? null : media.mime_type, media.bytes]
  )
}

export async function removeAlbumMediaFromWall(
  client: PoolClient,
  ownerId: string,
  mediaId: string
) {
  const contentUrl = `/api/private-album/photos/${mediaId}/content`
  await client.query(
    `UPDATE wall_posts SET status = 'removed', updated_at = NOW()
     WHERE user_id = $1 AND image_url IN ($2, $3) AND status <> 'removed'`,
    [ownerId, contentUrl, contentUrl + '?media=video']
  )
}
