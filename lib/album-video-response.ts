import { NextResponse } from 'next/server'

export function albumVideoResponse(
  bytes: Uint8Array<ArrayBuffer>,
  mimeType: string,
  range: string | null,
  headers: HeadersInit
) {
  const base = {
    ...headers,
    'Content-Type': mimeType,
    'Accept-Ranges': 'bytes'
  }
  const size = bytes.byteLength
  if (!range)
    return new NextResponse(bytes, {
      headers: { ...base, 'Content-Length': String(size) }
    })

  const match = /^bytes=(\d*)-(\d*)$/.exec(range)
  if (match && (match[1] || match[2])) {
    const start = match[1]
      ? Number(match[1])
      : Math.max(0, size - Number(match[2]))
    const end =
      match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
    if (Number.isSafeInteger(start) && start <= end && start < size) {
      return new NextResponse(bytes.subarray(start, end + 1), {
        status: 206,
        headers: {
          ...base,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(end - start + 1)
        }
      })
    }
  }
  return new NextResponse(null, {
    status: 416,
    headers: { ...base, 'Content-Range': `bytes */${size}` }
  })
}
