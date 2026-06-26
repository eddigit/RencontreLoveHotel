'use server'

import { markUserSeen } from '@/lib/presence'
import { requireCurrentUser } from '@/lib/server-auth'

export async function touchCurrentUserPresence() {
  try {
    const user = await requireCurrentUser()
    await markUserSeen(user.id)
    return { success: true }
  } catch (error) {
    console.error('Unable to update current user presence:', error)
    return { success: false }
  }
}
