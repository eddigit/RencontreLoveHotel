import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export type ServerUser = {
  id: string
  role?: string | null
  email?: string | null
  adultVerified?: boolean
}

export async function requireAuthenticatedUser(): Promise<ServerUser> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Authentification requise')
  }

  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email,
    adultVerified: session.user.adultVerified === true
  }
}

export async function requireCurrentUser(): Promise<ServerUser> {
  return requireAuthenticatedUser()
}

export async function requireAdmin(): Promise<ServerUser> {
  const user = await requireCurrentUser()
  if (user.role !== 'admin') {
    throw new Error('Accès administrateur requis')
  }
  return user
}

export async function requireSameUserOrAdmin(
  userId: string,
  message = 'Action limitée à votre propre compte'
): Promise<ServerUser> {
  const user = await requireCurrentUser()
  if (user.id !== userId && user.role !== 'admin') {
    throw new Error(message)
  }
  return user
}
