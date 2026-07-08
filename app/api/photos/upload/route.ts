import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { put } from '@vercel/blob'

const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024

const IMAGE_TYPES = {
  'image/jpeg': { extension: 'jpg' },
  'image/png': { extension: 'png' },
  'image/webp': { extension: 'webp' }
} as const

type AllowedImageType = keyof typeof IMAGE_TYPES

function startsWithBytes(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte)
}

function isValidImageSignature(type: AllowedImageType, bytes: Uint8Array) {
  if (type === 'image/jpeg') {
    return startsWithBytes(bytes, [0xff, 0xd8, 0xff])
  }

  if (type === 'image/png') {
    return startsWithBytes(bytes, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    ])
  }

  return (
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
}

async function validatePhotoFile(file: File) {
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      ok: false as const,
      error: 'Photo trop lourde: maximum 8 Mo.'
    }
  }

  if (!(file.type in IMAGE_TYPES)) {
    return {
      ok: false as const,
      error: 'Format photo non autorisé. Utilisez JPG, PNG ou WebP.'
    }
  }

  const imageType = file.type as AllowedImageType
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!isValidImageSignature(imageType, header)) {
    return {
      ok: false as const,
      error: 'Fichier image invalide.'
    }
  }

  return {
    ok: true as const,
    extension: IMAGE_TYPES[imageType].extension
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('photo') as File
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Aucun fichier sélectionné' }, { status: 400 })
  }

  const validation = await validatePhotoFile(file)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const countRes = await sql`SELECT COUNT(*) FROM photos WHERE user_id = ${user.id}`
    if (parseInt(countRes[0].count) >= 10) {
      return NextResponse.json({ error: 'Maximum 10 photos autorisées' }, { status: 400 })
    }
    const blob = await put(
      `user-photos/${user.id}-${Date.now()}.${validation.extension}`,
      file,
      { access: 'public' }
    )
    await sql`
      INSERT INTO photos (user_id, url, is_primary)
      VALUES (${user.id}, ${blob.url}, false)
    `
    return NextResponse.json({ success: true, url: blob.url })
  } catch (error) {
    return NextResponse.json({ error: "Échec du téléchargement de la photo" }, { status: 500 })
  }
}
