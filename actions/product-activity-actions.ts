'use server'

import { sql } from '@/lib/db'
import {
  productActivityTypes,
  recordProductActivity,
  type ProductActivityType
} from '@/lib/product-activity'
import { requireAdmin, requireCurrentUser } from '@/lib/server-auth'

export async function recordProfileView(targetUserId: string) {
  const user = await requireCurrentUser()
  if (user.id === targetUserId) return { success: true, recorded: false }

  const recorded = await recordProductActivity({
    actorUserId: user.id,
    eventType: 'profile_viewed',
    targetType: 'user',
    targetId: targetUserId,
    metadata: { source: 'member_profile' }
  })
  return { success: recorded, recorded }
}

export type ProductActivitySummaryItem = {
  eventType: ProductActivityType
  last24h: number
  last7d: number
}

export async function getProductActivitySummary(): Promise<ProductActivitySummaryItem[]> {
  await requireAdmin()

  const rows = await sql.query<Array<{
    event_type: ProductActivityType
    last_24h: string | number
    last_7d: string | number
  }>>(
    `
      SELECT
        event_type,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS last_7d
      FROM product_activity_events
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY event_type
    `,
    []
  )

  const byType = new Map(rows.map(row => [row.event_type, row]))
  return productActivityTypes.map(eventType => ({
    eventType,
    last24h: Number(byType.get(eventType)?.last_24h || 0),
    last7d: Number(byType.get(eventType)?.last_7d || 0)
  }))
}
