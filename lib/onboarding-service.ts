import { executeQuery } from "./db"
import { v4 as uuidv4 } from "uuid"
import type { OnboardingData } from "@/components/onboarding-form"

// Sauvegarder les données d'onboarding
export async function saveOnboardingData(userId: string, data: OnboardingData): Promise<boolean> {
  // Vérifier que l'userId est un UUID valide
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
  if (!isValidUUID) {
    throw new Error("L'identifiant utilisateur n'est pas un UUID valide.")
  }
  try {
    // 1. Mettre à jour le profil utilisateur
    await executeQuery(
      `
      INSERT INTO user_profiles (id, user_id, status, age, orientation, gender, birthday)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE
      SET status = $3, age = $4, orientation = $5, gender = $6, birthday = $7, updated_at = CURRENT_TIMESTAMP
    `,
      [uuidv4(), userId, data.status, data.age, data.orientation, data.gender, data.birthday ? data.birthday : null], // Ensure birthday is null if empty
    )

    // 2. Mettre à jour les préférences utilisateur
    await executeQuery(
      `
      INSERT INTO user_preferences (
        id, user_id, interested_in_restaurant, interested_in_events,
        interested_in_dating, prefer_curtain_open, interested_in_lolib, suggestions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE
      SET interested_in_restaurant = $3, interested_in_events = $4,
          interested_in_dating = $5, prefer_curtain_open = $6,
          interested_in_lolib = $7, suggestions = $8,
          updated_at = CURRENT_TIMESTAMP
    `,
      [
        uuidv4(),
        userId,
        data.interestedInRestaurant,
        data.interestedInEvents,
        data.interestedInDating,
        data.preferCurtainOpen,
        data.interestedInLolib,
        data.suggestions || "",
      ],
    )

    // 3. Mettre à jour les types de rencontres
    await executeQuery(
      `
      INSERT INTO user_meeting_types (
        id, user_id, friendly, romantic, playful, open_curtains,
        libertine, open_to_other_couples, specific_preferences
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE
      SET friendly = $3, romantic = $4, playful = $5, open_curtains = $6,
          libertine = $7, open_to_other_couples = $8, specific_preferences = $9,
          updated_at = CURRENT_TIMESTAMP
    `,
      [
        uuidv4(),
        userId,
        data.meetingTypes.friendly,
        data.meetingTypes.romantic,
        data.meetingTypes.playful,
        data.meetingTypes.openCurtains,
        data.meetingTypes.libertine,
        data.openToOtherCouples,
        data.specificPreferences || "",
      ],
    )

    // 4. Mettre à jour les options supplémentaires
    await executeQuery(
      `
      INSERT INTO user_additional_options (
        id, user_id, join_exclusive_events, premium_access
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE
      SET join_exclusive_events = $3, premium_access = $4,
          updated_at = CURRENT_TIMESTAMP
    `,
      [uuidv4(), userId, data.joinExclusiveEvents, data.premiumAccess],
    )

    // 5. Mettre à jour le statut d'onboarding de l'utilisateur
    await executeQuery(
      `
      UPDATE users
      SET onboarding_completed = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [userId],
    )

    return true
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des données d'onboarding:", error)
    return false
  }
}

// Récupérer les données d'onboarding d'un utilisateur
export async function getOnboardingData(userId: string): Promise<OnboardingData | null> {
  try {
    // Récupérer toutes les données d'onboarding en une seule requête avec des jointures
    const query = `
      SELECT
        p.status, p.age, p.orientation, p.gender, p.birthday,
        pref.interested_in_restaurant, pref.interested_in_events,
        pref.interested_in_dating, pref.prefer_curtain_open,
        pref.interested_in_lolib, pref.suggestions,
        mt.friendly, mt.romantic, mt.playful, mt.open_curtains,
        mt.libertine, mt.open_to_other_couples, mt.specific_preferences,
        ao.join_exclusive_events, ao.premium_access
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN user_preferences pref ON u.id = pref.user_id
      LEFT JOIN user_meeting_types mt ON u.id = mt.user_id
      LEFT JOIN user_additional_options ao ON u.id = ao.user_id
      WHERE u.id = $1
    `

    const results = await executeQuery(query, [userId])

    if (results.length === 0 || !results[0].status) {
      return null
    }

    const data = results[0]

    return {
      status: data.status,
      age: data.age,
      orientation: data.orientation,
      gender: data.gender, // Added gender
      birthday: data.birthday ? new Date(data.birthday).toISOString().split('T')[0] : "", // Added birthday, formatted for input

      interestedInRestaurant: data.interested_in_restaurant || false,
      interestedInEvents: data.interested_in_events || false,
      interestedInDating: data.interested_in_dating || false,
      preferCurtainOpen: data.prefer_curtain_open || false,
      interestedInLolib: data.interested_in_lolib || false,
      suggestions: data.suggestions || "",

      meetingTypes: {
        friendly: data.friendly || false,
        romantic: data.romantic || false,
        playful: data.playful || false,
        openCurtains: data.open_curtains || false,
        libertine: data.libertine || false,
      },
      openToOtherCouples: data.open_to_other_couples || false,
      specificPreferences: data.specific_preferences || "",

      joinExclusiveEvents: data.join_exclusive_events || false,
      premiumAccess: data.premium_access || false,
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des données d'onboarding:", error)
    return null
  }
}
