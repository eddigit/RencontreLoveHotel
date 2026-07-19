"use server"

import type { Notification } from "@/components/notifications-dropdown"
import type { OnboardingData } from "@/components/onboarding-form"
import { acceptMatchRequest } from "@/actions/user-actions"
import { saveOnboardingData } from "@/lib/onboarding-service"
import { createUser, verifyUserCredentials } from "@/lib/user-service"
import { executeQuery, sql } from "@/lib/db"
import { requireCurrentUser, requireSameUserOrAdmin } from "@/lib/server-auth"
import {
  isCurrentRegistrationConsent,
  type RegistrationConsent
} from '@/lib/legal-policy'
import { userRegistrationSchema } from '@/lib/validation'

export async function getNotifications(userId: string) {
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
  if (!isValidUUID) {
    return { notifications: [] }
  }

  try {
    await requireSameUserOrAdmin(userId)
  } catch {
    return { notifications: [] }
  }

  try {
    // Fetch notifications for the user from the database
    const rows = await sql`
      SELECT id, user_id, type, title, description, image, link, read,
             priority, category, audience, metadata, read_at, created_at
      FROM notifications
      WHERE user_id = ${userId}
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 50
    `
    // Map DB rows to Notification type expected by the frontend
    const notifications = rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      image: row.image,
      link: row.link,
      read: row.read,
      priority: row.priority || 'normal',
      category: row.category,
      audience: row.audience || 'user',
      metadata: row.metadata || {},
      readAt: row.read_at,
      time: new Date(row.created_at).toLocaleString(),
    }))
    return { notifications }
  } catch (error) {
    console.error('Erreur dans getNotifications:', error)
    return { notifications: [] }
  }
}

export async function markNotificationAsRead(id: string) {
  const currentUser = await requireCurrentUser()
  // Check if the ID is a valid UUID (matches UUID format)
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isValidUUID) {
    if (currentUser.role === 'admin') {
      await sql`
        UPDATE notifications
        SET read = true,
            read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE notifications
        SET read = true,
            read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
        WHERE id = ${id}
          AND user_id = ${currentUser.id}
      `;
    }
  }
  return { success: true };
}

export async function markAllNotificationsAsRead(userId: string) {
  await requireSameUserOrAdmin(userId)

  await sql`
    UPDATE notifications
    SET read = true,
        read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    WHERE user_id = ${userId}
  `
  return { success: true }
}

// Fonction pour sauvegarder les préférences utilisateur (utilise maintenant la base de données)
export async function saveUserPreferences(userId: string, data: OnboardingData) {
  await requireSameUserOrAdmin(userId)

  try {
    const success = await saveOnboardingData(userId, data)
    return { success }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des préférences:", error)
    return { success: false, error: "Erreur lors de la sauvegarde des préférences" }
  }
}

// Fonction pour s'inscrire
export async function registerUser(
  email: string,
  password: string,
  name: string,
  consent: RegistrationConsent
) {
  if (!isCurrentRegistrationConsent(consent)) {
    return {
      success: false,
      error: 'Vous devez confirmer votre majorité et accepter les règles obligatoires.'
    }
  }

  const registration = userRegistrationSchema.safeParse({
    email,
    password,
    name,
    agreeTerms: true
  })
  if (!registration.success) {
    return {
      success: false,
      error: registration.error.errors[0]?.message || "Données d'inscription invalides"
    }
  }

  try {
    const user = await createUser(
      registration.data.email,
      registration.data.password,
      registration.data.name,
      'user',
      consent
    )
    return { success: !!user, user }
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505' &&
      'constraint' in error &&
      error.constraint === 'users_email_key'
    ) {
      return {
        success: false,
        error: 'Un compte existe déjà avec cette adresse email. Connectez-vous ou réinitialisez votre mot de passe.'
      }
    }
    return { success: false, error: "Erreur lors de l'inscription" }
  }
}

// Fonction pour se connecter
export async function loginUser(email: string, password: string) {
  try {
    const user = await verifyUserCredentials(email, password)
    return { success: !!user, user }
  } catch (error) {
    console.error("Erreur lors de la connexion:", error)
    return { success: false, error: "Erreur lors de la connexion" }
  }
}

// Compatibilité avec l'ancienne action : seul le destinataire peut accepter.
// Le cycle sécurisé vérifie aussi le statut, l'expiration et les blocages.
export async function acceptMatch(requesterId: string, receiverId: string) {
  await requireSameUserOrAdmin(receiverId)
  return acceptMatchRequest(requesterId, receiverId)
}

// Fonction pour refuser un match
export async function rejectMatch(userId: string, matchId: string) {
  await requireSameUserOrAdmin(userId)

  try {
    await executeQuery(
      `
      UPDATE user_matches
      SET status = 'rejected', accepted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)
    `,
      [userId, matchId],
    )

    return { success: true }
  } catch (error) {
    console.error(`Erreur lors du refus du match:`, error)
    return { success: false }
  }
}

// Fonction pour supprimer un match
export async function removeMatch(userId: string, matchId: string) {
  await requireSameUserOrAdmin(userId)

  try {
    await executeQuery(
      `
      DELETE FROM user_matches
      WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)
    `,
      [userId, matchId],
    )

    return { success: true }
  } catch (error) {
    console.error(`Erreur lors de la suppression du match:`, error)
    return { success: false }
  }
}
