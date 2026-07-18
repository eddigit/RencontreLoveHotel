import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { enforceMemberContent } from '@/lib/content-safety-service'

const MAX_SIZE_BY_KIND = {
  image: 12 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 75 * 1024 * 1024
} as const

const ALLOWED_PREFIXES = ['image/', 'audio/', 'video/'] as const

function getMediaType (mimeType: string): keyof typeof MAX_SIZE_BY_KIND | null {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return null
}

function safeFileName (name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

export async function POST (req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Aucun fichier selectionne' }, { status: 400 })
  }

  const mediaType = getMediaType(file.type)
  const isAllowed = ALLOWED_PREFIXES.some(prefix => file.type.startsWith(prefix))

  if (!mediaType || !isAllowed) {
    return NextResponse.json(
      { error: 'Format non supporte. Image, audio ou video uniquement.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BY_KIND[mediaType]) {
    return NextResponse.json(
      { error: 'Fichier trop volumineux pour la messagerie.' },
      { status: 400 }
    )
  }

  const originalName = safeFileName(file.name || `${mediaType}-message`)
  try {
    await enforceMemberContent({
      actorUserId: String(user.id),
      surface: 'attachment_filename',
      content: file.name || originalName
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'OFF_PLATFORM_CONTACT_BLOCKED') {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Coordonnées externes interdites.', code: error.code },
        { status: 400 }
      )
    }
    throw error
  }

  const blob = await put(
    `message-attachments/${user.id}/${Date.now()}-${originalName}`,
    file,
    {
      access: 'public',
      contentType: file.type
    }
  )

  return NextResponse.json({
    attachment: {
      url: blob.url,
      mediaType,
      fileName: originalName,
      mimeType: file.type,
      sizeBytes: file.size
    }
  })
}
