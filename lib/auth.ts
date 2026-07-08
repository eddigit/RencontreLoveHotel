import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import FacebookProvider from 'next-auth/providers/facebook'
import GoogleProvider from 'next-auth/providers/google'
import {
  getOrCreateOAuthUser,
  getUserByEmail,
  getUserById,
  verifyUserCredentials
} from '@/lib/user-service'

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
        try {
          if (!credentials?.email || !credentials?.password) return null
          const user = await verifyUserCredentials(
            credentials.email,
            credentials.password
          )

          if (!user) return null

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
      if (account?.provider && account.provider !== 'credentials') {
        await getOrCreateOAuthUser({
          email: user.email!,
          name: user.name ?? undefined,
          avatar: user.image ?? undefined
        })
      }
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub
        session.user.role = token.role as string
        session.user.avatar = token.avatar as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
        session.user.email_verified = token.email_verified as boolean
      }
      return session
    },
    async jwt({ token, user, trigger }) {
      try {
        if (user?.email) {
          const dbUser = await getUserByEmail(user.email)
          if (dbUser) {
            token.sub = dbUser.id
            token.role = dbUser.role
            token.avatar = dbUser.avatar
            token.onboardingCompleted = dbUser.onboarding_completed
            token.email_verified = dbUser.email_verified
          } else {
            console.warn(
              "Impossible de récupérer l'utilisateur depuis la DB, utilisation des données de base"
            )
            token.sub = user.id || token.sub
            token.role = token.role || 'user'
            token.onboardingCompleted = token.onboardingCompleted ?? false
            token.email_verified = token.email_verified ?? false
          }
        }

        if (trigger === 'update' && token.sub) {
          const dbUser = await getUserById(token.sub as string)
          if (dbUser) {
            token.name = dbUser.name
            token.role = dbUser.role
            token.avatar = dbUser.avatar
            token.onboardingCompleted = dbUser.onboarding_completed
            token.email_verified = dbUser.email_verified
          }
        }
      } catch (error) {
        console.error('Erreur dans le callback JWT:', error)
        if (user) {
          token.sub = user.id || token.sub
          token.role = token.role || 'user'
          token.onboardingCompleted = token.onboardingCompleted ?? false
          token.email_verified = token.email_verified ?? false
        }
      }
      return token
    }
  }
}
