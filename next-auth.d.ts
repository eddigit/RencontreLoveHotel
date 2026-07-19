// next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string | null;
      role?: string | null;
      avatar?: string | null;
      onboardingCompleted?: boolean | null;
      email_verified?: boolean | null;
    } & DefaultSession["user"]; // Keep existing properties
  }

  interface User extends DefaultUser {
    role?: string | null;
    avatar?: string | null;
    onboarding_completed?: boolean | null; // Ensure this matches the property name from your authorize callback
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string | null;
    avatar?: string | null;
    onboardingCompleted?: boolean | null;
    // 'sub' (subject, typically user ID) is already part of DefaultJWT
  }
}
