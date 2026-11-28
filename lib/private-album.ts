import sharp from 'sharp'
import { sql, withTransaction } from '@/lib/db'

export const PRIVATE_ALBUM_PHOTO_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const PRIVATE_ALBUM_MAX_INPUT_BYTES = 4 * 1024 * 1024
export const PRIVATE_ALBUM_MAX_OUTPUT_BYTES = 3 * 1024 * 1024
export const PRIVATE_ALBUM_MAX_PHOTOS = 12
export type PrivateAlbumAudience = 'members' | 'private'
export type PrivateAlbumMediaType = 'image/webp' | 'video/mp4' | 'video/webm'

let schemaPromise: Promise<void> | undefined
export function ensurePrivateAlbumSchema() {
  if (!schemaPromise)
    schemaPromise = withTransaction(async (client) => {
      // Serializes cold-start DDL across concurrent serverless instances.
      await client.query('SELECT pg_advisory_xact_lock(842847201)')
      await client.query(`
    CREATE TABLE IF NOT EXISTS private_album_photos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, audience TEXT NOT NULL CHECK (audience IN ('members','private')), image BYTEA NOT NULL, mime_type TEXT NOT NULL CHECK (mime_type IN ('image/webp','video/mp4','video/webm')), bytes INTEGER NOT NULL CHECK (bytes > 0 AND bytes <= 3145728), width INTEGER, height INTEGER, CHECK ((mime_type='image/webp' AND width > 0 AND width <= 2048 AND height > 0 AND height <= 2048) OR (mime_type IN ('video/mp4','video/webm') AND width IS NULL AND height IS NULL)), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS private_album_photos_owner_created ON private_album_photos(owner_id, created_at ASC);
    CREATE TABLE IF NOT EXISTS private_album_access_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','granted','declined','revoked')), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, decided_at TIMESTAMPTZ, CHECK (owner_id <> requester_id));
    CREATE UNIQUE INDEX IF NOT EXISTS private_album_one_pending_request ON private_album_access_requests(owner_id, requester_id) WHERE status='pending';
    CREATE TABLE IF NOT EXISTS private_album_grants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, request_id UUID REFERENCES private_album_access_requests(id) ON DELETE SET NULL, granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, CHECK (owner_id <> viewer_id), CHECK (expires_at > granted_at), UNIQUE(owner_id,viewer_id));
    CREATE INDEX IF NOT EXISTS private_album_grants_viewer_active ON private_album_grants(viewer_id, expires_at) WHERE revoked_at IS NULL;
    `)
    }).catch((error) => {
      schemaPromise = undefined
      throw error
    })
  return schemaPromise
}

export function privateNoStoreHeaders(extra: HeadersInit = {}) {
  return {
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    ...extra
  }
}

export function parsePrivateAlbumAudience(
  value: unknown
): PrivateAlbumAudience | null {
  return value === 'members' || value === 'private' ? value : null
}

export async function recodePrivateAlbumImage(file: File) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size <= 0 ||
    file.size > PRIVATE_ALBUM_MAX_INPUT_BYTES
  )
    throw new Error('Image invalide ou trop volumineuse.')
  try {
    const encoded = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40_000_000,
      failOn: 'error'
    })
      .rotate()
      .resize({
        width: 2048,
        height: 2048,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true })
    if (
      !encoded.data.length ||
      encoded.data.length > PRIVATE_ALBUM_MAX_OUTPUT_BYTES ||
      !encoded.info.width ||
      !encoded.info.height
    )
      throw new Error('Image recodée trop volumineuse.')
    return {
      image: encoded.data,
      width: encoded.info.width,
      height: encoded.info.height
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('volumineuse'))
      throw error
    throw new Error('Image illisible.')
  }
}

export async function validatePrivateAlbumVideo(file: File) {
  if (
    !['video/mp4', 'video/webm'].includes(file.type) ||
    file.size <= 0 ||
    file.size > PRIVATE_ALBUM_MAX_OUTPUT_BYTES
  )
    throw new Error('Vidéo invalide ou trop volumineuse.')
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  const mp4 =
    file.type === 'video/mp4' &&
    header.length >= 12 &&
    String.fromCharCode(...header.slice(4, 8)) === 'ftyp'
  const webm =
    file.type === 'video/webm' &&
    header.length >= 4 &&
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3
  if (!mp4 && !webm) throw new Error('Vidéo illisible.')
  return {
    media: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type as Extract<
      PrivateAlbumMediaType,
      'video/mp4' | 'video/webm'
    >
  }
}

/** The profile must be active and visible; the caller supplies only UUID params. */
export const eligibleMemberSql = (idPlaceholder: string) => `
  EXISTS (SELECT 1 FROM users eu JOIN user_profiles ep ON ep.user_id = eu.id
    WHERE eu.id = ${idPlaceholder} AND COALESCE(eu.is_banned,false)=false
      AND COALESCE(eu.status,'active')='active' AND ep.display_profile IS TRUE)`

export async function isEligibleAlbumMember(userId: string) {
  const rows = await sql.query<Array<{ eligible: boolean }>>(
    `SELECT ${eligibleMemberSql('$1')} AS eligible`,
    [userId]
  )
  return rows[0]?.eligible === true
}

export async function isActiveAlbumMember(userId: string) {
  const rows = await sql.query<Array<{ eligible: boolean }>>(
    `SELECT EXISTS (SELECT 1 FROM users WHERE id=$1 AND COALESCE(is_banned,false)=false AND COALESCE(status,'active')='active') AS eligible`,
    [userId]
  )
  return rows[0]?.eligible === true
}

export function publicPrivateAlbumPhoto(row: {
  id: string
  audience: PrivateAlbumAudience
  mime_type: PrivateAlbumMediaType
  width: number | null
  height: number | null
  created_at: string | Date
}) {
  return {
    id: row.id,
    audience: row.audience,
    mediaType: row.mime_type,
    width: row.width,
    height: row.height,
    createdAt: new Date(row.created_at).toISOString(),
    contentUrl: `/api/private-album/photos/${row.id}/content`
  }
}
