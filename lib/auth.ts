import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import FacebookProvider from 'next-auth/providers/facebook'
import GoogleProvider from 'next-auth/providers/google'
import {
  getOrCreateOAuthUser,
  getUserByEmail,
  isUserAllowedToAuthenticate,
  verifyUserCredentials
} from '@/lib/user-service'
import { recordAuthEvent } from '@/lib/auth-audit'

function invalidateAuthToken(token: JWT): JWT {
  token.sub = undefined
  token.role = undefined
  token.avatar = undefined
  token.onboardingCompleted = false
  token.email_verified = false
  token.profile_status = undefined
  token.gender = undefined
  token.authBlocked = true
  return token
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile'
        }
      }
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      type: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const email = credentials?.email

        try {
          if (!email || !credentials?.password) {
            if (email) {
              await recordAuthEvent({
                email,
                provider: 'credentials',
                success: false
              })
            }
            return null
          }
          const user = await verifyUserCredentials(
            email,
            credentials.password
          )

          if (!user) {
            await recordAuthEvent({
              email,
              provider: 'credentials',
              success: false
            })
            return null
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            onboarding_completed: user.onboarding_completed
          }
        } catch (error) {
          console.error('Erreur dans authorize:', error)
          if (email) {
            await recordAuthEvent({
              email,
              provider: 'credentials',
              success: false
            })
          }
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async signIn({ user, account }) {
      let auditUser = user

      if (account?.provider && account.provider !== 'credentials') {
        const dbUser = await getOrCreateOAuthUser({
          email: user.email!,
          name: user.name ?? undefined,
          avatar: user.image ?? undefined
        })
        if (!dbUser || !isUserAllowedToAuthenticate(dbUser)) {
          await recordAuthEvent({
            email: user.email,
            provider: account.provider,
            success: false
          })
          return false
        }
        auditUser = { ...user, ...dbUser }
      }

      await recordAuthEvent({
        userId: auditUser.id,
        email: auditUser.email,
        role: 'role' in auditUser ? auditUser.role as string : null,
        provider: account?.provider || 'unknown',
        success: true
      })
      return true
    },
    async session({ session, token }) {
      if (token.authBlocked || !token.sub) {
        delete (session as Partial<typeof session>).user
        return session
      }

      if (session.user) {
        session.user.id = token.sub
        session.user.role = token.role as string
        session.user.avatar = token.avatar as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
        session.user.email_verified = token.email_verified as boolean
        session.user.profile_status = token.profile_status as string
        session.user.gender = token.gender as string
      }
      return session
    },
    async jwt({ token, user }) {
      try {
        const email = user?.email || token.email
        if (!email) {
          return invalidateAuthToken(token)
        }

        const dbUser = await getUserByEmail(email)
        if (!dbUser || !isUserAllowedToAuthenticate(dbUser)) {
          return invalidateAuthToken(token)
        }

        token.sub = dbUser.id
        token.email = dbUser.email
        token.name = dbUser.name
        token.role = dbUser.role
        token.avatar = dbUser.avatar
        token.onboardingCompleted = dbUser.onboarding_completed
        token.email_verified = dbUser.email_verified
        token.profile_status = dbUser.profile_status
        token.gender = dbUser.gender
        token.authBlocked = false
      } catch (error) {
        console.error('Erreur dans le callback JWT:', error)
        return invalidateAuthToken(token)
      }
      return token
    }
  }
}
