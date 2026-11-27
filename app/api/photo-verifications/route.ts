import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { submitPrivatePhotoVerification } from '@/lib/private-photo-verification'

const noStore = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' }
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (!origin || !host) return false
  try { return new URL(origin).host === host } catch { return false }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403, headers: noStore })
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Authentification requise' }, { status: 401, headers: noStore })
  try {
    const formData = await request.formData()
    if (formData.get('consent') !== 'yes') return NextResponse.json({ error: 'Consentement requis' }, { status: 400, headers: noStore })
    const file = formData.get('evidence')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Image de vérification requise' }, { status: 400, headers: noStore })
    const id = await submitPrivatePhotoVerification(session.user.id, file)
    return NextResponse.json({ verification: { id, status: 'pending', evidenceAvailable: true } }, { status: 201, headers: noStore })
  } catch (error) {
    return NextResponse.json({ error: 'Soumission impossible. Vérifiez votre image et votre profil.' }, { status: 400, headers: noStore })
  }
}
