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
    // Une seule instruction PostgreSQL garantit qu'aucun onboarding partiel
    // n'est enregistré si l'une des sections échoue.
    await executeQuery(
      `
        WITH profile_upsert AS (
          INSERT INTO user_profiles (id, user_id, status, age, orientation, gender, birthday)
          SELECT $1, u.id, $3,
                 EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.date_of_birth))::INTEGER,
                 $4, $5, u.date_of_birth
          FROM users u
          WHERE u.id = $2 AND u.adult_verified_at IS NOT NULL
          ON CONFLICT (user_id) DO UPDATE
          SET status = EXCLUDED.status, age = EXCLUDED.age,
              orientation = EXCLUDED.orientation, gender = EXCLUDED.gender,
              birthday = EXCLUDED.birthday, updated_at = CURRENT_TIMESTAMP
          RETURNING user_id
        ), preference_upsert AS (
          INSERT INTO user_preferences (
            id, user_id, interested_in_restaurant, interested_in_events,
            interested_in_dating, prefer_curtain_open, interested_in_lolib, suggestions
          )
          VALUES ($6, $2, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (user_id) DO UPDATE
          SET interested_in_restaurant = EXCLUDED.interested_in_restaurant,
              interested_in_events = EXCLUDED.interested_in_events,
              interested_in_dating = EXCLUDED.interested_in_dating,
              prefer_curtain_open = EXCLUDED.prefer_curtain_open,
              interested_in_lolib = EXCLUDED.interested_in_lolib,
              suggestions = EXCLUDED.suggestions,
              updated_at = CURRENT_TIMESTAMP
          RETURNING user_id
        ), meeting_upsert AS (
          INSERT INTO user_meeting_types (
            id, user_id, friendly, romantic, playful, open_curtains,
            libertine, open_to_other_couples, specific_preferences
          )
          VALUES ($13, $2, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (user_id) DO UPDATE
          SET friendly = EXCLUDED.friendly, romantic = EXCLUDED.romantic,
              playful = EXCLUDED.playful, open_curtains = EXCLUDED.open_curtains,
              libertine = EXCLUDED.libertine,
              open_to_other_couples = EXCLUDED.open_to_other_couples,
              specific_preferences = EXCLUDED.specific_preferences,
              updated_at = CURRENT_TIMESTAMP
          RETURNING user_id
        ), options_upsert AS (
          INSERT INTO user_additional_options (
            id, user_id, join_exclusive_events, premium_access
          )
          VALUES ($21, $2, $22, $23)
          ON CONFLICT (user_id) DO UPDATE
          SET join_exclusive_events = EXCLUDED.join_exclusive_events,
              premium_access = EXCLUDED.premium_access,
              updated_at = CURRENT_TIMESTAMP
          RETURNING user_id
        )
        UPDATE users
        SET onboarding_completed = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND adult_verified_at IS NOT NULL
      `,
      [
        uuidv4(), userId, data.status, data.orientation, data.gender,
        uuidv4(), data.interestedInRestaurant, data.interestedInEvents,
        data.interestedInDating, data.preferCurtainOpen, data.interestedInLolib,
        data.suggestions || '',
        uuidv4(), data.meetingTypes.friendly, data.meetingTypes.romantic,
        data.meetingTypes.playful, data.meetingTypes.openCurtains,
        data.meetingTypes.libertine, data.openToOtherCouples,
        data.specificPreferences || '',
        uuidv4(), data.joinExclusiveEvents, data.premiumAccess
      ]
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
