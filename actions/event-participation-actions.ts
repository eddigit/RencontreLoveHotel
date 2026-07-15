'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/server-auth'
import {
  decideParticipation,
  listMemberParticipations,
  listOwnedEventRequests,
  requestParticipation,
  withdrawParticipation,
  type EventParticipationDecision
} from '@/lib/event-participation-service'

function refreshEventViews () {
  revalidatePath('/events')
  revalidatePath('/discover')
}

export async function requestEventParticipation (eventId: string) {
  const user = await requireCurrentUser()
  const result = await requestParticipation({ eventId, actorId: user.id })
  refreshEventViews()
  return result
}

export async function withdrawEventParticipation (eventId: string) {
  const user = await requireCurrentUser()
  const result = await withdrawParticipation({ eventId, actorId: user.id })
  refreshEventViews()
  return result
}

export async function decideEventParticipation (
  participationId: string,
  decision: EventParticipationDecision
) {
  const user = await requireCurrentUser()
  const result = await decideParticipation({
    participationId,
    actorId: user.id,
    actorRole: user.role,
    decision
  })
  refreshEventViews()
  return result
}

export async function getMyEventParticipations () {
  const user = await requireCurrentUser()
  return listMemberParticipations(user.id)
}

export async function getOwnedEventRequests () {
  const user = await requireCurrentUser()
  return listOwnedEventRequests(user.id)
}
