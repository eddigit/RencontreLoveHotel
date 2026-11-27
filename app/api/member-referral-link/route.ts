import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { referralTokenForMember } from '@/lib/member-referral'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const memberId = session?.user?.id
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ''
  if (!memberId || !secret) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  try {
    const token = await referralTokenForMember(memberId, secret)
    const origin = new URL(request.url).origin
    return NextResponse.json({ link: `${origin}/register?parrain=${encodeURIComponent(token)}` })
  } catch {
    return NextResponse.json({ error: 'Parrainage temporairement indisponible.' }, { status: 503 })
  }
}
