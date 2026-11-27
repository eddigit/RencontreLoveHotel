import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server-auth'
import { readPrivatePhotoVerificationEvidence } from '@/lib/private-photo-verification'

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' }
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Accès administrateur requis' }, { status: 403, headers: noStore }) }
  const evidence = await readPrivatePhotoVerificationEvidence((await params).id)
  if (!evidence) return NextResponse.json({ error: 'Preuve indisponible' }, { status: 404, headers: noStore })
  return new NextResponse(evidence.image, { headers: { ...noStore, 'Content-Type': evidence.mimeType, 'Content-Disposition': 'inline' } })
}
