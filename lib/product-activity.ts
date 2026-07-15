import { sql } from '@/lib/db'

export const productActivityTypes = [
  'member_search',
  'profile_viewed',
  'match_requested',
  'match_accepted',
  'conversation_started',
  'message_sent',
  'event_created',
  'event_joined',
  'wall_post_created'
] as const

export type ProductActivityType = (typeof productActivityTypes)[number]

const allowedMetadataKeys = new Set([
  'resultCount', 'filterCount', 'source', 'status', 'type', 'venue'
])

export function sanitizeProductActivityMetadata(
  metadata: Record<string, unknown> = {}
) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) =>
      allowedMetadataKeys.has(key) &&
      ['string', 'number', 'boolean'].includes(typeof value)
    )
  )
}

export async function recordProductActivity(input: {
  actorUserId: string
  eventType: ProductActivityType
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await sql.query(
      `
        INSERT INTO product_activity_events (
          actor_user_id, event_type, target_type, target_id, metadata
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        input.actorUserId,
        input.eventType,
        input.targetType || null,
        input.targetId || null,
        JSON.stringify(sanitizeProductActivityMetadata(input.metadata))
      ]
    )
    return true
  } catch (error) {
    console.error('Mesure activité produit indisponible:', error)
    return false
  }
}
