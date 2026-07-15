import { requireCurrentUser, type ServerUser } from '@/lib/server-auth'

export type ModeratorUser = ServerUser & {
  role: 'admin' | 'community_moderator'
}

export async function requireModerator(): Promise<ModeratorUser> {
  const user = await requireCurrentUser()
  if (user.role !== 'admin' && user.role !== 'community_moderator') {
    throw new Error('Accès à la modération requis')
  }
  return user as ModeratorUser
}
