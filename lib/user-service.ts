import { executeQuery } from "./db"
import { hash, compare } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import nodemailer from "nodemailer"
import { getOption } from "@/actions/user-actions"

// Types
export interface User {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  avatar?: string
  onboarding_completed: boolean
  email_verified?: boolean // Add this line
  created_at: Date
  updated_at: Date
}

// Helper to send verification email
async function sendVerificationEmail(email: string, token: string, name?: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false }
  })
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/verify-email?token=${token}`
  // Fetch email template
  const subjectTemplate = (await getOption("verification_email_subject")) || "Vérifiez votre adresse email sur Love Hotel";
  const bodyTemplate = (await getOption("verification_email_body")) ||
    `Bonjour [name],\n\nMerci de vous être inscrit sur Love Hotel !\n\nVeuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :\n\n[verification-link]\n\nSi vous n'avez pas créé de compte, ignorez cet email.\n\nL'équipe Love Hotel`;
  // Replace placeholders
  const subject = subjectTemplate.replace(/\[name\]/g, name || "").replace(/\[verification-link\]/g, verifyUrl);
  const body = bodyTemplate.replace(/\[name\]/g, name || "").replace(/\[verification-link\]/g, verifyUrl).replace(/\n/g, "<br>");
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@lovehotel.app',
    to: email,
    subject,
    html: body
  })
}

// Créer un nouvel utilisateur
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: "user" | "admin" = "user",
): Promise<User | null> {
  try {
    const hashedPassword = await hash(password, 10)
    const userId = uuidv4()
    const verificationToken = uuidv4()
    const query = `
      INSERT INTO users (id, email, password_hash, name, role, email_verified, email_verification_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, name, role, avatar, onboarding_completed, created_at, updated_at
    `
    const params = [userId, email, hashedPassword, name, role, false, verificationToken]
    const result = (await executeQuery<User[]>(query, params)) ?? []
    if (result.length) {
      await sendVerificationEmail(email, verificationToken, name)
    }
    return result.length ? result[0] : null
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error)
    return null
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
    const query = `
      SELECT id, email, password_hash, name, role, avatar, onboarding_completed, email_verified, created_at, updated_at
      FROM users
      WHERE email = $1
    `

    const users = await executeQuery<Array<User & { password_hash: string }>>(query, [email])

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
      SELECT id, email, name, role, avatar, onboarding_completed, created_at, updated_at
      FROM users
      WHERE id = $1
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
    const query = `
      SELECT id, email, name, role, avatar, onboarding_completed, email_verified, created_at, updated_at
      FROM users
      WHERE email = $1
    `
    const users = await executeQuery<User[]>(query, [email])
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

// Créer un utilisateur (ou le récupérer) à partir d'un email (pour OAuth)
export async function getOrCreateOAuthUser({ email, name, avatar }: { email: string, name?: string, avatar?: string }) {
  // Vérifier si l'utilisateur existe déjà
  const existing = await executeQuery<User[]>(
    `SELECT id, email, name, role, avatar, onboarding_completed, created_at, updated_at FROM users WHERE email = $1`,
    [email]
  )
  if (existing.length > 0) {
    return existing[0]
  }
  // Créer un nouvel utilisateur avec un UUID, sans mot de passe
  const userId = uuidv4()
  const query = `
    INSERT INTO users (id, email, name, role, avatar, onboarding_completed)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, name, role, avatar, onboarding_completed, created_at, updated_at
  `
  const params = [userId, email, name || "", "user", avatar || null, false]
  const result = (await executeQuery<User[]>(query, params)) ?? []
  // Créer un profil vide associé
  await executeQuery(
    `INSERT INTO user_profiles (id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [uuidv4(), userId]
  )
  return result.length ? result[0] : null
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
