"use server"

import { sql } from "@/lib/db"
import {
  createAppNotificationInternal,
  createNotificationInternal,
  notifyAdminsInternal,
  type AdminNotificationInput,
  type AppNotificationInput,
  type NotificationPriority
} from '@/lib/notification-service'
import { requireAdmin, requireCurrentUser, requireSameUserOrAdmin } from "@/lib/server-auth"

export type {
  AdminNotificationInput,
  AppNotificationInput,
  NotificationAudience,
  NotificationPriority
} from '@/lib/notification-service'

export type InternalBroadcastInput = {
  title: string
  description: string
  link?: string
  priority?: NotificationPriority
}

export async function getUserNotifications(userId: string) {
  await requireSameUserOrAdmin(userId)
  const notifications = await sql.query(
    `
    SELECT * FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  )

  return notifications || []
}

export async function markNotificationAsRead(notificationId: string) {
  const currentUser = await requireCurrentUser()
  const notifications = currentUser.role === 'admin'
    ? await sql.query(
        `UPDATE notifications
         SET read = true,
             read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE id = $1
         RETURNING id`,
        [notificationId]
      )
    : await sql.query(
        `UPDATE notifications
         SET read = true,
             read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [notificationId, currentUser.id]
      )

  return { success: notifications.length > 0 }
}

export async function createAppNotification(input: AppNotificationInput) {
  await requireAdmin()
  return createAppNotificationInternal(input)
}

export async function createNotification({ userId, type, title, description, link }: {
  userId: string;
  type: string;
  title: string;
  description?: string;
  link?: string;
}) {
  await requireAdmin()
  return createNotificationInternal({
    userId,
    type,
    title,
    description,
    link
  })
}

export async function notifyAdmins(input: AdminNotificationInput) {
  await requireAdmin()
  return notifyAdminsInternal(input)
}

const MEMBER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_SELECTED_MEMBERS = 500

function normalizeInternalMessage(input: InternalBroadcastInput) {
  const title = input.title.trim().slice(0, 180)
  const description = input.description.trim().slice(0, 2000)
  const priority: NotificationPriority = input.priority || 'normal'

  if (title.length < 3) {
    throw new Error('Titre requis')
  }

  if (description.length < 8) {
    throw new Error('Message requis')
  }

  return { title, description, priority }
}

export async function sendInternalMessageToAllUsers(input: InternalBroadcastInput) {
  const admin = await requireAdmin()
  const message = normalizeInternalMessage(input)

  const recipients = await sql.query<{ id: string }[]>(
    `
      SELECT u.id
      FROM users u
      WHERE COALESCE(u.status, 'active') = 'active'
        AND COALESCE(u.is_banned, false) = false
        AND u.id != $1
      ORDER BY u.created_at ASC
    `,
    [admin.id]
  )

  return deliverInternalMessage(admin.id, recipients, message)
}

/**
 * Same in-app delivery as the general broadcast, limited to members the
 * administrator selected. No e-mail is sent.
 */
export async function sendInternalMessageToMembers(
  input: InternalBroadcastInput & { userIds: string[] }
) {
  const admin = await requireAdmin()
  const message = normalizeInternalMessage(input)
  const userIds = Array.from(new Set(Array.isArray(input.userIds) ? input.userIds : []))

  if (
    userIds.length === 0 ||
    userIds.length > MAX_SELECTED_MEMBERS ||
    userIds.some(id => typeof id !== 'string' || !MEMBER_ID_PATTERN.test(id))
  ) {
    throw new Error(`Sélection invalide : de 1 à ${MAX_SELECTED_MEMBERS} membres`)
  }

  const recipients = await sql.query<{ id: string }[]>(
    `
      SELECT u.id
      FROM users u
      WHERE u.id = ANY($2::uuid[])
        AND COALESCE(u.status, 'active') = 'active'
        AND COALESCE(u.is_banned, false) = false
        AND u.id != $1
      ORDER BY u.created_at ASC
    `,
    [admin.id, userIds]
  )

  const result = await deliverInternalMessage(admin.id, recipients, message)
  return {
    ...result,
    requestedCount: userIds.length,
    skippedCount: userIds.length - recipients.length
  }
}

async function deliverInternalMessage(
  adminId: string,
  recipients: { id: string }[],
  { title, description, priority }: { title: string; description: string; priority: NotificationPriority }
) {
  const admin = { id: adminId }
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

    await createAppNotificationInternal({
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
