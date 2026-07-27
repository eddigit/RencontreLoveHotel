import { beforeEach, describe, expect, it, vi } from 'vitest'

const uploadMock = vi.hoisted(() => vi.fn())

vi.mock('@vercel/blob/client', () => ({
  upload: uploadMock
}))

import {
  parsePhotoUploadResponse,
  uploadProfilePhoto
} from '@/lib/profile-photo-upload'

function pngFile(name = 'photo.png') {
  return new File(
    [
      new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
      ])
    ],
    name,
    { type: 'image/png' }
  )
}

describe('profile photo client upload', () => {
  beforeEach(() => {
    uploadMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('uploads the file directly to Blob before confirming it with the app', async () => {
    uploadMock.mockResolvedValue({
      url: 'https://store.public.blob.vercel-storage.com/user-photo.png',
      pathname: 'user-photos/user-1/photo.png',
      contentType: 'image/png',
      contentDisposition: 'inline',
      downloadUrl: 'https://store.public.blob.vercel-storage.com/user-photo.png?download=1'
    })
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        id: 'photo-1',
        url: 'https://store.public.blob.vercel-storage.com/user-photo.png'
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await uploadProfilePhoto({
      file: pngFile(),
      purpose: 'gallery',
      userId: 'user-1'
    })

    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^user-photos\/user-1\//),
      expect.any(File),
      expect.objectContaining({
        access: 'public',
        handleUploadUrl: '/api/photos/client-upload'
      })
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/photos/client-upload',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(result).toEqual({
      success: true,
      id: 'photo-1',
      url: 'https://store.public.blob.vercel-storage.com/user-photo.png'
    })
  })

  it('turns an infrastructure size rejection into a useful message', async () => {
    await expect(
      parsePhotoUploadResponse(
        new Response('FUNCTION_PAYLOAD_TOO_LARGE', { status: 413 })
      )
    ).rejects.toThrow('Photo trop lourde')
  })

  it('explains unsupported iPhone HEIC photos before upload', async () => {
    await expect(
      uploadProfilePhoto({
        file: new File(['heic'], 'iphone.heic', { type: 'image/heic' }),
        purpose: 'avatar',
        userId: 'user-1'
      })
    ).rejects.toThrow('HEIC')
    expect(uploadMock).not.toHaveBeenCalled()
  })
})
