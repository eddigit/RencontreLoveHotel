import { describe, expect, it } from 'vitest'
import { MAX_PHOTO_SIZE_BYTES, validateImageUploadFile } from '@/lib/upload-validation'

describe('image upload validation', () => {
  it('accepts a valid png signature and returns a server-controlled extension', async () => {
    const result = await validateImageUploadFile(
      new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        'event-photo.html',
        { type: 'image/png' }
      )
    )

    expect(result).toEqual({ ok: true, extension: 'png' })
  })

  it('rejects oversized event photos before storage', async () => {
    const result = await validateImageUploadFile(
      new File([new Uint8Array(MAX_PHOTO_SIZE_BYTES + 1)], 'large.webp', {
        type: 'image/webp'
      })
    )

    expect(result).toEqual({
      ok: false,
      error: 'Photo trop lourde: maximum 8 Mo.'
    })
  })

  it('rejects files whose bytes do not match the declared image type', async () => {
    const result = await validateImageUploadFile(
      new File(['not an image'], 'fake.jpg', { type: 'image/jpeg' })
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('invalide')
    }
  })
})
