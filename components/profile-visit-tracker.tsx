'use client'

import { useEffect } from 'react'
import { recordProfileVisit } from '@/actions/profile-visit-actions'

/** Runs only after the profile is mounted in a visible browser tab. */
export function ProfileVisitTracker({ profileUserId }: { profileUserId: string }) {
  useEffect(() => {
    let active = true
    let recorded = false

    const recordVisibleVisit = () => {
      if (!active || recorded || document.visibilityState !== 'visible') return
      recorded = true
      void recordProfileVisit(profileUserId).catch(() => undefined)
    }

    recordVisibleVisit()
    document.addEventListener('visibilitychange', recordVisibleVisit)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', recordVisibleVisit)
    }
  }, [profileUserId])

  return (
    <p className='mt-3 text-xs leading-5 text-[#aaa69e]'>
      Cette visite apparaîtra dans l’historique de ce membre.
    </p>
  )
}
