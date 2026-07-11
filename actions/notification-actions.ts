"use server"

import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/server-auth"

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

export type InternalBroadcastInput = {
  title: string
  description: string
  link?: string
  priority?: NotificationPriority
}

export type SelectedInternalMessageInput = InternalBroadcastInput & {
  userIds: string[]
}

export async function getUserNotifications(userId: string) {
  const notifications = await sql`
    SELECT * FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `

  return notifications || []
}

export async function markNotificationAsRead(notificationId: string) {
  await sql`
    UPDATE notifications
    SET read = true,
        read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    WHERE id = ${notificationId}
  `

  return { success: true }
}

export async function createAppNotification(input: AppNotificationInput) {
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

export async function createNotification({ userId, type, title, description, link }: {
  userId: string;
  type: string;
  title: string;
  description?: string;
  link?: string;
}) {
  return createAppNotification({
    userId,
    type,
    title,
    description,
    link,
    category: type
  })
}

export async function notifyAdmins(input: AdminNotificationInput) {
  await requireAdmin()

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
    await createAppNotification({
      ...input,
      userId: admin.id,
      audience: 'admin'
    })
  }

  return { success: true, notifiedCount: admins.length }
}

async function sendInternalMessage(
  input: InternalBroadcastInput,
  selectedUserIds?: string[]
) {
  const admin = await requireAdmin()
  const title = input.title.trim().slice(0, 180)
  const description = input.description.trim().slice(0, 2000)
  const priority = input.priority || 'normal'

  if (title.length < 3) {
    throw new Error('Titre requis')
  }

  if (description.length < 8) {
    throw new Error('Message requis')
  }

  const userIds = selectedUserIds
    ? [...new Set(selectedUserIds.filter(Boolean))].slice(0, 100)
    : null

  if (selectedUserIds && !userIds?.length) {
    throw new Error('Sélection de membres requise')
  }

  const recipients = await sql.query<{ id: string }[]>(
    userIds
      ? `
      SELECT u.id
      FROM users u
      WHERE COALESCE(u.status, 'active') = 'active'
        AND COALESCE(u.is_banned, false) = false
        AND u.id != $1
        AND u.id = ANY($2::uuid[])
      ORDER BY u.created_at ASC
    `
      : `
      SELECT u.id
      FROM users u
      WHERE COALESCE(u.status, 'active') = 'active'
        AND COALESCE(u.is_banned, false) = false
        AND u.id != $1
      ORDER BY u.created_at ASC
    `,
    userIds ? [admin.id, userIds] : [admin.id]
  )

  let messageCount = 0
  let notificationCount = 0
  let createdConversationCount = 0

  for (const recipient of recipients) {
    const existingConversationRows = await sql.query<{ id: string }[]>(
      `
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp_admin
          ON cp_admin.conversation_id = c.id
         AND cp_admin.user_id = $1
        JOIN conversation_participants cp_user
          ON cp_user.conversation_id = c.id
         AND cp_user.user_id = $2
        LIMIT 1
      `,
      [admin.id, recipient.id]
    )

    let conversationId = existingConversationRows[0]?.id

    if (!conversationId) {
      const [conversation] = await sql.query<{ id: string }[]>(
        `INSERT INTO conversations DEFAULT VALUES RETURNING id`,
        []
      )
      conversationId = conversation.id
      createdConversationCount += 1

      await sql.query(
        `
          INSERT INTO conversation_participants (conversation_id, user_id)
          VALUES ($1, $2), ($1, $3)
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [conversationId, admin.id, recipient.id]
      )
    }

    await sql.query(
      `
        INSERT INTO messages (conversation_id, sender_id, content, is_read)
        VALUES ($1, $2, $3, false)
        RETURNING id
      `,
      [conversationId, admin.id, description]
    )
    messageCount += 1

    await sql.query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId]
    )

    await createAppNotification({
      userId: recipient.id,
      type: 'admin_broadcast',
      title,
      description,
      link: `/messages/${conversationId}`,
      priority,
      category: 'admin_broadcast',
      audience: 'user',
      metadata: {
        source: 'admin_internal_message',
        adminId: admin.id,
        conversationId
      },
      createdBy: admin.id
    })
    notificationCount += 1
  }

  return {
    success: true,
    sentCount: notificationCount,
    messageCount,
    recipientCount: recipients.length,
    createdConversationCount
  }
}

export async function sendInternalMessageToAllUsers(input: InternalBroadcastInput) {
  return sendInternalMessage(input)
}

export async function sendInternalMessageToSelectedUsers(
  input: SelectedInternalMessageInput
) {
  return sendInternalMessage(input, input.userIds)
}
