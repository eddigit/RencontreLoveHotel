import { Suspense, type ReactNode } from 'react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { CommunityPortraits } from '@/components/community-portraits'
import { JougPilotInvitation } from '@/components/joug-pilot-invitation'
import { getJougPilotConfig } from '@/lib/joug-pilot'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default async function DiscoverLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  const canSeePilot = Boolean(session?.user?.id && session.user.onboardingCompleted)

  return (
    <>
      {canSeePilot && session?.user?.id && (
        <Suspense fallback={<div aria-busy='true' aria-label='Chargement des membres' className='h-48 animate-pulse bg-slate-100' />}>
          <CommunityPortraits viewerId={session.user.id} />
        </Suspense>
      )}
      {children}
      {canSeePilot && (
        <div className='mx-auto w-full max-w-[1680px] px-4 pb-6 pt-2 sm:px-6 lg:px-8'>
          <JougPilotInvitation pilot={await getJougPilotConfig()} />
        </div>
      )}
    </>
  )
}
