"use server"

import { sql, withTransaction } from "@/lib/db"
import { calculateMatchScore, isMutuallyTargeted } from "@/utils/matching-algorithm"
import { createNotificationInternal as createNotification } from '@/lib/notification-service'
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
import { rankDiscoveryCandidates, rotateDiscoveryBatchWithPhotoPriority } from '@/lib/discovery-ranking'
import { eligibleMemberPhotoSql } from '@/lib/member-photo'
import { trackProductEvent, trackProductEvents } from '@/lib/product-events'
import {
  bdsmRoleOptions,
  memberIdentityFromStatus,
  relationshipIntentOptions,
  type DirectoryProfileType,
  type MemberStatus
} from '@/lib/member-profile-types'
import { ensurePrivatePhotoVerificationSchema } from '@/lib/photo-verification-schema'
import { verifiedPhotoPredicateSql } from '@/lib/photo-verification-badge'
import { ensureAdminUserStarSchema } from '@/lib/admin-user-star'
import { ensureProfileLikesDislikesSchema } from '@/lib/profile-likes-dislikes'
import { revalidatePath } from 'next/cache'
import { sendMemberActivityEmail } from '@/lib/member-activity-email'

type CommunityMemberStats = {
  totalMembers: number
}

export async function getUserProfile(userId: string) {
  return readUserProfile(userId, false)
}

// Matching may use private preferences on the server; callers receive only the score.
async function readUserProfile(userId: string, forMatching: boolean) {
  const currentUser = await requireCurrentUser()
  const privateAccess = currentUser.id === userId || currentUser.role === 'admin'
  await ensureProfileLikesDislikesSchema()
  const user = await sql`
    SELECT
      u.id AS user_id,
      u.id,
      u.name,
      CASE WHEN ${privateAccess} THEN u.email ELSE NULL END AS email,
      CASE WHEN ${privateAccess} THEN u.role ELSE NULL END AS role,
      u.avatar,
      u.onboarding_completed,
      CASE WHEN ${privateAccess} THEN u.is_banned ELSE NULL END AS is_banned,
      u.status AS account_status,
      u.created_at AS user_created_at,
      u.updated_at AS user_updated_at,
      u.last_seen_at,
      u.admin_starred_at,
      up.id AS profile_id,
      up.status,
      up.age,
      up.orientation,
      up.bio,
      up.location,
      up.gender,
      CASE WHEN ${privateAccess} THEN up.birthday ELSE NULL END AS birthday,
      up.interests,
      up.likes,
      up.dislikes,
      up.featured,
      up.display_profile,
      up.created_at AS profile_created_at,
      up.updated_at AS profile_updated_at,
      up.couple_composition,
      up.seeking_profile_types,
      up.relationship_intents,
      CASE WHEN ${privateAccess || forMatching} OR up.bdsm_roles_public IS TRUE THEN up.bdsm_roles ELSE '{}'::text[] END AS bdsm_roles,
      COALESCE(up.bdsm_roles_public, false) AS bdsm_roles_public
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = ${userId} AND (${privateAccess} OR (
      up.display_profile IS TRUE AND COALESCE(u.is_banned, false) = false
      AND COALESCE(u.status, 'active') = 'active'
      AND NOT EXISTS (SELECT 1 FROM user_blocks b
        WHERE (b.blocker_id = ${currentUser.id} AND b.blocked_id = u.id)
           OR (b.blocker_id = u.id AND b.blocked_id = ${currentUser.id}))
    ))
    ORDER BY up.updated_at DESC NULLS LAST, up.id DESC LIMIT 1
  `
  if (!user.length) return { user: null, photos: [], preferences: null, meetingTypes: null, additionalOptions: null }

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
      seeking_profile_types: profile.user.seeking_profile_types,
      relationship_intents: profile.user.relationship_intents,
      bdsm_roles: profile.user.bdsm_roles,
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

  const hasPresenceColumn = await ensurePresenceSchema()
  const user1PresenceColumn = hasPresenceColumn ? 'u1.last_seen_at' : 'u1.updated_at'
  const user2PresenceColumn = hasPresenceColumn ? 'u2.last_seen_at' : 'u2.updated_at'
  const matches = await sql.query<any[]>(
    `
    SELECT
      um.*,
      u1.name as user1_name,
      COALESCE(user1_primary_photo.url, u1.avatar) as user1_avatar,
      up1.gender as user1_gender,
      up1.status as user1_profile_status,
      ${onlinePresenceCondition(user1PresenceColumn)} as user1_online,
      u2.name as user2_name,
      COALESCE(user2_primary_photo.url, u2.avatar) as user2_avatar,
      up2.gender as user2_gender,
      up2.status as user2_profile_status,
      ${onlinePresenceCondition(user2PresenceColumn)} as user2_online
    FROM user_matches um
    JOIN users u1 ON um.user_id_1 = u1.id
    JOIN users u2 ON um.user_id_2 = u2.id
    LEFT JOIN user_profiles up1 ON up1.user_id = u1.id
    LEFT JOIN user_profiles up2 ON up2.user_id = u2.id
    LEFT JOIN LATERAL (
      SELECT photos.url FROM photos
      WHERE photos.user_id = u1.id AND photos.is_primary IS TRUE
      ORDER BY photos.created_at ASC LIMIT 1
    ) user1_primary_photo ON TRUE
    LEFT JOIN LATERAL (
      SELECT photos.url FROM photos
      WHERE photos.user_id = u2.id AND photos.is_primary IS TRUE
      ORDER BY photos.created_at ASC LIMIT 1
    ) user2_primary_photo ON TRUE
    WHERE (um.user_id_1 = $1 OR um.user_id_2 = $1) AND um.status = 'accepted'
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks b
        WHERE (b.blocker_id = um.user_id_1 AND b.blocked_id = um.user_id_2)
           OR (b.blocker_id = um.user_id_2 AND b.blocked_id = um.user_id_1)
      )
    ORDER BY um.match_score DESC
    `,
    [userId]
  )

  return matches || []
}

export async function getCommunityMemberStats(): Promise<CommunityMemberStats> {
  await requireCurrentUser()
  const [stats] = await sql.query<Array<{ total_members: string | number }>>(`
    SELECT COUNT(DISTINCT u.id) AS total_members
    FROM users u
    JOIN user_profiles up ON up.user_id = u.id
    WHERE COALESCE(u.is_banned, false) = false
      AND COALESCE(u.status, 'active') <> 'banned'
      AND u.onboarding_completed = TRUE
      AND up.display_profile = TRUE
  `)
  return { totalMembers: Number(stats.total_members) }
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
        up.status,
        up.gender,
        TRUE AS online,
        u.id = $1 AS is_current_user
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      WHERE up.display_profile = TRUE
        AND u.onboarding_completed = TRUE
        AND COALESCE(u.is_banned, false) = false
        AND COALESCE(u.status, 'active') <> 'banned'
        AND ${onlineCondition}
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
             OR (b.blocker_id = u.id AND b.blocked_id = $1)
        )
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

export type CommunityMemberDirectoryFilters = {
  page?: number
  pageSize?: number
  search?: string
  profileType?: DirectoryProfileType
  orientation?: 'all' | 'hetero' | 'bi' | 'bisexual' | 'homo' | 'gay' | 'lesbian' | 'pansexual'
  meetingCriterion?: 'all' | 'open_couples' | 'open_curtains' | 'libertine'
  relationshipIntent?: 'all' | typeof relationshipIntentOptions[number]['value']
  bdsmRole?: 'all' | 'bdsm' | Exclude<typeof bdsmRoleOptions[number]['value'], 'none'>
  onlineOnly?: boolean
  recent?: boolean
}

const genericBdsmRoles = ['discovery', 'dominant', 'submissive', 'switch'] as const

export async function searchCommunityMembers(input: CommunityMemberDirectoryFilters = {}) {
  const currentUser = await requireCurrentUser()
  await Promise.all([ensureAdminUserStarSchema(), ensurePrivatePhotoVerificationSchema()])
  const requestedPage = Number(input.page || 1)
  const requestedPageSize = Number(input.pageSize || 24)
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(48, Math.max(12, Math.floor(requestedPageSize)))
    : 24
  const params: unknown[] = [currentUser.id]
  const whereClauses = [
    'u.id <> $1',
    `NOT EXISTS (SELECT 1 FROM user_blocks b WHERE
      (b.blocker_id = $1 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $1))`,
    'up.display_profile = TRUE',
    'u.onboarding_completed = TRUE',
    'COALESCE(u.is_banned, false) = false',
    "COALESCE(u.status, 'active') <> 'banned'"
  ]

  const addParam = (value: unknown) => {
    params.push(value)
    return `$${params.length}`
  }

  const relationshipIntent = relationshipIntentOptions.some(option => option.value === input.relationshipIntent)
    ? input.relationshipIntent
    : undefined
  const bdsmRole = input.bdsmRole === 'bdsm' || bdsmRoleOptions.some(option => option.value !== 'none' && option.value === input.bdsmRole)
    ? input.bdsmRole
    : undefined

  if (input.recent) whereClauses.push("u.created_at >= NOW() - INTERVAL '24 hours'")
  const search = input.search?.trim().toLowerCase()
  if (search) {
    const placeholder = addParam(`%${search}%`)
    whereClauses.push(`(
      LOWER(COALESCE(u.name, '')) LIKE ${placeholder}
      OR LOWER(COALESCE(up.location, '')) LIKE ${placeholder}
    )`)
  }

  if (input.profileType === 'couple') {
    whereClauses.push("(LOWER(COALESCE(up.status, '')) LIKE 'couple%' OR LOWER(COALESCE(up.gender, '')) LIKE 'couple%')")
  } else if (input.profileType === 'woman') {
    whereClauses.push("(LOWER(COALESCE(up.gender, '')) IN ('female', 'single_female', 'single_woman', 'married_female', 'married_woman', 'couple_ff') OR LOWER(COALESCE(up.status, '')) IN ('single_female', 'single_woman', 'married_woman'))")
  } else if (input.profileType === 'man') {
    whereClauses.push("(LOWER(COALESCE(up.gender, '')) IN ('male', 'single_male', 'single_man', 'married_male', 'married_man', 'couple_mm') OR LOWER(COALESCE(up.status, '')) IN ('single_male', 'single_man', 'married_man'))")
  } else if (input.profileType === 'trans') {
    whereClauses.push("(LOWER(COALESCE(up.gender, '')) LIKE '%trans%' OR LOWER(COALESCE(up.status, '')) LIKE '%trans%')")
  }

  if (input.orientation && input.orientation !== 'all') {
    whereClauses.push(`LOWER(COALESCE(up.orientation, '')) = ${addParam(input.orientation.toLowerCase())}`)
  }

  if (input.meetingCriterion === 'open_couples') {
    whereClauses.push('EXISTS (SELECT 1 FROM user_meeting_types umt_filter WHERE umt_filter.user_id = u.id AND umt_filter.open_to_other_couples = TRUE)')
  } else if (input.meetingCriterion === 'open_curtains') {
    whereClauses.push('EXISTS (SELECT 1 FROM user_meeting_types umt_filter WHERE umt_filter.user_id = u.id AND umt_filter.open_curtains = TRUE)')
  } else if (input.meetingCriterion === 'libertine') {
    whereClauses.push('EXISTS (SELECT 1 FROM user_meeting_types umt_filter WHERE umt_filter.user_id = u.id AND umt_filter.libertine = TRUE)')
  }

  if (relationshipIntent) {
    whereClauses.push(`${addParam(relationshipIntent)} = ANY(COALESCE(up.relationship_intents, ARRAY[]::text[]))`)
  }

  if (bdsmRole) {
    // BDSM preferences are searchable only when their owner opted into their public use.
    whereClauses.push('up.bdsm_roles_public IS TRUE')
    if (bdsmRole === 'bdsm') {
      whereClauses.push(`COALESCE(up.bdsm_roles, ARRAY[]::text[]) && ${addParam(genericBdsmRoles)}::text[]`)
    } else {
      whereClauses.push(`${addParam(bdsmRole)} = ANY(COALESCE(up.bdsm_roles, ARRAY[]::text[]))`)
    }
  }

  if (input.onlineOnly) {
    const hasPresenceColumn = await ensurePresenceSchema()
    const presenceColumn = hasPresenceColumn ? 'u.last_seen_at' : 'u.updated_at'
    whereClauses.push(`${presenceColumn} >= NOW() - INTERVAL '5 minutes'`)
  }

  const whereCondition = `WHERE ${whereClauses.join('\n      AND ')}`
  const countResult = await sql.query<{ total: string | number }[]>(
    `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      ${whereCondition}
    `,
    params
  )
  const totalCount = Number(countResult[0]?.total || 0)

  const memberParams = [...params]
  const addMemberParam = (value: unknown) => {
    memberParams.push(value)
    return `$${memberParams.length}`
  }
  const nameSearchRankSql = search
    ? `CASE
          WHEN LOWER(COALESCE(u.name, '')) = ${addMemberParam(search)} THEN 0
          WHEN LOWER(COALESCE(u.name, '')) LIKE ${addMemberParam(`${search}%`)} THEN 1
          WHEN LOWER(COALESCE(u.name, '')) LIKE ${addMemberParam(`%${search}%`)} THEN 2
          WHEN LOWER(COALESCE(up.location, '')) LIKE ${addMemberParam(`${search}%`)} THEN 3
          ELSE 4
        END`
    : '0'
  const limitPlaceholder = addMemberParam(pageSize)
  const offsetPlaceholder = addMemberParam((page - 1) * pageSize)
  const members = await sql.query<any[]>(
    `
      SELECT
        u.id,
        u.name,
        ${verifiedPhotoPredicateSql()} AS photo_verified,
        COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), '')) AS avatar,
        u.created_at,
        up.age,
        up.location,
        up.status AS profile_status,
        up.gender,
        up.orientation,
        up.bio,
        umt.open_to_other_couples,
        umt.open_curtains,
        umt.libertine,
        CASE WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} THEN 1 ELSE 0 END AS has_personal_photo,
        CASE
          WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} AND u.admin_starred_at IS NOT NULL AND u.moderator_spotlight_at IS NOT NULL THEN 3
          WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} AND u.admin_starred_at IS NOT NULL THEN 2
          WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} THEN 1
          ELSE 0
        END AS photo_rank,
        ${nameSearchRankSql} AS name_search_rank,
        (${onlinePresenceCondition('u.updated_at')}) AS online
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT p.url FROM photos p WHERE p.user_id = u.id AND p.is_primary IS TRUE
        ORDER BY p.created_at DESC, p.id LIMIT 1
      ) primary_photo ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          BOOL_OR(COALESCE(open_to_other_couples, false)) AS open_to_other_couples,
          BOOL_OR(COALESCE(open_curtains, false)) AS open_curtains,
          BOOL_OR(COALESCE(libertine, false)) AS libertine
        FROM user_meeting_types
        WHERE user_id = u.id
      ) umt ON TRUE
      ${whereCondition}
      ORDER BY name_search_rank ASC, photo_rank DESC, u.created_at DESC, u.id ASC
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `,
    memberParams
  )

  return {
    members: members || [],
    totalCount,
    currentPage: page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize)
  }
}

export async function getDiscoverProfiles(currentUserId: string, page: number = 1, pageSize: number = 50, filters?: FilterOptions, batch = 0, visitSeed = '') {
  log('info', 'Discover profiles requested', { operation: 'getDiscoverProfiles', page, pageSize });
  await ensureAdminUserStarSchema()

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
  let hasDeclaredTargets = false;
  const hasPresenceColumn = await ensurePresenceSchema();
  const presenceColumn = hasPresenceColumn ? 'u.last_seen_at' : 'u.updated_at';
  const onlineCondition = onlinePresenceCondition(presenceColumn);
  try {
    const currentUserProfileResult = await sql`
      SELECT gender, orientation, seeking_profile_types
      FROM user_profiles
      WHERE user_id = ${currentUserId}
      LIMIT 1;
    `;
    if (currentUserProfileResult && currentUserProfileResult.length > 0) {
      hasDeclaredTargets = Boolean(currentUserProfileResult[0].seeking_profile_types?.length);
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
  whereClauses.push('u.onboarding_completed = TRUE')
  whereClauses.push('COALESCE(u.is_banned, FALSE) = FALSE')
  whereClauses.push("COALESCE(u.status, 'active') <> 'banned'")
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

  if (!hasDeclaredTargets && currentUserProfileGender && currentUserProfileOrientation) {
    const genderOrientationMatchingClauses: string[] = [];

    const cUserPGender = currentUserProfileGender; // Already lowercased
    const cUserOrientation = currentUserProfileOrientation; // Already lowercased

    // Define SQL conditions for target profile genders based on user clarification
    const targetMaleEntitiesSQL = `(LOWER(up.gender) IN ('male', 'single_male', 'married_male', 'couple_mm', 'couple_mf'))`;
    const targetFemaleEntitiesSQL = `(LOWER(up.gender) IN ('female', 'single_female', 'married_female', 'couple_ff', 'couple_mf'))`;
    const targetTransEntitiesSQL = `(LOWER(up.gender) LIKE '%trans%' OR LOWER(up.status) LIKE '%trans%')`;

    // Define SQL conditions for target profile orientations (reusable parts)
    const targetOrientationHeteroBiCompatibleSQL = `(LOWER(up.orientation) = 'hetero' OR LOWER(up.orientation) = 'straight' OR LOWER(up.orientation) IN ('bi', 'bisexual') OR up.orientation IS NULL OR up.orientation = '')`;
    const targetOrientationGayBiCompatibleSQL = `(LOWER(up.orientation) = 'gay' OR LOWER(up.orientation) = 'homo' OR LOWER(up.orientation) IN ('bi', 'bisexual') OR up.orientation IS NULL OR up.orientation = '')`;

    // Determine current user's effective searching role (male/female)
    const isCurrentUserEffectivelyMale = (cUserPGender === 'male' || cUserPGender === 'single_male' || cUserPGender === 'married_male' || cUserPGender === 'couple_mm');
    const isCurrentUserEffectivelyFemale = (cUserPGender === 'female' || cUserPGender === 'single_female' || cUserPGender === 'married_female' || cUserPGender === 'couple_ff');

    if (cUserOrientation === 'hetero' || cUserOrientation === 'straight') {
      if (isCurrentUserEffectivelyMale) {
        genderOrientationMatchingClauses.push(`((${targetFemaleEntitiesSQL} AND ${targetOrientationHeteroBiCompatibleSQL}) OR ${targetTransEntitiesSQL})`);
      } else if (isCurrentUserEffectivelyFemale) {
        genderOrientationMatchingClauses.push(`((${targetMaleEntitiesSQL} AND ${targetOrientationHeteroBiCompatibleSQL}) OR ${targetTransEntitiesSQL})`);
      } else if (cUserPGender === 'couple_mf') {
        genderOrientationMatchingClauses.push(`(((${targetMaleEntitiesSQL} OR ${targetFemaleEntitiesSQL}) AND ${targetOrientationHeteroBiCompatibleSQL}) OR ${targetTransEntitiesSQL})`);
      }
    } else if (cUserOrientation === 'gay' || cUserOrientation === 'homo') {
      if (isCurrentUserEffectivelyMale) {
        genderOrientationMatchingClauses.push(`((${targetMaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}) OR ${targetTransEntitiesSQL})`);
      } else if (isCurrentUserEffectivelyFemale) {
        genderOrientationMatchingClauses.push(`((${targetFemaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}) OR ${targetTransEntitiesSQL})`);
      } else if (cUserPGender === 'couple_mf') {
        // Gay/Homo couple_mf: Contradictory for the unit's orientation.
      }
    } else if (cUserOrientation === 'bisexual' || cUserOrientation === 'bi') {
      if (isCurrentUserEffectivelyMale) { // Bi Male
        // Seeks (Male Gay/Bi) OR (Female Hetero/Bi)
        genderOrientationMatchingClauses.push(`((${targetMaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}) OR (${targetFemaleEntitiesSQL} AND ${targetOrientationHeteroBiCompatibleSQL}) OR ${targetTransEntitiesSQL})`);
      } else if (isCurrentUserEffectivelyFemale) { // Bi Female
        // Seeks (Female Gay/Bi) OR (Male Hetero/Bi)
        genderOrientationMatchingClauses.push(`((${targetFemaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}) OR (${targetMaleEntitiesSQL} AND ${targetOrientationHeteroBiCompatibleSQL}) OR ${targetTransEntitiesSQL})`);
      } else if (cUserPGender === 'couple_mf') { // Bi couple_mf
        // Placeholder: Open to (Male Gay/Bi) OR (Female Hetero/Bi) OR (Female Gay/Bi)
        // This covers seeking males for the male part, females for the male part, females for the female part, males for the female part, with compatible orientations.
        genderOrientationMatchingClauses.push(`((${targetMaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}) OR (${targetFemaleEntitiesSQL} AND ${targetOrientationHeteroBiCompatibleSQL}) OR (${targetFemaleEntitiesSQL} AND ${targetOrientationGayBiCompatibleSQL}) OR ${targetTransEntitiesSQL})`);
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
      whereClauses.push(`up.age BETWEEN ${ageMinPlaceholder} AND ${ageMaxPlaceholder}`);
    }

    // Status Filter
    if (filters.status && filters.status !== "all") {
      const filterStatus = filters.status.toLowerCase(); // Ensure filter value is lowercase
      if (filterStatus === "single") {
        whereClauses.push(`(LOWER(up.status) LIKE 'single_%')`);
      } else if (filterStatus === "couple") {
        baseParams.push('couple'); // Compare with lowercase 'couple'
        const statusPlaceholder = `$${baseParams.length}`;
        whereClauses.push(`(LOWER(up.status) = ${statusPlaceholder} OR LOWER(up.gender) LIKE 'couple%')`);
      } else if (filterStatus === 'trans') {
        whereClauses.push(`(LOWER(up.status) LIKE '%trans%' OR LOWER(up.gender) LIKE '%trans%')`);
      }
    }

    // Orientation Filter
    if (filters.orientation && filters.orientation !== "all") {
      baseParams.push(filters.orientation.toLowerCase()); // Ensure filter value is lowercase
      const orientationPlaceholder = `$${baseParams.length}`;
      whereClauses.push(`(LOWER(up.orientation) = ${orientationPlaceholder} OR (LOWER(up.orientation) IN ('bi','bisexual') AND ${orientationPlaceholder} IN ('bi','bisexual')))`);
    }

    // Meeting Types Filter
    if (filters.meetingTypes) {
      const activeMeetingTypes = Object.entries(filters.meetingTypes)
        .filter(([, isActive]) => isActive)
        .map(([type]) => type === 'openCurtains' ? 'open_curtains' : type);
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
    LEFT JOIN LATERAL (
      SELECT p.url FROM photos p WHERE p.user_id = u.id AND p.is_primary IS TRUE
      ORDER BY p.created_at DESC, p.id LIMIT 1
    ) primary_photo ON TRUE
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
      COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), '')) as image,
      u.created_at,
      up.age,
      up.location,
      up.orientation,
      up.status,
      up.gender,
      up.seeking_profile_types,
      up.relationship_intents,
      up.bdsm_roles,
      COALESCE((to_jsonb(up)->>'bdsm_roles_public')::boolean, false) AS bdsm_roles_public,
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
      u.admin_starred_at IS NOT NULL as featured,
      CASE
        WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} AND u.admin_starred_at IS NOT NULL AND u.moderator_spotlight_at IS NOT NULL THEN 3
        WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} AND u.admin_starred_at IS NOT NULL THEN 2
        WHEN ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} THEN 1
        ELSE 0
      END AS photo_priority,
      ${eligibleMemberPhotoSql("COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))", 'primary_photo.url IS NOT NULL')} AS has_eligible_photo,
      (SELECT COUNT(*) FROM product_events pe
        WHERE pe.event_name = 'profile_impression'
          AND pe.user_id = $1
          AND pe.subject_id = u.id
          AND pe.created_at >= NOW() - INTERVAL '14 days') AS viewer_impressions_14d
    ${baseFromClause}
    ${whereCondition}
    ORDER BY
      photo_priority DESC,
      viewer_impressions_14d ASC,
      (CASE WHEN ${onlineCondition} THEN 1 ELSE 0 END) DESC,
      u.created_at DESC,
      u.id ASC
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
        seeking_profile_types: profile.seeking_profile_types,
        relationship_intents: profile.relationship_intents,
        bdsm_roles: profile.bdsm_roles,
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
        bdsm_roles: profile.bdsm_roles_public ? profile.bdsm_roles : [],
        interests: profile.interests ? JSON.parse(profile.interests) : [],
        preferences: { ...preferences, bdsm_roles: profile.bdsm_roles_public ? preferences.bdsm_roles : [] },
        matchScore: currentMatchingProfile ? calculateMatchScore(currentMatchingProfile, matchingProfile) : null,
        matchingEligible: currentMatchingProfile ? isMutuallyTargeted(currentMatchingProfile, matchingProfile) : true,
        impressions14d: Number(profile.viewer_impressions_14d || 0),
        photoPriority: Number(profile.photo_priority || 0),
        hasEligiblePhoto: Boolean(profile.has_eligible_photo),
        profileQuality: Math.round((
          (Number(profile.photo_priority || 0) > 0 ? 35 : 0) +
          (profile.bio ? 25 : 0) +
          (profile.age ? 15 : 0) +
          (profile.location ? 15 : 0) +
          (profile.interests ? 10 : 0)
        )),
        lastSeenAt: profile.last_seen_at,
        createdAt: profile.created_at
      };
    })
    .filter((profile: any) => profile.matchingEligible)
  const safeBatch = Math.max(0, Math.floor(Number(batch) || 0))
  // Keep a single base ordering. Applying the batch as a window rotation below
  // makes a URL reload show the same profiles as the in-page "another batch"
  // action, without relying on a client-side snapshot.
  const rankedProfiles = rankDiscoveryCandidates<any>(mappedProfiles, {
    viewerId: `${currentUserId}:${String(visitSeed).slice(0, 128)}`,
    batch: 0
  })
  const rotatedProfiles = rotateDiscoveryBatchWithPhotoPriority(rankedProfiles, safeBatch, 12)

  const result = {
    profiles: rotatedProfiles,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / pageSize),
    hasMore: (offset + rotatedProfiles.length) < totalCount
  };
  log('info', 'Discover profiles completed', {
    operation: 'getDiscoverProfiles',
    count: rotatedProfiles.length,
    totalCount,
    page
  });
  return result;
}

export async function recordProfileImpressions(userId: string, profileIds: string[], batch = 0) {
  await requireSameUserOrAdmin(userId)
  const safeIds = Array.from(new Set(profileIds))
    .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    .slice(0, 18)

  await trackProductEvents(safeIds.map((subjectId, position) => ({
    eventName: 'profile_impression' as const,
    userId,
    subjectId,
    metadata: { surface: 'community', batch, position }
  })))
}

// Send a match request (creates a pending match if not already exists)
export async function sendMatchRequest(
  requesterId: string,
  receiverId: string,
  context?: { type?: string; source?: string }
) {
  await requireSameUserOrAdmin(requesterId)

  if (requesterId === receiverId) return { success: false, error: "Vous ne pouvez pas vous matcher vous-même." }
  // Check if receiver exists
  const receiverExists = await sql`SELECT 1 FROM users WHERE id = ${receiverId} LIMIT 1`
  if (receiverExists.length === 0) {
    return { success: false, error: "L'utilisateur cible n'existe pas." }
  }
  try {
    const [blocked, recentRequestCount] = await Promise.all([
      sql`
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = ${requesterId} AND blocked_id = ${receiverId})
           OR (blocker_id = ${receiverId} AND blocked_id = ${requesterId})
        LIMIT 1
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM user_matches
        WHERE user_id_1 = ${requesterId}
          AND created_at >= NOW() - INTERVAL '1 hour'
      `
    ])
    if (blocked.length > 0) {
      return { success: false, error: "Cette interaction n'est pas disponible." }
    }
    if (Number(recentRequestCount[0]?.count || 0) >= 20) {
      return { success: false, error: "Trop de demandes rapprochées. Réessayez un peu plus tard." }
    }

    // Check if a match already exists (in either direction)
    const existing = await sql`
      SELECT * FROM user_matches
      WHERE (user_id_1 = ${requesterId} AND user_id_2 = ${receiverId})
         OR (user_id_1 = ${receiverId} AND user_id_2 = ${requesterId})
    `
    let matchId = existing[0]?.id as string | undefined
    if (existing.length > 0) {
      const status = existing[0].status
      const pendingIsActive = status === "pending" && (
        !existing[0].expires_at || new Date(existing[0].expires_at).getTime() > Date.now()
      )
      if (pendingIsActive) return { success: false, error: "Demande déjà envoyée." }
      if (status === "accepted") return { success: false, error: "Vous êtes déjà en match." }
      if (status === 'rejected' && new Date(existing[0].updated_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000) {
        return { success: false, error: "Cette demande pourra être renouvelée plus tard." }
      }
    }
    // Fetch both user profiles for score calculation
    const requesterProfile = await getUserProfile(requesterId)
    const receiverProfile = await readUserProfile(receiverId, true)
    let matchScore = null
    const requester = buildMatchingProfile(requesterProfile);
    const receiver = buildMatchingProfile(receiverProfile);
    if (requester && receiver) {
      matchScore = calculateMatchScore(requester, receiver)
    }
    const safeContext = {
      type: typeof context?.type === 'string' ? context.type.slice(0, 40) : 'profile',
      source: typeof context?.source === 'string' ? context.source.slice(0, 40) : 'community'
    }
    if (existing.length > 0) {
      await sql`
        UPDATE user_matches
        SET user_id_1 = ${requesterId}, user_id_2 = ${receiverId}, status = 'pending',
            accepted_at = NULL, responded_at = NULL,
            expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days',
            context = ${JSON.stringify(safeContext)}::jsonb,
            updated_at = CURRENT_TIMESTAMP, match_score = ${matchScore}
        WHERE id = ${existing[0].id}
      `
    } else {
      const [createdMatch] = await sql`
        INSERT INTO user_matches (
          user_id_1, user_id_2, status, match_score, expires_at, context
        ) VALUES (
          ${requesterId}, ${receiverId}, 'pending', ${matchScore},
          CURRENT_TIMESTAMP + INTERVAL '30 days', ${JSON.stringify(safeContext)}::jsonb
        )
        RETURNING id
      `
      matchId = createdMatch?.id
    }
    // Send notification to receiver
    await createNotification({
      userId: receiverId,
      type: 'match_request',
      title: 'Nouvelle demande de match',
      description: 'Vous avez reçu une nouvelle demande de match.',
      link: '/matches',
    })
    await sendMemberActivityEmail({
      recipientId: receiverId,
      purpose: 'match_alert',
      notificationKey: `match-request:${matchId || `${requesterId}:${receiverId}`}`,
      subject: 'Une nouvelle demande de match vous attend',
      text: 'Une nouvelle demande de match est disponible. Connectez-vous pour y répondre.',
      path: '/matches'
    })
    await trackProductEvent({
      eventName: 'match_request_sent',
      userId: requesterId,
      subjectId: receiverId,
      metadata: { context_type: safeContext.type, source: safeContext.source }
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
    const result = await sql.query<Array<{ conversation_id: string }>>(
      `
        WITH accepted_match AS (
          UPDATE user_matches
          SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP,
              responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE user_id_1 = $1 AND user_id_2 = $2 AND status = 'pending'
            AND (expires_at IS NULL OR expires_at > NOW())
            AND NOT EXISTS (
              SELECT 1 FROM user_blocks
              WHERE (blocker_id = $1 AND blocked_id = $2)
                 OR (blocker_id = $2 AND blocked_id = $1)
            )
          RETURNING id
        ),
        existing_conversation AS (
          SELECT c.id
          FROM conversations c
          WHERE EXISTS (SELECT 1 FROM accepted_match)
            AND EXISTS (
              SELECT 1 FROM conversation_participants cp
              WHERE cp.conversation_id = c.id AND cp.user_id = $1
            )
            AND EXISTS (
              SELECT 1 FROM conversation_participants cp
              WHERE cp.conversation_id = c.id AND cp.user_id = $2
            )
            AND (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) = 2
          LIMIT 1
        ),
        created_conversation AS (
          INSERT INTO conversations (created_at, updated_at)
          SELECT CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          WHERE EXISTS (SELECT 1 FROM accepted_match)
            AND NOT EXISTS (SELECT 1 FROM existing_conversation)
          RETURNING id
        ),
        selected_conversation AS (
          SELECT id FROM existing_conversation
          UNION ALL
          SELECT id FROM created_conversation
          LIMIT 1
        ),
        inserted_participants AS (
          INSERT INTO conversation_participants (conversation_id, user_id)
          SELECT id, $1 FROM selected_conversation
          UNION ALL
          SELECT id, $2 FROM selected_conversation
          ON CONFLICT (conversation_id, user_id) DO NOTHING
          RETURNING conversation_id
        )
        SELECT id AS conversation_id FROM selected_conversation
      `,
      [requesterId, receiverId]
    )
    const conversationId = result[0]?.conversation_id
    if (!conversationId) {
      return { success: false, error: "Aucune demande à accepter." }
    }
    // Send notification to requester
    await createNotification({
      userId: requesterId,
      type: 'match_accepted',
      title: 'Votre demande de match a été acceptée',
      description: 'Votre demande de match a été acceptée !',
      link: `/messages/${conversationId}`,
    })
    await sendMemberActivityEmail({
      recipientId: requesterId,
      purpose: 'match_alert',
      notificationKey: `match-accepted:${conversationId}`,
      subject: 'Votre demande de match a été acceptée',
      text: 'Votre demande de match a été acceptée. Connectez-vous pour continuer votre échange.',
      path: `/messages/${conversationId}`
    })
    await trackProductEvent({
      eventName: 'match_accepted',
      userId: receiverId,
      subjectId: requesterId,
      metadata: { surface: 'matches' }
    })
    return { success: true, conversationId }
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
      SET status = 'rejected', accepted_at = NULL, responded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id_1 = ${requesterId} AND user_id_2 = ${receiverId} AND status = 'pending'
        AND (expires_at IS NULL OR expires_at > NOW())
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
      AND (expires_at IS NULL OR expires_at > NOW())
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
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
  `
}

export async function getAllUsers() {
  await requireAdmin()
  await ensureAdminUserStarSchema()

  const displayedPhoto = "COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))"
  const users = await sql.query(`
    SELECT u.id, u.name, u.email, u.role, u.avatar,
           ${displayedPhoto} AS image,
           ${eligibleMemberPhotoSql(displayedPhoto, 'primary_photo.url IS NOT NULL')} AS has_eligible_photo,
           up.location, up.age, up.gender, up.status AS profile_status,
           u.is_banned, u.status, u.admin_starred_at, u.moderator_spotlight_at,
           (u.admin_starred_at IS NOT NULL) AS admin_starred
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN LATERAL (
      SELECT p.url FROM photos p
      WHERE p.user_id = u.id AND p.is_primary IS TRUE
      ORDER BY p.created_at DESC, p.id
      LIMIT 1
    ) primary_photo ON TRUE
    ORDER BY u.created_at DESC
  `)
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

type AdminProfileType = MemberStatus | 'unspecified'

export async function updateUserByAdmin(userId: string, {
  name,
  email,
  role,
  avatar,
  profileType
}: {
  name?: string
  email?: string
  role?: string
  avatar?: string
  /** Explicit administrative correction only; never inferred from an avatar or photo. */
  profileType?: AdminProfileType
}) {
  await requireAdmin()

  if (role && !['user', 'community_moderator', 'admin'].includes(role)) {
    throw new Error('Rôle utilisateur invalide')
  }
  if (profileType && !['single_male', 'single_female', 'single_trans', 'couple', 'unspecified'].includes(profileType)) {
    throw new Error('Type de profil invalide')
  }

  return withTransaction(async client => {
    // user_profiles.user_id is not unique in the deployed schema. Serialise
    // corrections on the parent account instead of relying on an unsafe upsert.
    const locked = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    )
    if (!locked.rows[0]) throw new Error('Utilisateur introuvable')

    const updatedUser = await client.query<{
      id: string
      name: string
      email: string
      role: string
      avatar: string | null
    }>(
      `UPDATE users
       SET name = COALESCE($1, name), email = COALESCE($2, email),
           role = COALESCE($3, role), avatar = COALESCE($4, avatar)
       WHERE id = $5
       RETURNING id, name, email, role, avatar`,
      [name ?? null, email ?? null, role ?? null, avatar ?? null, userId]
    )

    // Keep the discovery identity consistent by writing the canonical status
    // and gender together. Preferences, search settings and photos are not
    // part of this administrative correction.
    if (profileType) {
      const identity = profileType === 'unspecified'
        ? { status: null, gender: null }
        : memberIdentityFromStatus(profileType)
      const updatedProfile = await client.query(
        `UPDATE user_profiles
         SET status = $1, gender = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3
         RETURNING id`,
        [identity.status, identity.gender, userId]
      )
      if (!updatedProfile.rows[0]) {
        await client.query(
          `INSERT INTO user_profiles (id, user_id, status, gender)
           VALUES (gen_random_uuid(), $1, $2, $3)`,
          [userId, identity.status, identity.gender]
        )
      }
    }

    return updatedUser.rows[0]
  })
}

/** Editorial label used only for presentation. */
export async function setModeratorSpotlight(userId: string, enabled: boolean) {
  await requireAdmin()
  if (typeof enabled !== 'boolean') throw new Error('Sélection invalide')
  await ensureAdminUserStarSchema()
  const [updated] = await sql`
    UPDATE users SET moderator_spotlight_at = CASE WHEN ${enabled}
      THEN COALESCE(moderator_spotlight_at, CURRENT_TIMESTAMP) ELSE NULL END
    WHERE id = ${userId}
    RETURNING moderator_spotlight_at
  `
  if (!updated) throw new Error('Utilisateur introuvable')
  revalidatePath('/admin/users')
  return Boolean(updated.moderator_spotlight_at)
}

export async function setUserAdminStar(userId: string, starred: boolean) {
  await requireAdmin()
  await ensureAdminUserStarSchema()

  const displayedPhoto = "COALESCE(primary_photo.url, NULLIF(TRIM(u.avatar), ''))"
  const [target] = await sql.query<Array<{ id: string, has_eligible_photo: boolean }>>(`
    SELECT u.id,
           ${eligibleMemberPhotoSql(displayedPhoto, 'primary_photo.url IS NOT NULL')} AS has_eligible_photo
    FROM users u
    LEFT JOIN LATERAL (
      SELECT p.url FROM photos p
      WHERE p.user_id = u.id AND p.is_primary IS TRUE
      ORDER BY p.created_at DESC, p.id
      LIMIT 1
    ) primary_photo ON TRUE
    WHERE u.id = $1
  `, [userId])

  if (!target) throw new Error('Utilisateur introuvable')
  if (starred && !target.has_eligible_photo) {
    throw new Error('Une photo membre éligible est requise pour mettre ce profil en avant')
  }

  const [user] = await sql`
    UPDATE users
    SET admin_starred_at = CASE
      WHEN ${starred} THEN COALESCE(admin_starred_at, CURRENT_TIMESTAMP)
      ELSE NULL
    END
    WHERE id = ${userId}
    RETURNING id, admin_starred_at
  `

  if (!user) throw new Error('Utilisateur introuvable')

  revalidatePath('/admin/users')
  return {
    id: user.id as string,
    adminStarredAt: user.admin_starred_at as string | null
  }
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
    WHERE created_at >= $1 AND created_at < $2
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
    WHERE created_at >= $1 AND created_at < $2
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
    dateTrunc = "TO_CHAR(DATE(accepted_at), 'YYYY-MM-DD')";
  } else if (scale === "week") {
    dateTrunc = "TO_CHAR(DATE_TRUNC('week', accepted_at), 'YYYY-MM-DD')";
  } else {
    dateTrunc = "TO_CHAR(DATE_TRUNC('month', accepted_at), 'YYYY-MM-DD')";
  }
  const query = `
    SELECT ${dateTrunc} as period, COUNT(*) as count
    FROM user_matches
    WHERE status = 'accepted' AND accepted_at >= $1 AND accepted_at < $2
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
