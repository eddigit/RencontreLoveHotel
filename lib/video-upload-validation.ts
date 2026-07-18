const MAX_PROFILE_VIDEO_SIZE = 50 * 1024 * 1024

type ValidVideo = {
  extension: 'mp4' | 'webm'
  mimeType: 'video/mp4' | 'video/webm'
}

type VideoValidationResult =
  | { ok: true; video: ValidVideo }
  | { ok: false; error: string }

function hasBytesAt (bytes: Uint8Array, offset: number, signature: number[]) {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

export async function validateProfileVideo (file: File): Promise<VideoValidationResult> {
  if (file.size > MAX_PROFILE_VIDEO_SIZE) {
    return { ok: false, error: 'La vidéo ne doit pas dépasser 50 Mo.' }
  }

  if (!['video/mp4', 'video/webm'].includes(file.type)) {
    return { ok: false, error: 'Format non pris en charge. Utilisez une vidéo MP4 ou WebM.' }
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const isMp4 = file.type === 'video/mp4' && hasBytesAt(bytes, 4, [0x66, 0x74, 0x79, 0x70])
  const isWebm = file.type === 'video/webm' && hasBytesAt(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])

  if (!isMp4 && !isWebm) {
    return { ok: false, error: 'Le contenu de la vidéo ne correspond pas au format annoncé.' }
  }

  return {
    ok: true,
    video: isMp4
      ? { extension: 'mp4', mimeType: 'video/mp4' }
      : { extension: 'webm', mimeType: 'video/webm' }
  }
}

