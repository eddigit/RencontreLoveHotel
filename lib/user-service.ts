import { executeQuery } from "./db"
import { hash, compare } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import {
  isCurrentRegistrationConsent,
  type RegistrationConsent
} from '@/lib/legal-policy'
import {
  digestEmailVerificationToken,
  verifyEmailVerificationToken
} from '@/lib/email-verification-token'

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

export function isUserAllowedToAuthenticate(
  user: Pick<User, 'status' | 'is_banned'> | null | undefined
): boolean {
  return Boolean(user) &&
    user?.is_banned !== true &&
    (!user?.status || user.status === 'active')
}

// Créer un nouvel utilisateur
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: "user" | "admin" = "user",
  consent?: RegistrationConsent,
  verificationToken?: string
): Promise<User | null> {
  try {
    if (consent && !verificationToken) {
      throw new Error('Jeton de vérification requis pour une inscription membre.')
    }
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
      consent ? false : true,
      verificationToken ? digestEmailVerificationToken(verificationToken) : null,
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
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ''
    const payload = verifyEmailVerificationToken(token, secret)
    if (!payload) {
      return { success: false, error: "Token invalide ou déjà utilisé." }
    }
    const users = await executeQuery<User[]>(
      `UPDATE users
       SET email_verified = true, email_verification_token = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE email_verification_token = $1
         AND email_verified = false
         AND lower(email) = $2
       RETURNING id`,
      [digestEmailVerificationToken(token), payload.email]
    )
    if (!users.length) {
      return { success: false, error: "Token invalide ou déjà utilisé." }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: "Erreur serveur." }
  }
}

export async function updateUserVerificationToken(
  userId: string,
  token: string
): Promise<boolean> {
  const result = await executeQuery<Array<{ id: string }>>(
    `UPDATE users
     SET email_verification_token = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND email_verified = false
     RETURNING id`,
    [digestEmailVerificationToken(token), userId]
  )
  return result.length === 1
}

export async function reserveVerificationEmailSend(
  userId: string,
  email: string
): Promise<string | null> {
  const rows = await executeQuery<Array<{ id: string }>>(
    `WITH locked AS MATERIALIZED (
       SELECT pg_advisory_xact_lock(hashtext($1))
     ), recent AS (
       SELECT COUNT(*)::int AS count
       FROM email_send_logs, locked
       WHERE user_id = $2
         AND purpose = 'verification'
         AND created_at >= NOW() - INTERVAL '1 hour'
     ), inserted AS (
       INSERT INTO email_send_logs (
         user_id, email, purpose, status, metadata
       )
       SELECT $2, $3, 'verification', 'sent', '{"phase":"reserved"}'::jsonb
       FROM recent
       WHERE recent.count < 3
       RETURNING id
     )
     SELECT id FROM inserted`,
    [`verification:${email.trim().toLowerCase()}`, userId, email.trim().toLowerCase()]
  )
  return rows[0]?.id || null
}

export async function finalizeVerificationEmailSend(
  logId: string,
  status: 'sent' | 'error'
): Promise<void> {
  await executeQuery(
    `UPDATE email_send_logs
     SET status = $1,
         error_message = CASE WHEN $1 = 'error' THEN 'smtp_delivery_failed' ELSE NULL END,
         metadata = jsonb_build_object('phase', $1)
     WHERE id = $2`,
    [status, logId]
  )
}

// Vérifier les identifiants de l'utilisateur
export async function verifyUserCredentials(email: string, password: string): Promise<User | null> {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    const query = `
      SELECT id, email, password_hash, name, role, avatar, onboarding_completed,
             email_verified, status, is_banned, created_at, updated_at
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

    if (!isUserAllowedToAuthenticate(user)) {
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
export async function getOrCreateOAuthUser({
  email,
  name,
  avatar,
  consent,
  emailVerifiedByProvider = false
}: {
  email: string
  name?: string
  avatar?: string
  consent?: RegistrationConsent | null
  emailVerifiedByProvider?: boolean
}) {
  const normalizedEmail = email.trim().toLowerCase()
  // Vérifier si l'utilisateur existe déjà
  const existing = await executeQuery<User[]>(
    `SELECT id, email, name, role, avatar, onboarding_completed, email_verified,
            status, is_banned, created_at, updated_at
     FROM users
     WHERE lower(email) = $1`,
    [normalizedEmail]
  )
  if (existing.length > 0) {
    if (!emailVerifiedByProvider) {
      return null
    }
    if (emailVerifiedByProvider && existing[0].email_verified !== true) {
      const verified = await executeQuery<User[]>(
        `UPDATE users
         SET email_verified = true, email_verification_token = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, email, name, role, avatar, onboarding_completed, email_verified,
                   status, is_banned, created_at, updated_at`,
        [existing[0].id]
      )
      return verified[0] || existing[0]
    }
    return existing[0]
  }

  if (!emailVerifiedByProvider || !isCurrentRegistrationConsent(consent)) {
    return null
  }

  const userId = uuidv4()
  const displayName = name?.trim() || normalizedEmail.split('@')[0]
  const created = await executeQuery<User[]>(
    `WITH inserted_user AS (
       INSERT INTO users (
         id, email, password_hash, name, role, avatar,
         email_verified, email_verification_token
       )
       VALUES ($1, $2, NULL, $3, 'user', $4, true, NULL)
       ON CONFLICT (email) DO UPDATE
       SET email_verified = true,
           email_verification_token = NULL,
           updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, name, role, avatar, onboarding_completed,
                 email_verified, status, is_banned, created_at, updated_at
     ), recorded_acceptances AS (
       INSERT INTO legal_acceptances (
         user_id, document_type, document_version, adult_confirmed, metadata
       )
       SELECT inserted_user.id, acceptance.document_type,
              acceptance.document_version, true,
              jsonb_build_object('source', 'oauth_registration', 'provider', 'google')
       FROM inserted_user
       CROSS JOIN (VALUES
         ('terms', $5::text),
         ('privacy', $6::text),
         ('anti_solicitation', $7::text)
       ) AS acceptance(document_type, document_version)
       ON CONFLICT ON CONSTRAINT legal_acceptances_unique_version DO NOTHING
     )
     SELECT * FROM inserted_user`,
    [
      userId,
      normalizedEmail,
      displayName,
      avatar || null,
      consent.versions.terms,
      consent.versions.privacy,
      consent.versions.antiSolicitation
    ]
  )
  return created[0] || null
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
