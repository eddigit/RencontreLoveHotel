export const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024

export const IMAGE_TYPES = {
  'image/jpeg': { extension: 'jpg' },
  'image/png': { extension: 'png' },
  'image/webp': { extension: 'webp' }
} as const

export type AllowedImageType = keyof typeof IMAGE_TYPES

function startsWithBytes(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte)
}

export function isValidImageSignature(
  type: AllowedImageType,
  bytes: Uint8Array
) {
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

export async function validateImageUploadFile(file: File) {
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
