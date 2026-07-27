import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.hoisted(() => vi.fn())
const handleUploadMock = vi.hoisted(() => vi.fn())
const headMock = vi.hoisted(() => vi.fn())
const delMock = vi.hoisted(() => vi.fn())
const sqlMock = vi.hoisted(() => vi.fn())

vi.mock('next-auth/next', () => ({
  getServerSession: getServerSessionMock
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

vi.mock('@vercel/blob/client', () => ({
  handleUpload: handleUploadMock
}))

vi.mock('@vercel/blob', () => ({
  del: delMock,
  head: headMock
}))

vi.mock('@/lib/db', () => ({
  sql: sqlMock
}))

function request(method: 'POST' | 'PATCH', body: unknown) {
  return new Request('https://example.test/api/photos/client-upload', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }) as any
}

describe('profile photo client upload route', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset()
    handleUploadMock.mockReset()
    headMock.mockReset()
    delMock.mockReset()
    sqlMock.mockReset()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
          ]),
          { status: 206 }
        )
      )
    )
  })

  it('blocks anonymous upload token requests', async () => {
    getServerSessionMock.mockResolvedValue(null)
    handleUploadMock.mockImplementation(async options => {
      await options.onBeforeGenerateToken(
        'user-photos/user-1/photo.png',
        JSON.stringify({ purpose: 'avatar' }),
        false
      )
    })

    const { POST } = await import('@/app/api/photos/client-upload/route')
    const response = await POST(request('POST', {}))

    expect(response.status).toBe(401)
    expect(handleUploadMock).toHaveBeenCalledTimes(1)
  })

  it('issues a user-scoped token limited to supported images and 8 MB', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })
    handleUploadMock.mockImplementation(async options => {
      const tokenOptions = await options.onBeforeGenerateToken(
        'user-photos/user-1/photo.png',
        JSON.stringify({ purpose: 'avatar' }),
        false
      )
      expect(tokenOptions.allowedContentTypes).toEqual([
        'image/jpeg',
        'image/png',
        'image/webp'
      ])
      expect(tokenOptions.maximumSizeInBytes).toBe(8 * 1024 * 1024)
      return { type: 'blob.generate-client-token', clientToken: 'signed-token' }
    })

    const { POST } = await import('@/app/api/photos/client-upload/route')
    const response = await POST(request('POST', { type: 'token-request' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      type: 'blob.generate-client-token',
      clientToken: 'signed-token'
    })
  })

  it('rejects a completed blob outside the connected user path', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })
    headMock.mockResolvedValue({
      size: 1024,
      pathname: 'user-photos/user-2/photo.png',
      contentType: 'image/png',
      url: 'https://store.public.blob.vercel-storage.com/photo.png'
    })

    const { PATCH } = await import('@/app/api/photos/client-upload/route')
    const response = await PATCH(
      request('PATCH', {
        purpose: 'avatar',
        url: 'https://store.public.blob.vercel-storage.com/photo.png'
      })
    )

    expect(response.status).toBe(400)
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('rejects non-Vercel URLs before requesting their metadata', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const { PATCH } = await import('@/app/api/photos/client-upload/route')
    const response = await PATCH(
      request('PATCH', {
        purpose: 'avatar',
        url: 'https://example.org/untrusted-photo.png'
      })
    )

    expect(response.status).toBe(400)
    expect(headMock).not.toHaveBeenCalled()
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('confirms a valid direct upload as the connected user avatar', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })
    headMock.mockResolvedValue({
      size: 1024,
      pathname: 'user-photos/user-1/photo.png',
      contentType: 'image/png',
      url: 'https://store.public.blob.vercel-storage.com/photo.png'
    })
    sqlMock.mockResolvedValue([{ id: 'user-1' }])

    const { PATCH } = await import('@/app/api/photos/client-upload/route')
    const response = await PATCH(
      request('PATCH', {
        purpose: 'avatar',
        url: 'https://store.public.blob.vercel-storage.com/photo.png'
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      url: 'https://store.public.blob.vercel-storage.com/photo.png'
    })
    expect(String(sqlMock.mock.calls[0][0])).toContain('UPDATE users')
  })

  it('validates and persists the server-to-server upload callback', async () => {
    getServerSessionMock.mockResolvedValue(null)
    headMock.mockResolvedValue({
      size: 1024,
      pathname: 'user-photos/user-1/photo.png',
      contentType: 'image/png',
      url: 'https://store.public.blob.vercel-storage.com/photo.png'
    })
    sqlMock.mockResolvedValue([{ id: 'user-1' }])
    handleUploadMock.mockImplementation(async options => {
      await options.onUploadCompleted({
        blob: {
          url: 'https://store.public.blob.vercel-storage.com/photo.png'
        },
        tokenPayload: JSON.stringify({
          userId: 'user-1',
          purpose: 'avatar'
        })
      })
      return { type: 'blob.upload-completed', response: 'ok' }
    })

    const { POST } = await import('@/app/api/photos/client-upload/route')
    const response = await POST(
      request('POST', { type: 'blob.upload-completed' })
    )

    expect(response.status).toBe(200)
    expect(String(sqlMock.mock.calls[0][0])).toContain('UPDATE users')
  })

  it('deletes an invalid blob received by the completion callback', async () => {
    getServerSessionMock.mockResolvedValue(null)
    headMock.mockResolvedValue({
      size: 1024,
      pathname: 'user-photos/user-1/photo.png',
      contentType: 'image/png',
      url: 'https://store.public.blob.vercel-storage.com/photo.png'
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([0x00, 0x01, 0x02]), { status: 206 })
      )
    )
    handleUploadMock.mockImplementation(async options => {
      await options.onUploadCompleted({
        blob: {
          url: 'https://store.public.blob.vercel-storage.com/photo.png'
        },
        tokenPayload: JSON.stringify({
          userId: 'user-1',
          purpose: 'avatar'
        })
      })
    })

    const { POST } = await import('@/app/api/photos/client-upload/route')
    const response = await POST(
      request('POST', { type: 'blob.upload-completed' })
    )

    expect(response.status).toBe(400)
    expect(delMock).toHaveBeenCalledWith(
      'https://store.public.blob.vercel-storage.com/photo.png'
    )
    expect(sqlMock).not.toHaveBeenCalled()
  })
})
