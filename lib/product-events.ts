import { sql } from '@/lib/db'

export const productEventNames = [
  'profile_impression',
  'profile_opened',
  'match_request_sent',
  'match_accepted',
  'conversation_started',
  'message_sent',
  'message_replied',
  'event_viewed',
  'event_joined',
  'booking_clicked',
  'conciergerie_submitted'
] as const

export type ProductEventName = (typeof productEventNames)[number]
type ProductMetadataValue = string | number | boolean

export type ProductEventInput = {
  eventName: ProductEventName
  userId?: string | null
  subjectId?: string | null
  sessionId?: string | null
  source?: string
  metadata?: Record<string, unknown>
}

const allowedMetadataKeys = new Set([
  'batch',
  'surface',
  'successful',
  'context_type',
  'media_type',
  'event_category',
  'source',
  'position',
  'profile_quality',
  'reply',
  'count'
])

export function sanitizeProductMetadata(
  metadata: Record<string, unknown> = {}
): Record<string, ProductMetadataValue> {
  const sanitized: Record<string, ProductMetadataValue> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (!allowedMetadataKeys.has(key)) continue
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed && trimmed.length <= 80) sanitized[key] = trimmed
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value
    } else if (typeof value === 'boolean') {
      sanitized[key] = value
    }
  }

  return sanitized
}

function isMissingProductSchema(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return error.code === '42P01' || error.code === '42703'
}

export async function trackProductEvent(input: ProductEventInput): Promise<void> {
  if (!productEventNames.includes(input.eventName)) return

  try {
    await sql.query(
      `
        INSERT INTO product_events (
          event_name, user_id, subject_id, session_id, source, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        input.eventName,
        input.userId || null,
        input.subjectId || null,
        input.sessionId?.slice(0, 120) || null,
        (input.source || 'app').slice(0, 40),
        JSON.stringify(sanitizeProductMetadata(input.metadata))
      ]
    )
  } catch (error) {
    if (isMissingProductSchema(error)) return
    throw error
  }
}

export async function trackProductEvents(inputs: ProductEventInput[]) {
  await Promise.all(inputs.slice(0, 100).map(trackProductEvent))
}
