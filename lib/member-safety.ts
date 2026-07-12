import { sql } from '@/lib/db'

export async function getBlockRelationship(userA: string, userB: string) {
  const [relationship] = await sql.query<Array<{
    blocked_by_a: boolean
    blocked_by_b: boolean
  }>>(
    `SELECT
       EXISTS (
         SELECT 1 FROM user_blocks
         WHERE blocker_id = $1 AND blocked_id = $2
       ) AS blocked_by_a,
       EXISTS (
         SELECT 1 FROM user_blocks
         WHERE blocker_id = $2 AND blocked_id = $1
       ) AS blocked_by_b`,
    [userA, userB]
  )

  return {
    blockedByA: Boolean(relationship?.blocked_by_a),
    blockedByB: Boolean(relationship?.blocked_by_b)
  }
}

export async function assertUsersCanInteract(userA: string, userB: string) {
  const relationship = await getBlockRelationship(userA, userB)
  if (relationship.blockedByA || relationship.blockedByB) {
    throw new Error('Cette interaction n’est pas disponible entre ces membres.')
  }
}
