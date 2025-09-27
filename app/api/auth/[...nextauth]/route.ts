import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { verifyUserCredentials, getUserById, getOrCreateOAuthUser, getUserByEmail } from "@/lib/user-service" // Added getUserById and getUserByEmail

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await verifyUserCredentials(credentials.email, credentials.password);
        if (user) {
          // Vérification souple : autorise si email_verified est true, null ou undefined (bloque seulement si === false)
          if (user.email_verified === false) {
            return null;
          }
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            onboarding_completed: user.onboarding_completed,
          };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Pour les logins OAuth (Google, Facebook)
      if (account?.provider && account.provider !== "credentials") {
        // Crée l'utilisateur et le profil s'ils n'existent pas
        await getOrCreateOAuthUser({
          email: user.email!,
          name: user.name ?? undefined,
          avatar: user.image ?? undefined,
        })
      }
      return true
    },
    async session({ session, token }) {
      // Attach user id, role, avatar, and onboardingCompleted to session
      if (session.user) {
        session.user.id = token.sub
        session.user.role = token.role as string
        session.user.avatar = token.avatar as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean // Assign from token
        session.user.email_verified = token.email_verified as boolean // Add email_verified to session
      }
      return session
    },
    async jwt({ token, user, account, profile, trigger, session: sessionFromUpdate }) {
      // Toujours récupérer l'utilisateur depuis la base par email pour obtenir le vrai UUID
      if (user?.email) {
        const dbUser = await getUserByEmail(user.email) // <-- FIX: fetch by email, not by id
        if (dbUser) {
          token.sub = dbUser.id // Toujours le vrai UUID
          token.role = dbUser.role
          token.avatar = dbUser.avatar
          token.onboardingCompleted = dbUser.onboarding_completed
          token.email_verified = dbUser.email_verified // Add email_verified to JWT
        }
      }
      // If session was updated (e.g., by calling useSession().update())
      // and we want to refresh data from the DB:
      if (trigger === "update" && token.sub) {
        const dbUser = await getUserById(token.sub as string)
        if (dbUser) {
          token.name = dbUser.name
          token.role = dbUser.role
          token.avatar = dbUser.avatar
          token.onboardingCompleted = dbUser.onboarding_completed
          token.email_verified = dbUser.email_verified // Add email_verified to JWT
        }
      }
      return token
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
