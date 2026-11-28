import { describe, expect, it } from 'vitest'
import { albumVideoResponse } from '@/lib/album-video-response'

describe('authorized album video delivery', () => {
  const read = (range: string | null) => albumVideoResponse(new Uint8Array([0, 1, 2, 3]), 'video/mp4', range, { 'Cache-Control': 'private, no-store' })
  it.each([['bytes=0-1', [0, 1]], ['bytes=2-', [2, 3]], ['bytes=-1', [3]]])('serves %s', async (range, expected) => {
    const response = read(String(range))
    expect(response.status).toBe(206)
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(expected)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('refuses unavailable ranges and serves the complete clip without a range', () => {
    expect(read('bytes=4-').status).toBe(416)
    expect(read(null).headers.get('content-length')).toBe('4')
  })
})
