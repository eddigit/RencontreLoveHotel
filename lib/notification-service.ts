import { sql } from '@/lib/db'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical'
export type NotificationAudience = 'user' | 'admin'

export type AppNotificationInput = {
  userId: string
  type: string
  title: string
  description?: string
  link?: string
  image?: string | null
  priority?: NotificationPriority
  category?: string
  audience?: NotificationAudience
  metadata?: Record<string, unknown>
  createdBy?: string | null
}

export async function createAppNotificationRecord(input: AppNotificationInput) {
  const [notification] = await sql.query(
    `
      INSERT INTO notifications (
        user_id, type, title, description, link, image, priority, category,
        audience, metadata, created_by, read
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, false)
      RETURNING *
    `,
    [
      input.userId,
      input.type,
      input.title,
      input.description || '',
      input.link || '',
      input.image || null,
      input.priority || 'normal',
      input.category || input.type,
      input.audience || 'user',
      JSON.stringify(input.metadata || {}),
      input.createdBy || null
    ]
  )

  return { success: true, notification }
}

export function createNotificationRecord(input: {
  userId: string
  type: string
  title: string
  description?: string
  link?: string
}) {
  return createAppNotificationRecord({ ...input, category: input.type })
}
