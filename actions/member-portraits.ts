'use server'

import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { listMemberPortraits } from '@/lib/member-portraits'

export async function nextMemberPortraits(offset: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.onboardingCompleted || !Number.isSafeInteger(offset) || offset < 0) return []
  return listMemberPortraits(session.user.id, offset)
}
