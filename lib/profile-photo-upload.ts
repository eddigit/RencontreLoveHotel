'use client'

import { upload } from '@vercel/blob/client'
import {
  validateImageUploadFile,
  type AllowedImageType
} from '@/lib/upload-validation'

export type ProfilePhotoPurpose = 'avatar' | 'gallery'

type ProfilePhotoUploadResult = {
  success: true
  id?: string
  url: string
}

const HEIC_TYPES = new Set(['image/heic', 'image/heif'])

export async function parsePhotoUploadResponse(
  response: Response
): Promise<ProfilePhotoUploadResult> {
  const responseText = await response.text()
  let result: Partial<ProfilePhotoUploadResult> & { error?: string } = {}

  if (responseText) {
    try {
      result = JSON.parse(responseText)
    } catch {
      result = {}
    }
  }

  if (!response.ok || !result.success || !result.url) {
    if (response.status === 413) {
      throw new Error(
        'Photo trop lourde. La taille maximale autorisée est de 8 Mo.'
      )
    }
    throw new Error(
      result.error ||
      "La photo n'a pas pu être envoyée. Vérifiez le format et réessayez."
    )
  }

  return {
    success: true,
    id: result.id,
    url: result.url
  }
}

function readableUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  const normalized = message.toLowerCase()

  if (
    normalized.includes('too large') ||
    normalized.includes('maximum size') ||
    normalized.includes('payload_too_large')
  ) {
    return 'Photo trop lourde. La taille maximale autorisée est de 8 Mo.'
  }
  if (
    normalized.includes('content type') ||
    normalized.includes('mime') ||
    normalized.includes('format')
  ) {
    return 'Format photo non autorisé. Utilisez JPG, PNG ou WebP.'
  }

  return message ||
    "La photo n'a pas pu être envoyée. Vérifiez votre connexion et réessayez."
}

export async function uploadProfilePhoto({
  file,
  purpose,
  userId,
  onProgress
}: {
  file: File
  purpose: ProfilePhotoPurpose
  userId: string
  onProgress?: (percentage: number) => void
}): Promise<ProfilePhotoUploadResult> {
  if (HEIC_TYPES.has(file.type.toLowerCase()) || /\.hei[cf]$/i.test(file.name)) {
    throw new Error(
      'Format HEIC non accepté. Sur iPhone, choisissez une photo JPG/PNG/WebP ou activez le format « Le plus compatible ».'
    )
  }

  const validation = await validateImageUploadFile(file)
  if (!validation.ok) throw new Error(validation.error)

  try {
    const pathname = [
      'user-photos',
      encodeURIComponent(userId),
      `${Date.now()}-${crypto.randomUUID()}.${validation.extension}`
    ].join('/')
    const blob = await upload(pathname, file, {
      access: 'public',
      contentType: file.type as AllowedImageType,
      handleUploadUrl: '/api/photos/client-upload',
      clientPayload: JSON.stringify({ purpose }),
      onUploadProgress: progress => onProgress?.(Math.round(progress.percentage))
    })
    const response = await fetch('/api/photos/client-upload', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ purpose, url: blob.url })
    })

    return await parsePhotoUploadResponse(response)
  } catch (error) {
    throw new Error(readableUploadError(error))
  }
}
