'use client'

import { useEffect } from 'react'
import { touchCurrentUserPresence } from '@/actions/presence-actions'
import { useAuth } from '@/contexts/auth-context'
import { PRESENCE_HEARTBEAT_MS } from '@/lib/presence-config'

export function PresenceHeartbeat() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    let active = true

    const touch = async () => {
      if (!active || document.visibilityState === 'hidden') return
      try {
        await touchCurrentUserPresence()
      } catch (error) {
        console.error('Unable to refresh user presence:', error)
      }
    }

    touch()
    const interval = setInterval(touch, PRESENCE_HEARTBEAT_MS)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        touch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user?.id])

  return null
}
