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

export type AdminNotificationInput = Omit<
  AppNotificationInput,
  'userId' | 'audience'
>

export async function createAppNotificationInternal(input: AppNotificationInput) {
  const [notification] = await sql.query(
    `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        description,
        link,
        image,
        priority,
        category,
        audience,
        metadata,
        created_by,
        read
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

export async function createNotificationInternal({ userId, type, title, description, link }: {
  userId: string
  type: string
  title: string
  description?: string
  link?: string
}) {
  return createAppNotificationInternal({
    userId,
    type,
    title,
    description,
    link,
    category: type
  })
}

export async function notifyAdminsInternal(input: AdminNotificationInput) {
  const admins = await sql.query<{ id: string }[]>(
    `
      SELECT id
      FROM users
      WHERE role = 'admin'
        AND COALESCE(is_banned, false) = false
        AND COALESCE(status, 'active') = 'active'
      ORDER BY created_at ASC
    `,
    []
  )

  for (const admin of admins) {
    await createAppNotificationInternal({
      ...input,
      userId: admin.id,
      audience: 'admin'
    })
  }

  return { success: true, notifiedCount: admins.length }
}
