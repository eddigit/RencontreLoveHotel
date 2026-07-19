import { executeQuery } from "./db"
import { hash, compare } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import type { RegistrationConsent } from '@/lib/legal-policy'

// Types
export interface User {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  avatar?: string
  onboarding_completed: boolean
  email_verified?: boolean // Add this line
  status?: string | null
  profile_status?: string | null
  gender?: string | null
  is_banned?: boolean | null
  created_at: Date
  updated_at: Date
}

// Créer un nouvel utilisateur
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: "user" | "admin" = "user",
  consent?: RegistrationConsent
): Promise<User | null> {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    const hashedPassword = await hash(password, 10)
    const userId = uuidv4()
    const query = consent ? `
      WITH inserted_user AS (
        INSERT INTO users (id, email, password_hash, name, role, email_verified, email_verification_token)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, name, role, avatar, onboarding_completed, created_at, updated_at
      ), recorded_acceptances AS (
        INSERT INTO legal_acceptances (
          user_id, document_type, document_version, adult_confirmed, metadata
        )
        SELECT inserted_user.id, acceptance.document_type, acceptance.document_version, true,
               jsonb_build_object('source', 'registration')
        FROM inserted_user
        CROSS JOIN (VALUES
          ('terms', $8::text),
          ('privacy', $9::text),
          ('anti_solicitation', $10::text)
        ) AS acceptance(document_type, document_version)
      )
      SELECT * FROM inserted_user
    ` : `
      INSERT INTO users (id, email, password_hash, name, role, email_verified, email_verification_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, name, role, avatar, onboarding_completed, created_at, updated_at
    `
    const params = [
      userId,
      normalizedEmail,
      hashedPassword,
      name,
      role,
      true,
      null,
      ...(consent ? [
        consent.versions.terms,
        consent.versions.privacy,
        consent.versions.antiSolicitation
      ] : [])
    ]
    const result = (await executeQuery<User[]>(query, params)) ?? []
    return result.length ? result[0] : null
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error)
    throw error
  }
}

// Vérifier le token de vérification d'email
export async function verifyEmailToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const users = await executeQuery<User[]>(
      `SELECT id FROM users WHERE email_verification_token = $1 AND email_verified = false`,
      [token]
    )
    if (!users.length) {
      return { success: false, error: "Token invalide ou déjà utilisé." }
    }
    await executeQuery(
      `UPDATE users SET email_verified = true, email_verification_token = NULL WHERE id = $1`,
      [users[0].id]
    )
    return { success: true }
  } catch (error) {
    return { success: false, error: "Erreur serveur." }
  }
}

// Vérifier les identifiants de l'utilisateur
export async function verifyUserCredentials(email: string, password: string): Promise<User | null> {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    const query = `
      SELECT id, email, password_hash, name, role, avatar, onboarding_completed, email_verified, created_at, updated_at
      FROM users
      WHERE lower(email) = $1
    `

    const users = await executeQuery<Array<User & { password_hash: string }>>(query, [normalizedEmail])

    if (users.length === 0) {
      return null
    }

    const user = users[0]
    const passwordMatch = await compare(password, user.password_hash)

    if (!passwordMatch) {
      return null
    }

    // Ne pas renvoyer le hash du mot de passe
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error("Erreur lors de la vérification des identifiants:", error)
    return null
  }
}

// Récupérer un utilisateur par son ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    const query = `
      SELECT u.id, u.email, u.name, u.role, u.avatar, u.onboarding_completed,
             u.email_verified, u.status, u.is_banned, up.status AS profile_status,
             up.gender, u.created_at, u.updated_at
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = $1
    `

    const users = await executeQuery<User[]>(query, [id])
    return users[0] || null
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error)
    return null
  }
}

// Récupérer un utilisateur par son email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    const query = `
      SELECT u.id, u.email, u.name, u.role, u.avatar, u.onboarding_completed,
             u.email_verified, u.status, u.is_banned, up.status AS profile_status,
             up.gender, u.created_at, u.updated_at
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE lower(u.email) = $1
    `
    const users = await executeQuery<User[]>(query, [normalizedEmail])
    return users[0] || null
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur par email:", error)
    return null
  }
}

// Mettre à jour le statut d'onboarding d'un utilisateur
export async function updateOnboardingStatus(userId: string, completed: boolean): Promise<boolean> {
  try {
    const query = `
      UPDATE users
      SET onboarding_completed = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `

    await executeQuery(query, [completed, userId])
    return true
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut d'onboarding:", error)
    return false
  }
}

// Récupérer un compte OAuth existant. Toute création exige les consentements versionnés.
export async function getOrCreateOAuthUser({ email, name, avatar }: { email: string, name?: string, avatar?: string }) {
  // Vérifier si l'utilisateur existe déjà
  const existing = await executeQuery<User[]>(
    `SELECT id, email, name, role, avatar, onboarding_completed, created_at, updated_at FROM users WHERE email = $1`,
    [email]
  )
  if (existing.length > 0) {
    return existing[0]
  }
  return null
}

// Mettre à jour le token de réinitialisation du mot de passe d'un utilisateur
export async function updateUserResetToken(userId: string, resetToken: string | null, resetTokenExpires?: Date | null ): Promise<boolean> {
  try {
    const query = `
      UPDATE users
      SET password_reset_token = $1, password_reset_token_expires_at = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await executeQuery(query, [resetToken, resetTokenExpires, userId]);
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du token de réinitialisation de mot de passe:", error);
    return false;
  }
}

// Récupérer un utilisateur par son token de réinitialisation de mot de passe
export async function getUserByResetToken(token: string): Promise<(User & { password_reset_token_expires_at: Date | null }) | null> {
  try {
    const query = `
      SELECT id, email, name, role, avatar, onboarding_completed, created_at, updated_at, password_reset_token_expires_at
      FROM users
      WHERE password_reset_token = $1
    `;
    const users = await executeQuery<(User & { password_reset_token_expires_at: Date | null })[]>(query, [token]);

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    // Check for token expiry
    if (user.password_reset_token_expires_at && new Date() > new Date(user.password_reset_token_expires_at)) {
      // Optionally, clear the expired token here
      // await updateUserResetToken(user.id, null, null);
      return null; // Token expired
    }

    return user;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur par token de réinitialisation:", error);
    return null;
  }
}

// Mettre à jour le mot de passe d'un utilisateur et effacer le token de réinitialisation
export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<boolean> {
  try {
    const query = `
      UPDATE users
      SET password_hash = $1,
          password_reset_token = NULL,
          password_reset_token_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await executeQuery(query, [newPasswordHash, userId]);
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mot de passe:", error);
    return false;
  }
}
