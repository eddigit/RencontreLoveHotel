"use server"

import { sql } from "@/lib/db"
import { calculateMatchScore } from "@/utils/matching-algorithm"
import { createNotification } from "@/actions/notification-actions"
import { FilterOptions } from "@/components/advanced-filters";
import type { UserProfile } from "@/utils/matching-algorithm"
import {
  ensurePresenceSchema,
  isUserRecentlySeen,
  markUserSeen,
  onlinePresenceCondition
} from "@/lib/presence"
import { requireAdmin, requireCurrentUser, requireSameUserOrAdmin } from "@/lib/server-auth"
import { log } from "@/utils/logger"
import { getMemberRelationshipOverview } from '@/lib/member-relationship-service'
import { rankDiscoveryCandidates } from '@/lib/discovery-ranking'
import { trackProductEvents } from '@/lib/product-events'

type CommunityMemberStats = {
  totalMembers: number
  newMembersLast24h: number
}

export async function getUserProfile(userId: string) {
  const user = await sql`
    SELECT u.id as user_id, u.*, up.id as profile_id, up.*
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = ${userId}
  `

  const photos = await sql`
    SELECT * FROM photos
    WHERE user_id = ${userId}
    ORDER BY is_primary DESC
  `

  const preferences = await sql`
    SELECT * FROM user_preferences
    WHERE user_id = ${userId}
  `

  const meetingTypes = await sql`
    SELECT * FROM user_meeting_types
    WHERE user_id = ${userId}
  `

  const additionalOptions = await sql`
    SELECT * FROM user_additional_options
    WHERE user_id = ${userId}
  `

  return {
    user: user[0] || null,
    photos: photos || [],
    preferences: preferences[0] || null,
    meetingTypes: meetingTypes[0] || null,
    additionalOptions: additionalOptions[0] || null,
  }
}

function buildMatchingProfile(profile: any): UserProfile | null {
  if (!profile?.user) return null

  return {
    id: profile.user.user_id || profile.user.id,
    name: profile.user.name || '',
    age: Number(profile.user.age || 0),
    location: profile.user.location || '',
    image: profile.user.avatar || '',
    online: isUserRecentlySeen(profile.user.last_seen_at),
    featured: Boolean(profile.user.featured),
    preferences: {
      status: profile.user.status,
      orientation: profile.user.orientation,
      gender: profile.user.gender,
      age: profile.user.age,
      interested_in_restaurant: profile.preferences?.interested_in_restaurant,
      interested_in_events: profile.preferences?.interested_in_events,
      interested_in_dating: profile.preferences?.interested_in_dating,
      prefer_curtain_open: profile.preferences?.prefer_curtain_open,
      interested_in_lolib: profile.preferences?.interested_in_lolib,
      suggestions: profile.preferences?.suggestions,
      meetingTypes: profile.meetingTypes || {},
      open_to_other_couples: profile.meetingTypes?.open_to_other_couples,
      join_exclusive_events: profile.additionalOptions?.join_exclusive_events,
      premium_access: profile.additionalOptions?.premium_access,
      specific_preferences: profile.meetingTypes?.specific_preferences
    }
  }
}

export async function getUserMatches(userId: string) {
  try {
    await requireSameUserOrAdmin(userId)
  } catch {
    return []
  }

  const matches = await sql`
    SELECT
      um.*,
      u1.name as user1_name,
      u1.avatar as user1_avatar,
      u2.name as user2_name,
      u2.avatar as user2_avatar
    FROM user_matches um
    JOIN users u1 ON um.user_id_1 = u1.id
    JOIN users u2 ON um.user_id_2 = u2.id
    WHERE (um.user_id_1 = ${userId} OR um.user_id_2 = ${userId}) AND um.status = 'accepted'
    ORDER BY um.match_score DESC
  `

  return matches || []
}

export async function getCommunityMemberStats(): Promise<CommunityMemberStats> {
  await requireCurrentUser()

  const [stats] = await sql.query<Array<{
    total_members: string | number
    new_members_last_24h: string | number
  }>>(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE COALESCE(u.is_banned, false) = false
            AND COALESCE(u.status, 'active') <> 'banned'
            AND u.onboarding_completed = TRUE
            AND up.display_profile = TRUE
        ) AS total_members,
        COUNT(*) FILTER (
          WHERE COALESCE(u.is_banned, false) = false
            AND COALESCE(u.status, 'active') <> 'banned'
            AND u.onboarding_completed = TRUE
            AND up.display_profile = TRUE
            AND u.created_at >= NOW() - INTERVAL '24 hours'
        ) AS new_members_last_24h
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
    `,
    []
  )

  return {
    totalMembers: Number(stats?.total_members || 0),
    newMembersLast24h: Number(stats?.new_members_last_24h || 0)
  }
}

export async function getOnlineCommunityMembers(limit = 12) {
  const currentUser = await requireCurrentUser()
  await markUserSeen(currentUser.id)

  const safeLimit = Math.min(24, Math.max(1, Math.floor(Number(limit) || 12)))
  const hasPresenceColumn = await ensurePresenceSchema()
  const presenceColumn = hasPresenceColumn ? 'u.last_seen_at' : 'u.updated_at'
  const onlineCondition = onlinePresenceCondition(presenceColumn)

  return await sql.query<any[]>(
    `
      SELECT
        u.id,
        u.name,
        u.avatar AS image,
        up.age,
        up.location,
        TRUE AS online,
        u.id = $1 AS is_current_user
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      WHERE up.display_profile = TRUE
        AND u.onboarding_completed = TRUE
        AND COALESCE(u.is_banned, false) = false
        AND COALESCE(u.status, 'active') <> 'banned'
        AND ${onlineCondition}
      ORDER BY (u.id = $1) DESC, ${presenceColumn} DESC
      LIMIT $2
    `,
    [currentUser.id, safeLimit]
  )
}

export async function getMemberRelationships(userId: string) {
  await requireSameUserOrAdmin(userId)
  return getMemberRelationshipOverview(userId)
}

export async function getDiscoverProfiles(currentUserId: string, page: number = 1, pageSize: number = 50, filters?: FilterOptions, batch = 0) {
  log('info', 'Discover profiles requested', { operation: 'getDiscoverProfiles', page, pageSize });

  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserId);
  if (!isValidUUID) {
    log('warn', 'Discover profiles rejected: invalid identifier', { operation: 'getDiscoverProfiles' });
    return {
      profiles: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
      hasMore: false
    };
  }

  let currentUserProfileGender: string | undefined;
  let currentUserProfileOrientation: string | undefined;
  const hasPresenceColumn = await ensurePresenceSchema();
  const presenceColumn = hasPresenceColumn ? 'u.last_seen_at' : 'u.updated_at';
  const onlineCondition = onlinePresenceCondition(presenceColumn);
  try {
    const currentUserProfileResult = await sql`
      SELECT gender, orientation
      FROM user_profiles
      WHERE user_id = ${currentUserId}
      LIMIT 1;
    `;
    if (currentUserProfileResult && currentUserProfileResult.length > 0) {
      currentUserProfileGender = currentUserProfileResult[0].gender?.toLowerCase(); // Ensure lowercase
      currentUserProfileOrientation = currentUserProfileResult[0].orientation?.toLowerCase(); // Ensure lowercase
    } else {
      log('info', 'Discover profile preferences are incomplete', { operation: 'getDiscoverProfiles' });
    }
  } catch (error) {
    log('error', 'Unable to load discovery preferences', { operation: 'getDiscoverProfiles', errorName: error instanceof Error ? error.name : 'UnknownError' });
  }

  const offset = (page - 1) * pageSize;
  let baseParams: any[] = [currentUserId];
  let whereClauses = [`u.id != $1`];


  // Only show profiles with display_profile = TRUE
  whereClauses.push("up.display_profile = TRUE");
  whereClauses.push(`NOT EXISTS (SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_id = $1 AND ub.blocked_id = u.id)
       OR (ub.blocker_id = u.id AND ub.blocked_id = $1))`)
  whereClauses.push(`NOT EXISTS (
    SELECT 1 FROM user_matches um_existing
    WHERE ((um_existing.user_id_1 = $1 AND um_existing.user_id_2 = u.id)
        OR (um_existing.user_id_1 = u.id AND um_existing.user_id_2 = $1))
      AND (
        um_existing.status IN ('accepted', 'pending')
        OR (um_existing.status = 'rejected' AND um_existing.updated_at >= NOW() - INTERVAL '30 days')
      )
      AND (um_existing.status <> 'pending' OR um_existing.expires_at IS NULL OR um_existing.expires_at > NOW())
  )`)

  if (currentUserProfileGender && currentUserProfileOrientation) {
    const genderOrientationMatchingClauses: string[] = [];

    const cUserPGender = currentUserProfileGender; // Already lowercased
    const cUserOrientation = currentUserProfileOrientation; // Already lowercased

    // Define SQL conditions for target profile genders based on user clarification
    const targetMaleEntitiesSQL = `(LOWER(up.gender) IN ('male', 'single_male', 'married_male', 'couple_mm', 'couple_mf'))`;
    const targetFemaleEntitiesSQL = `(LOWER(up.gender) IN ('female', 'single_female', 'married_female', 'couple_ff', 'couple_mf'))`;

    // Define SQL conditions for target profile orientations (reusable parts)
    const targetOrientationHeteroBiCompatibleSQL = `(LOWER(up.orientation) = 'hetero' OR LOWER(up.orientation) = 'straight' OR LOWER(up.orientation) = 'bisexual' OR up.orientation IS NULL OR up.orientation = '')`;
    const targetOrientationGayBiCompatibleSQL = `(LOWER(up.orientation) = 'gay' OR LOWER(up.orientation) = 'homo' OR LOWER(up.orientation) = 'bisexual' OR up.orientation IS NULL OR up.orientation = '')`;

    // Determine current user's effective searching role (male/female)
    const isCurrentUserEffectivelyMale = (cUserPGender === 'male' || cUserPGender === 'single_male' || cUserPGender === 'married_male' || cUserPGender === 'couple_mm');
    const isCurrentUserEffectivelyFemale = (cUserPGender === 'female' || cUserPGender === 'single_female' || cUserPGender === 'married_female' || cUserPGender === 'couple_ff');

    if (cUserOrientation === 'hetero' || cUserOrientation === 'straight') {
      if (isCurrentUserEffectivelyMale) {
        genderOrientationMatchingClauses.push(targetFemaleEntitiesSQL); // Male hetero seeks Female entities
        genderOrientationMatchingClauses.push(targetOrientationHeteroBiCompatibleSQL);
      } else if (isCurrentUserEffectivelyFemale) {
        genderOrientationMatchingClauses.push(targetMaleEntitiesSQL); // Female hetero seeks Male entities
        genderOrientationMatchingClauses.push(targetOrientationHeteroBiCompatibleSQL);
      } else if (cUserPGender === 'couple_mf') {
        // Hetero couple_mf: This logic is complex.
        // Placeholder: assume they are open to male or female entities who are hetero/bi.
        genderOrientationMatchingClauses.push(`(${targetMaleEntitiesSQL} OR ${targetFemaleEntitiesSQL})`);
        genderOrientationMatchingClauses.push(targetOrientationHeteroBiCompatibleSQL);
      }
    } else if (cUserOrientation === 'gay' || cUserOrientation === 'homo') {
      if (isCurrentUserEffectivelyMale) {
        genderOrientationMatchingClauses.push(targetMaleEntitiesSQL); // Male gay seeks Male entities
        genderOrientationMatchingClauses.push(targetOrientationGayBiCompatibleSQL);
      } else if (isCurrentUserEffectivelyFemale) {
        genderOrientationMatchingClauses.push(targetFemaleEntitiesSQL); // Female gay seeks Female entities
        genderOrientationMatchingClauses.push(targetOrientationGayBiCompatibleSQL);
      } else if (cUserPGender === 'couple_mf') {
        // Gay/Homo couple_mf: Contradictory for the unit's orientation.
      }
    } else if (cUserOrientation === 'bisexual' || cUserOrientation === 'bi') {
      if (isCurrentUserEffectivelyMale) { // Bi Male
        // Seeks (Male Gay/Bi) OR (Female Hetero/Bi)
        genderOrientationMatchingClauses.push(`((${targetMaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}) OR (${targetFemaleEntitiesSQL} AND ${targetOrientationHeteroBiCompatibleSQL}))`);
      } else if (isCurrentUserEffectivelyFemale) { // Bi Female
        // Seeks (Female Gay/Bi) OR (Male Hetero/Bi)
        genderOrientationMatchingClauses.push(`((${targetFemaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}) OR (${targetMaleEntitiesSQL} AND ${targetOrientationHeteroBiCompatibleSQL}))`);
      } else if (cUserPGender === 'couple_mf') { // Bi couple_mf
        // Placeholder: Open to (Male Gay/Bi) OR (Female Hetero/Bi) OR (Female Gay/Bi)
        // This covers seeking males for the male part, females for the male part, females for the female part, males for the female part, with compatible orientations.
        genderOrientationMatchingClauses.push(`((${targetMaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}) OR (${targetFemaleEntitiesSQL} AND ${targetOrientationHeteroBiCompatibleSQL}) OR (${targetFemaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}))`);
      }
    }
    if (genderOrientationMatchingClauses.length > 0) {
      whereClauses.push(`(${genderOrientationMatchingClauses.join(' AND ')})`);
    }
  } else {
    log('info', 'Discovery compatibility filter skipped', { operation: 'getDiscoverProfiles' });
  }

  if (filters) {
    // Age Range Filter
    if (filters.onlineOnly) {
      whereClauses.push(onlineCondition);
    }

    // Age Range Filter
    if (filters.ageRange) {
      baseParams.push(filters.ageRange[0]);
      const ageMinPlaceholder = `$${baseParams.length}`;
      baseParams.push(filters.ageRange[1]);
      const ageMaxPlaceholder = `$${baseParams.length}`;
      // Profiles with NULL age are included if the filter range [minFilterAge, maxFilterAge]
      // (represented by ageMinPlaceholder and ageMaxPlaceholder respectively)
      // overlaps with the default assumed range for NULLs [18, 99].
      // Overlap condition: minFilterAge <= 99 AND maxFilterAge >= 18.
      whereClauses.push(`((up.age >= ${ageMinPlaceholder} AND up.age <= ${ageMaxPlaceholder}) OR (up.age IS NULL AND ${ageMinPlaceholder} <= 99 AND ${ageMaxPlaceholder} >= 18))`);
    }

    // Status Filter
    if (filters.status && filters.status !== "all") {
      const filterStatus = filters.status.toLowerCase(); // Ensure filter value is lowercase
      if (filterStatus === "single") {
        whereClauses.push(`(LOWER(up.status) LIKE 'single_%' OR up.status IS NULL OR up.status = '')`);
      } else if (filterStatus === "couple") {
        baseParams.push('couple'); // Compare with lowercase 'couple'
        const statusPlaceholder = `$${baseParams.length}`;
        whereClauses.push(`(LOWER(up.status) = ${statusPlaceholder} OR up.status IS NULL OR up.status = '')`);
      }
    }

    // Orientation Filter
    if (filters.orientation && filters.orientation !== "all") {
      baseParams.push(filters.orientation.toLowerCase()); // Ensure filter value is lowercase
      const orientationPlaceholder = `$${baseParams.length}`;
      // Compare with lowercase orientation from filter, and allow for NULL target orientation
      whereClauses.push(`(LOWER(up.orientation) = ${orientationPlaceholder} OR up.orientation IS NULL OR up.orientation = '')`);
    }

    // Meeting Types Filter
    if (filters.meetingTypes) {
      const activeMeetingTypes = Object.entries(filters.meetingTypes)
        .filter(([, isActive]) => isActive)
        .map(([type]) => type);
      if (activeMeetingTypes.length > 0) {
        activeMeetingTypes.forEach(type => {
          if (['friendly', 'romantic', 'playful', 'open_curtains', 'libertine'].includes(type)) {
             whereClauses.push(`umt_filter.${type.toLowerCase()} = TRUE`); // Assuming umt_filter columns are lowercase
          }
        });
      }
    }

    // Curtain Preference Filter
    if (filters.curtainPreference && filters.curtainPreference !== "all") {
      const curtainPref = filters.curtainPreference.toLowerCase();
      if (curtainPref === "open") {
        whereClauses.push(`(upref_filter.prefer_curtain_open = TRUE OR upref_filter.prefer_curtain_open IS NULL)`);
      } else if (curtainPref === "closed") {
        whereClauses.push(`upref_filter.prefer_curtain_open = FALSE`);
      }
    }
  }

  const baseFromClause = `
    FROM users u
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_meeting_types umt_filter ON u.id = umt_filter.user_id
    LEFT JOIN user_preferences upref_filter ON u.id = upref_filter.user_id
  `;
  const whereCondition = whereClauses.length > 1 ? `WHERE ${whereClauses.join(" AND ")}` : (whereClauses.length === 1 ? `WHERE ${whereClauses[0]}` : "");

  const totalCountQuery = `SELECT COUNT(DISTINCT u.id) as total ${baseFromClause} ${whereCondition}`;
  const totalCountResult = await sql.query(totalCountQuery, baseParams);
  const totalCount = totalCountResult && totalCountResult.length > 0 ? parseInt(totalCountResult[0].total, 10) : 0;

  let profilesParams = [...baseParams];
  profilesParams.push(pageSize);
  const limitPlaceholder = `$${profilesParams.length}`;
  profilesParams.push(offset);
  const offsetPlaceholder = `$${profilesParams.length}`;

  const profilesQuery = `
    SELECT
      u.id,
      u.name,
      u.avatar as image,
      u.created_at,
      up.age,
      up.location,
      up.orientation,
      up.status,
      up.gender,
      up.birthday,
      up.bio,
      up.interests,
      u.updated_at,
      upref_filter.interested_in_restaurant,
      upref_filter.interested_in_events,
      upref_filter.interested_in_dating,
      upref_filter.prefer_curtain_open,
      upref_filter.interested_in_lolib,
      umt_filter.friendly,
      umt_filter.romantic,
      umt_filter.playful,
      umt_filter.open_curtains,
      umt_filter.libertine,
      umt_filter.open_to_other_couples,
      umt_filter.specific_preferences,
      ${hasPresenceColumn ? 'u.last_seen_at,' : 'NULL as last_seen_at,'}
      ${onlineCondition} as online,
      false as featured,
      (SELECT COUNT(*) FROM product_events pe
        WHERE pe.event_name = 'profile_impression'
          AND pe.subject_id = u.id
          AND pe.created_at >= NOW() - INTERVAL '14 days') AS impressions_14d
    ${baseFromClause}
    ${whereCondition}
    ORDER BY
      impressions_14d ASC,
      (CASE WHEN ${onlineCondition} THEN 1 ELSE 0 END) DESC,
      u.created_at DESC
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}
  `;
  const profilesResult = await sql.query(profilesQuery, profilesParams);
  const profilesData = profilesResult || [];

  const currentMatchingProfile = buildMatchingProfile(await getUserProfile(currentUserId));
  const mappedProfiles = profilesData
    .map((profile: any) => {
      const preferences = {
        status: profile.status,
        age: profile.age,
        orientation: profile.orientation,
        gender: profile.gender,
        interested_in_restaurant: profile.interested_in_restaurant,
        interested_in_events: profile.interested_in_events,
        interested_in_dating: profile.interested_in_dating,
        prefer_curtain_open: profile.prefer_curtain_open,
        interested_in_lolib: profile.interested_in_lolib,
        open_to_other_couples: profile.open_to_other_couples,
        specific_preferences: profile.specific_preferences,
        meetingTypes: {
          friendly: profile.friendly,
          romantic: profile.romantic,
          playful: profile.playful,
          openCurtains: profile.open_curtains,
          open_curtains: profile.open_curtains,
          libertine: profile.libertine,
          open_to_other_couples: profile.open_to_other_couples,
          specific_preferences: profile.specific_preferences
        }
      };
      const matchingProfile: UserProfile = {
        id: profile.id,
        name: profile.name || '',
        age: Number(profile.age || 0),
        location: profile.location || '',
        image: profile.image || '',
        online: Boolean(profile.online),
        featured: Boolean(profile.featured),
        preferences: preferences as UserProfile['preferences']
      };

      return {
        ...profile,
        interests: profile.interests ? JSON.parse(profile.interests) : [],
        preferences,
        matchScore: currentMatchingProfile ? calculateMatchScore(currentMatchingProfile, matchingProfile) : null,
        impressions14d: Number(profile.impressions_14d || 0),
        profileQuality: Math.round((
          (profile.image ? 35 : 0) +
          (profile.bio ? 25 : 0) +
          (profile.age ? 15 : 0) +
          (profile.location ? 15 : 0) +
          (profile.interests ? 10 : 0)
        )),
        lastSeenAt: profile.last_seen_at,
        createdAt: profile.created_at
      };
    })
  const rankedProfiles = rankDiscoveryCandidates<any>(mappedProfiles, {
    viewerId: currentUserId,
    batch: Math.max(0, Math.floor(Number(batch) || 0))
  })

  const result = {
    profiles: rankedProfiles,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
    hasMore: (offset + rankedProfiles.length) < totalCount
  };
  log('info', 'Discover profiles completed', {
    operation: 'getDiscoverProfiles',
    count: rankedProfiles.length,
    totalCount,
    page
  });
  return result;
}

export async function recordProfileImpressions(userId: string, profileIds: string[], batch = 0) {
  await requireSameUserOrAdmin(userId)
  const safeIds = Array.from(new Set(profileIds))
    .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    .slice(0, 12)

  await trackProductEvents(safeIds.map((subjectId, position) => ({
    eventName: 'profile_impression' as const,
    userId,
    subjectId,
    metadata: { surface: 'community', batch, position }
  })))
}

// Send a match request (creates a pending match if not already exists)
export async function sendMatchRequest(requesterId: string, receiverId: string) {
  await requireSameUserOrAdmin(requesterId)

  if (requesterId === receiverId) return { success: false, error: "Vous ne pouvez pas vous matcher vous-même." }
  // Check if receiver exists
  const receiverExists = await sql`SELECT 1 FROM users WHERE id = ${receiverId} LIMIT 1`
  if (receiverExists.length === 0) {
    return { success: false, error: "L'utilisateur cible n'existe pas." }
  }
  try {
    // Check if a match already exists (in either direction)
    const existing = await sql`
      SELECT * FROM user_matches
      WHERE (user_id_1 = ${requesterId} AND user_id_2 = ${receiverId})
         OR (user_id_1 = ${receiverId} AND user_id_2 = ${requesterId})
    `
    if (existing.length > 0) {
      const status = existing[0].status
      if (status === "pending") return { success: false, error: "Demande déjà envoyée." }
      if (status === "accepted") return { success: false, error: "Vous êtes déjà en match." }
      // If previously rejected, allow to send again (optional: you can block this if you want)
    }
    // Fetch both user profiles for score calculation
    const requesterProfile = await getUserProfile(requesterId)
    const receiverProfile = await getUserProfile(receiverId)
    let matchScore = null
    const requester = buildMatchingProfile(requesterProfile);
    const receiver = buildMatchingProfile(receiverProfile);
    if (requester && receiver) {
      matchScore = calculateMatchScore(requester, receiver)
    }
    await sql`
      INSERT INTO user_matches (user_id_1, user_id_2, status, match_score)
      VALUES (${requesterId}, ${receiverId}, 'pending', ${matchScore})
      ON CONFLICT (user_id_1, user_id_2) DO UPDATE SET status = 'pending', accepted_at = NULL, updated_at = CURRENT_TIMESTAMP, match_score = ${matchScore}
    `
    // Send notification to receiver
    await createNotification({
      userId: receiverId,
      type: 'match_request',
      title: 'Nouvelle demande de match',
      description: 'Vous avez reçu une nouvelle demande de match.',
      link: '/matches',
    })
    log('info', 'Match request stored', { operation: 'sendMatchRequest' })
    return { success: true }
  } catch (error) {
    log('error', 'Match request failed', {
      operation: 'sendMatchRequest',
      errorName: error instanceof Error ? error.name : 'UnknownError'
    })
    return { success: false, error: "Erreur lors de l'envoi de la demande." }
  }
}

// Accept a match request (receiver accepts request from requester)
export async function acceptMatchRequest(requesterId: string, receiverId: string) {
  await requireSameUserOrAdmin(receiverId)

  try {
    const result = await sql`
      UPDATE user_matches
      SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id_1 = ${requesterId} AND user_id_2 = ${receiverId} AND status = 'pending'
    `
    if ((result as any).rowCount === 0) {
      return { success: false, error: "Aucune demande à accepter." }
    }
    // Send notification to requester
    await createNotification({
      userId: requesterId,
      type: 'match_accepted',
      title: 'Votre demande de match a été acceptée',
      description: 'Votre demande de match a été acceptée !',
      link: '/matches',
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: "Erreur lors de l'acceptation." }
  }
}

// Decline a match request (receiver declines request from requester)
export async function declineMatchRequest(requesterId: string, receiverId: string) {
  await requireSameUserOrAdmin(receiverId)

  try {
    const result = await sql`
      UPDATE user_matches
      SET status = 'rejected', accepted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE user_id_1 = ${requesterId} AND user_id_2 = ${receiverId} AND status = 'pending'
    `
    if ((result as any).rowCount === 0) {
      return { success: false, error: "Aucune demande à refuser." }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: "Erreur lors du refus." }
  }
}

// Remove an existing match (either user can initiate)
export async function removeMatch(userId1: string, userId2: string) {
  const currentUser = await requireSameUserOrAdmin(
    userId1,
    'Action limitée à votre propre compte ou à un compte en match avec vous'
  )
  if (currentUser.id !== userId1 && currentUser.id !== userId2 && currentUser.role !== 'admin') {
    throw new Error('Action limitée à votre propre compte ou à un compte en match avec vous')
  }

  try {
    // It doesn't matter who is userId1 or userId2 in the table, so check both combinations
    const result = await sql`
      DELETE FROM user_matches
      WHERE (user_id_1 = ${userId1} AND user_id_2 = ${userId2} AND status = \'accepted\')
         OR (user_id_1 = ${userId2} AND user_id_2 = ${userId1} AND status = \'accepted\')
    `
    // Assuming 'sql' result for DELETE has a 'rowCount' property.
    // Using 'as any' to bypass potential overly generic typing from the sql tag.
    if ((result as any).rowCount === 0) {
      log('info', 'No accepted match to remove', { operation: 'removeMatch' });
      return { success: true, message: "No active match to remove or already removed." };
    }
    // Optionally, send notifications or perform other cleanup
    return { success: true };
  } catch (error) {
    log('error', 'Match removal failed', {
      operation: 'removeMatch',
      errorName: error instanceof Error ? error.name : 'UnknownError'
    });
    return { success: false, error: "Erreur lors de la suppression du match." };
  }
}

// Get the match status between two users (returns 'pending', 'accepted', 'rejected', or null)
export async function getMatchStatus(userA: string, userB: string) {
  const match = await sql`
    SELECT status, user_id_1, user_id_2 FROM user_matches
    WHERE (user_id_1 = ${userA} AND user_id_2 = ${userB})
       OR (user_id_1 = ${userB} AND user_id_2 = ${userA})
    LIMIT 1
  `
  if (match.length === 0) return null
  return match[0]
}

// Get all incoming match requests for a user (where they are the receiver and status is pending)
export async function getIncomingMatchRequests(userId: string) {
  try {
    await requireSameUserOrAdmin(userId)
  } catch {
    return []
  }

  return await sql`
    SELECT * FROM user_matches
    WHERE user_id_2 = ${userId} AND status = 'pending'
    ORDER BY created_at DESC
  `
}

// Get all outgoing match requests for a user (where they are the requester and status is pending)
export async function getOutgoingMatchRequests(userId: string) {
  try {
    await requireSameUserOrAdmin(userId)
  } catch {
    return []
  }

  return await sql`
    SELECT * FROM user_matches
    WHERE user_id_1 = ${userId} AND status = 'pending'
    ORDER BY created_at DESC
  `
}

export async function getAllUsers() {
  await requireAdmin()

  const users = await sql`
    SELECT u.id, u.name, u.email, u.role, u.avatar, up.location, up.age, u.is_banned, u.status
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    ORDER BY u.created_at DESC
  `
  return users || []
}

export async function getTotalUsersCount() {
  await requireAdmin()

  try {
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    return result[0].count as number;
  } catch (error) {
    log('error', 'Total user count failed', {
      operation: 'getTotalUsersCount',
      errorName: error instanceof Error ? error.name : 'UnknownError'
    });
    return 0;
  }
}

export async function getUserCountsByGender(): Promise<{ gender: string; count: number }[] | null> {
  await requireAdmin()

  try {
    const result = await sql`
      SELECT 
        up.gender, 
        COUNT(u.id) as count 
      FROM users u
      JOIN user_profiles up ON u.id = up.user_id
      WHERE up.gender IS NOT NULL AND up.gender <> ''
      GROUP BY up.gender
      ORDER BY up.gender;
    `;
    // La structure de 'result' peut varier selon votre client SQL.
    // Si 'result' est un tableau directement, utilisez-le. Si c'est un objet avec une propriété 'rows', utilisez result.rows.
    // Pour cet exemple, je suppose que 'result' est directement le tableau des lignes.
    return result.map((row: any) => ({
      gender: row.gender as string,
      count: parseInt(row.count as string, 10)
    }));
  } catch (error) {
    log('error', 'User count by gender failed', {
      operation: 'getUserCountsByGender',
      errorName: error instanceof Error ? error.name : 'UnknownError'
    });
    return null;
  }
}

export async function updateUserByAdmin(userId: string, { name, email, role, avatar }: { name?: string, email?: string, role?: string, avatar?: string }) {
  await requireAdmin()

  const [user] = await sql`
    UPDATE users
    SET
      name = COALESCE(${name}, name),
      email = COALESCE(${email}, email),
      role = COALESCE(${role}, role),
      avatar = COALESCE(${avatar}, avatar)
    WHERE id = ${userId}
    RETURNING *
  `
  return user
}

export async function deleteUserByAdmin(userId: string) {
  await requireAdmin()

  await sql`
    DELETE FROM users WHERE id = ${userId}
  `
  return { success: true }
}

// Get new users count grouped by day/week/month
export async function getNewUsersStats({ startDate, endDate, scale }: { startDate: string, endDate: string, scale: "day"|"week"|"month" }) {
  await requireAdmin()

  let dateTrunc;
  if (scale === "day") {
    dateTrunc = "TO_CHAR(DATE(created_at), 'YYYY-MM-DD')";
  } else if (scale === "week") {
    dateTrunc = "TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')";
  } else {
    dateTrunc = "TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM-DD')";
  }
  const query = `
    SELECT ${dateTrunc} as period, COUNT(*) as count
    FROM users
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY period
    ORDER BY period ASC
  `;
  const stats = await sql.query(query, [startDate, endDate]);
  return stats;
}

// Get active users (users who sent a message) grouped by day/week/month
export async function getActiveUsersStats({ startDate, endDate, scale }: { startDate: string, endDate: string, scale: "day"|"week"|"month" }) {
  await requireAdmin()

  let dateTrunc;
  if (scale === "day") {
    dateTrunc = "TO_CHAR(DATE(created_at), 'YYYY-MM-DD')";
  } else if (scale === "week") {
    dateTrunc = "TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')";
  } else {
    dateTrunc = "TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM-DD')";
  }
  const query = `
    SELECT ${dateTrunc} as period, COUNT(DISTINCT sender_id) as count
    FROM messages
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY period
    ORDER BY period ASC
  `;
  const stats = await sql.query(query, [startDate, endDate]);
  return stats;
}

// Get new matches grouped by day/week/month
export async function getMatchesStats({ startDate, endDate, scale }: { startDate: string, endDate: string, scale: "day"|"week"|"month" }) {
  await requireAdmin()

  let dateTrunc;
  if (scale === "day") {
    dateTrunc = "TO_CHAR(DATE(created_at), 'YYYY-MM-DD')";
  } else if (scale === "week") {
    dateTrunc = "TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')";
  } else {
    dateTrunc = "TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM-DD')";
  }
  const query = `
    SELECT ${dateTrunc} as period, COUNT(*) as count
    FROM user_matches
    WHERE status = 'accepted' AND accepted_at BETWEEN $1 AND $2
    GROUP BY period
    ORDER BY period ASC
  `;
  const stats = await sql.query(query, [startDate, endDate]);
  return stats;
}

async function ensureOptionsTable() {
  await sql.query(
    `
      CREATE TABLE IF NOT EXISTS options (
        name TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
    []
  )
}

// Get an option by name
export async function getOption(name: string) {
  await ensureOptionsTable()
  const [option] = await sql`SELECT value FROM options WHERE name = ${name}`
  return option?.value || null
}

// Set an option by name
export async function setOption(name: string, value: string) {
  await requireAdmin()
  await ensureOptionsTable()

  await sql`
    INSERT INTO options (name, value)
    VALUES (${name}, ${value})
    ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
  `
  return { success: true }
}
