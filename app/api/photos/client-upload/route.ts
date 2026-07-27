import { del, head } from '@vercel/blob'
import {
  handleUpload,
  type HandleUploadBody
} from '@vercel/blob/client'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import {
  IMAGE_TYPES,
  isValidImageSignature,
  MAX_PHOTO_SIZE_BYTES,
  type AllowedImageType
} from '@/lib/upload-validation'

const ALLOWED_CONTENT_TYPES = Object.keys(IMAGE_TYPES) as AllowedImageType[]
type ProfilePhotoPurpose = 'avatar' | 'gallery'

class ProfilePhotoUploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

function readPurpose(value: unknown): ProfilePhotoPurpose | null {
  return value === 'avatar' || value === 'gallery' ? value : null
}

function readClientPurpose(clientPayload: string | null) {
  if (!clientPayload) return null
  try {
    return readPurpose(JSON.parse(clientPayload)?.purpose)
  } catch {
    return null
  }
}

function readTokenPayload(tokenPayload: string | null | undefined) {
  if (!tokenPayload) return null
  try {
    const payload = JSON.parse(tokenPayload)
    const purpose = readPurpose(payload?.purpose)
    const userId = typeof payload?.userId === 'string' ? payload.userId : ''
    return purpose && userId ? { purpose, userId } : null
  } catch {
    return null
  }
}

function userPhotoPrefix(userId: string) {
  return `user-photos/${encodeURIComponent(userId)}/`
}

function isVercelBlobUrl(value: string) {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.public.blob.vercel-storage.com')
    )
  } catch {
    return false
  }
}

async function hasValidImageBytes(
  url: string,
  contentType: AllowedImageType
) {
  const response = await fetch(url, {
    headers: { range: 'bytes=0-11' },
    cache: 'no-store'
  })
  if (!response.ok) return false

  const bytes = new Uint8Array(await response.arrayBuffer()).slice(0, 12)
  return isValidImageSignature(contentType, bytes)
}

async function deleteInvalidBlob(url: string) {
  try {
    await del(url)
  } catch (error) {
    console.error('Invalid profile photo cleanup failed:', error)
  }
}

async function confirmProfilePhoto({
  cleanupInvalid,
  purpose,
  url,
  userId
}: {
  cleanupInvalid: boolean
  purpose: ProfilePhotoPurpose
  url: string
  userId: string
}) {
  if (!isVercelBlobUrl(url)) {
    throw new ProfilePhotoUploadError('Photo ou destination invalide.', 400)
  }

  const metadata = await head(url)
  const contentType = metadata.contentType as AllowedImageType
  const valid = (
    metadata.pathname.startsWith(userPhotoPrefix(userId)) &&
    metadata.size <= MAX_PHOTO_SIZE_BYTES &&
    contentType in IMAGE_TYPES &&
    await hasValidImageBytes(metadata.url, contentType)
  )

  if (!valid) {
    if (cleanupInvalid) await deleteInvalidBlob(metadata.url)
    throw new ProfilePhotoUploadError(
      'La photo envoyée est invalide ou non autorisée.',
      400
    )
  }

  if (purpose === 'avatar') {
    await sql`
      UPDATE users
      SET avatar = ${metadata.url}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `
    return { success: true as const, url: metadata.url }
  }

  const [existingPhoto] = await sql`
    SELECT id FROM photos
    WHERE user_id = ${userId} AND url = ${metadata.url}
    LIMIT 1
  `
  if (existingPhoto?.id) {
    return {
      success: true as const,
      id: existingPhoto.id,
      url: metadata.url
    }
  }

  const [{ count }] = await sql`
    SELECT COUNT(*) FROM photos WHERE user_id = ${userId}
  `
  if (Number(count || 0) >= 10) {
    throw new ProfilePhotoUploadError('Maximum 10 photos autorisées.', 400)
  }

  const [photo] = await sql`
    INSERT INTO photos (user_id, url, is_primary)
    VALUES (${userId}, ${metadata.url}, false)
    RETURNING id
  `
  return {
    success: true as const,
    id: photo.id,
    url: metadata.url
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HandleUploadBody
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getServerSession(authOptions)
        const user = session?.user
        if (!user) {
          throw new ProfilePhotoUploadError('Unauthorized', 401)
        }
        const purpose = readClientPurpose(clientPayload)
        if (!purpose) {
          throw new ProfilePhotoUploadError('Type de photo invalide.', 400)
        }
        if (!pathname.startsWith(userPhotoPrefix(String(user.id)))) {
          throw new ProfilePhotoUploadError(
            "Chemin d'envoi non autorisé.",
            403
          )
        }

        if (purpose === 'gallery') {
          const [{ count }] = await sql`
            SELECT COUNT(*) FROM photos WHERE user_id = ${user.id}
          `
          if (Number(count || 0) >= 10) {
            throw new Error('Maximum 10 photos autorisées.')
          }
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_PHOTO_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: user.id,
            purpose
          })
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = readTokenPayload(tokenPayload)
        if (!payload) {
          throw new ProfilePhotoUploadError(
            "Preuve d'envoi invalide.",
            400
          )
        }
        await confirmProfilePhoto({
          cleanupInvalid: true,
          purpose: payload.purpose,
          url: blob.url,
          userId: payload.userId
        })
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    const status = error instanceof ProfilePhotoUploadError
      ? error.status
      : 500
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "La préparation de l'envoi a échoué."
      },
      { status }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      purpose?: unknown
      url?: unknown
    }
    const purpose = readPurpose(body.purpose)
    const url = typeof body.url === 'string' ? body.url : ''
    if (!purpose || !url) {
      return NextResponse.json(
        { error: 'Photo ou destination invalide.' },
        { status: 400 }
      )
    }

    return NextResponse.json(await confirmProfilePhoto({
      cleanupInvalid: false,
      purpose,
      url,
      userId: String(user.id)
    }))
  } catch (error) {
    console.error('Direct profile photo confirmation failed:', error)
    const status = error instanceof ProfilePhotoUploadError
      ? error.status
      : 500
    return NextResponse.json(
      {
        error: error instanceof ProfilePhotoUploadError
          ? error.message
          : "La photo n'a pas pu être confirmée. Réessayez dans un instant."
      },
      { status }
    )
  }
}
