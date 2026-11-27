'use server'

import type { FilterOptions } from '@/components/advanced-filters'
import { requireCurrentUser } from '@/lib/server-auth'
import { getMemberConversationSummaries } from '@/lib/member-relationship-service'
import { getUpcomingEvents } from './event-actions'
import { getCommunityMemberStats, getDiscoverProfiles, getOnlineCommunityMembers, getUserMatches } from './user-actions'

export async function getCommunityHome(filters: FilterOptions, batch: number) {
  const { id } = await requireCurrentUser()
  return Promise.all([
    getDiscoverProfiles(id, 1, 240, filters, batch),
    getOnlineCommunityMembers(),
    getUserMatches(id),
    getUpcomingEvents(id),
    getCommunityMemberStats(),
    getMemberConversationSummaries(id, true).catch(() => null)
  ])
}
