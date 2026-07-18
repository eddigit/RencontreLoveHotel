"use server"

import { sql } from "@/lib/db"
import { log } from "../utils/logger"
import { createNotificationRecord as createNotification } from '@/lib/notification-service'
import { messageSchema, getMessagesSchema, createConversationSchema, validateSchema, type MessageAttachmentInput } from "@/lib/validation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { requireAdmin } from '@/lib/server-auth'
import { assertUsersCanInteract } from '@/lib/member-safety'
import { sendMemberActivityEmail } from '@/lib/member-activity-email'
import { trackProductEvents, type ProductEventInput } from '@/lib/product-events'
import {
  createModerationCase,
  evaluateMessageModeration
} from '@/lib/moderation-case-service'
import { enforceMemberContent } from '@/lib/content-safety-service'

// Helper pour vérifier l'authentification
async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Authentification requise')
  }
  return session.user
}

export async function getUserConversations(userId?: string) {
  // Vérifier l'authentification
  const currentUser = await requireAuth()
  
  // Utiliser l'ID de l'utilisateur connecté si non fourni
  const targetUserId = userId || currentUser.id
  
  // Vérifier que l'utilisateur ne peut accéder qu'à ses propres conversations
  if (targetUserId !== currentUser.id && currentUser.role !== 'admin') {
    log('warn', 'Tentative d\'accès aux conversations d\'un autre utilisateur', { 
      currentUserId: currentUser.id, 
      targetUserId 
    })
    throw new Error('Accès non autorisé aux conversations')
  }
  const query = `
    WITH user_conversations AS (
      SELECT
        c.id,
        c.created_at,
        c.updated_at,
        c.access_mode,
        cp.user_id AS participant_user_id
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
    ),
    valid_conversations AS (
      SELECT DISTINCT
        uc.id,
        uc.created_at,
        uc.updated_at,
        uc.access_mode,
        (
          uc.access_mode = 'admin'
          OR (
            uc.access_mode = 'legacy_import'
            AND EXISTS (SELECT 1 FROM messages history_message WHERE history_message.conversation_id = uc.id)
          )
          OR um.id IS NOT NULL
          OR viewer_user.role = 'admin'
          OR other_user.role = 'admin'
        ) AS has_message_access
      FROM user_conversations uc
      JOIN conversation_participants cp_other ON uc.id = cp_other.conversation_id AND cp_other.user_id != $1
      JOIN users viewer_user ON viewer_user.id = $1
      JOIN users other_user ON other_user.id = cp_other.user_id
      LEFT JOIN user_matches um ON
        ((um.user_id_1 = $1 AND um.user_id_2 = cp_other.user_id) OR
         (um.user_id_1 = cp_other.user_id AND um.user_id_2 = $1))
        AND um.status = 'accepted'
      WHERE uc.access_mode IN ('legacy_import', 'admin')
        OR um.id IS NOT NULL
        OR viewer_user.role = 'admin'
        OR other_user.role = 'admin'
        OR EXISTS (
          SELECT 1
          FROM messages preserved_history
          WHERE preserved_history.conversation_id = uc.id
        )
        OR EXISTS (
          SELECT 1
          FROM user_blocks blocked_relationship
          WHERE (blocked_relationship.blocker_id = $1 AND blocked_relationship.blocked_id = cp_other.user_id)
             OR (blocked_relationship.blocker_id = cp_other.user_id AND blocked_relationship.blocked_id = $1)
        )
    ),
    last_messages AS (
      SELECT
        m.conversation_id,
        CASE
          WHEN NULLIF(TRIM(m.content), '') IS NOT NULL THEN m.content
          WHEN EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id AND ma.media_type = 'audio') THEN 'Message vocal'
          WHEN EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id AND ma.media_type = 'video') THEN 'Video partagee'
          WHEN EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = m.id AND ma.media_type = 'image') THEN 'Image partagee'
          ELSE m.content
        END as content,
        m.created_at,
        m.sender_id,
        ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) as rn
      FROM messages m
      JOIN valid_conversations vc ON m.conversation_id = vc.id
    ),
    conversation_users AS (
      SELECT
        cp.conversation_id,
        u.id as user_id,
        u.name,
        u.avatar
      FROM conversation_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.user_id != $1
        AND cp.conversation_id IN (SELECT id FROM valid_conversations)
    )
    SELECT
      vc.id,
      vc.created_at,
      vc.updated_at,
      vc.access_mode,
      lm.content as last_message,
      lm.created_at as last_message_date,
      lm.sender_id as last_message_sender_id,
      cu.user_id as other_user_id,
      cu.name as other_user_name,
      cu.avatar as other_user_avatar,
      (
        SELECT COUNT(*)
        FROM messages unread_messages
        WHERE unread_messages.conversation_id = vc.id
          AND unread_messages.sender_id != $1
          AND COALESCE(unread_messages.is_read, false) = false
      )::int AS unread_count
      ,EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE ub.blocker_id = $1 AND ub.blocked_id = cu.user_id
      ) AS blocked_by_me
      ,EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE ub.blocker_id = cu.user_id AND ub.blocked_id = $1
      ) AS blocked_me
      ,(
        vc.has_message_access
        AND NOT EXISTS (
          SELECT 1
          FROM user_blocks ub
          WHERE (ub.blocker_id = $1 AND ub.blocked_id = cu.user_id)
             OR (ub.blocker_id = cu.user_id AND ub.blocked_id = $1)
        )
      ) AS can_interact
    FROM valid_conversations vc
    LEFT JOIN last_messages lm ON vc.id = lm.conversation_id AND lm.rn = 1
    LEFT JOIN conversation_users cu ON vc.id = cu.conversation_id
    ORDER BY lm.created_at DESC NULLS LAST
  `

  const conversations = await sql.query(query, [targetUserId])
  return conversations || []
}

export async function getConversationMessages(conversationId: string, userId?: string) {
  // Validation des paramètres
  const validation = validateSchema(getMessagesSchema, { conversationId, userId })
  if (!validation.success) {
    throw new Error(`Paramètres invalides: ${validation.errors?.join(', ')}`)
  }

  // Vérifier l'authentification
  const currentUser = await requireAuth()
  
  // Utiliser l'ID de l'utilisateur connecté si non fourni
  const targetUserId = userId || currentUser.id

  // Vérifier que l'utilisateur ne peut accéder qu'à ses propres messages
  if (targetUserId !== currentUser.id && currentUser.role !== 'admin') {
    log('warn', 'Tentative d\'accès aux messages d\'un autre utilisateur', { 
      currentUserId: currentUser.id, 
      targetUserId 
    })
    throw new Error('Accès non autorisé aux messages')
  }

  // Vérifier que l'utilisateur est participant de cette conversation
  const participants = await sql.query(
    `SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = $1 AND cp.user_id = $2`,
    [conversationId, targetUserId]
  )
  const [participant] = participants

  if (!participant) {
    log('warn', 'Access denied reading conversation', { conversationId, userId: targetUserId })
    throw new Error('Access denied: You are not a participant in this conversation')
  }

  const messages = await sql.query(
    `SELECT m.*,
      u.name as sender_name,
      u.avatar as sender_avatar,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ma.id,
            'url', ma.url,
            'media_type', ma.media_type,
            'file_name', ma.file_name,
            'mime_type', ma.mime_type,
            'size_bytes', ma.size_bytes,
            'duration_seconds', ma.duration_seconds,
            'width', ma.width,
            'height', ma.height
          )
          ORDER BY ma.sort_order, ma.created_at
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
      ) as attachments
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN message_attachments ma ON ma.message_id = m.id
    WHERE m.conversation_id = $1
    GROUP BY m.id, u.name, u.avatar
    ORDER BY m.created_at ASC`,
    [conversationId]
  )

  return messages || []
}

export async function getConversationMessagesAfter(conversationId: string, after: string, userId?: string) {
  const validation = validateSchema(getMessagesSchema, { conversationId, userId })
  if (!validation.success) {
    throw new Error(`Paramètres invalides: ${validation.errors?.join(', ')}`)
  }

  const afterDate = new Date(after)
  if (Number.isNaN(afterDate.getTime())) {
    throw new Error('Paramètre after invalide')
  }

  const currentUser = await requireAuth()
  const targetUserId = userId || currentUser.id

  if (targetUserId !== currentUser.id && currentUser.role !== 'admin') {
    log('warn', 'Tentative d’accès aux nouveaux messages d’un autre utilisateur', {
      currentUserId: currentUser.id,
      targetUserId
    })
    throw new Error('Accès non autorisé aux messages')
  }

  const participants = await sql.query(
    `SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = $1 AND cp.user_id = $2`,
    [conversationId, targetUserId]
  )
  const [participant] = participants

  if (!participant) {
    log('warn', 'Access denied polling conversation', { conversationId, userId: targetUserId })
    throw new Error('Access denied: You are not a participant in this conversation')
  }

  const messages = await sql.query(
    `SELECT m.*,
      u.name as sender_name,
      u.avatar as sender_avatar,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ma.id,
            'url', ma.url,
            'media_type', ma.media_type,
            'file_name', ma.file_name,
            'mime_type', ma.mime_type,
            'size_bytes', ma.size_bytes,
            'duration_seconds', ma.duration_seconds,
            'width', ma.width,
            'height', ma.height
          )
          ORDER BY ma.sort_order, ma.created_at
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
      ) as attachments
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN message_attachments ma ON ma.message_id = m.id
    WHERE m.conversation_id = $1
      AND (
        m.created_at > $2::timestamptz
        OR m.updated_at > $2::timestamptz
      )
    GROUP BY m.id, u.name, u.avatar
    ORDER BY m.created_at ASC`,
    [conversationId, afterDate.toISOString()]
  )

  return messages || []
}

export async function markConversationMessagesAsRead(conversationId: string, userId?: string) {
  const validation = validateSchema(getMessagesSchema, { conversationId, userId })
  if (!validation.success) {
    throw new Error(`Paramètres invalides: ${validation.errors?.join(', ')}`)
  }

  const currentUser = await requireAuth()
  const targetUserId = userId || currentUser.id

  if (targetUserId !== currentUser.id && currentUser.role !== 'admin') {
    log('warn', 'Tentative de marquage des messages d’un autre utilisateur', {
      currentUserId: currentUser.id,
      targetUserId
    })
    throw new Error('Accès non autorisé aux messages')
  }

  const participants = await sql.query(
    `SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = $1 AND cp.user_id = $2`,
    [conversationId, targetUserId]
  )
  const [participant] = participants

  if (!participant) {
    log('warn', 'Access denied marking conversation read', { conversationId, userId: targetUserId })
    throw new Error('Access denied: You are not a participant in this conversation')
  }

  const [updated] = await sql.query<{
    updated_message_count: string | number
    updated_notification_count: string | number
  }[]>(
    `WITH updated_messages AS (
       UPDATE messages
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1
         AND sender_id != $2
         AND COALESCE(is_read, false) = false
       RETURNING id
     ), updated_notifications AS (
       UPDATE notifications
       SET read = true,
           read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE user_id = $2
         AND COALESCE(read, false) = false
         AND type = 'new_message'
         AND (
           link = '/messages/' || $1::text
           OR metadata->>'conversationId' = $1::text
         )
       RETURNING id
     )
     SELECT
       (SELECT COUNT(*) FROM updated_messages) AS updated_message_count,
       (SELECT COUNT(*) FROM updated_notifications) AS updated_notification_count`,
    [conversationId, targetUserId]
  )

  return {
    updatedCount: Number(updated?.updated_message_count || 0),
    updatedNotificationCount: Number(updated?.updated_notification_count || 0)
  }
}

export async function sendMessage({ conversationId, senderId, content, attachments }: {
  conversationId: string;
  senderId: string;
  content?: string;
  attachments?: MessageAttachmentInput[];
}) {
  // Validation des paramètres
  const validation = validateSchema(messageSchema, { conversationId, senderId, content, attachments })
  if (!validation.success) {
    throw new Error(`Paramètres invalides: ${validation.errors?.join(', ')}`)
  }
  const messageContent = (validation.data?.content || '').trim()
  const messageAttachments = validation.data?.attachments || []

  // Vérifier l'authentification
  const currentUser = await requireAuth()
  
  // Vérifier que l'utilisateur ne peut envoyer des messages qu'en son nom
  if (senderId !== currentUser.id && currentUser.role !== 'admin') {
    log('warn', 'Tentative d\'envoi de message au nom d\'un autre utilisateur', { 
      currentUserId: currentUser.id, 
      senderId 
    })
    throw new Error('Vous ne pouvez envoyer des messages qu\'en votre nom')
  }
  // Verify that the sender is a participant in this conversation
  const participantRows = await sql.query(
    `SELECT u.messaging_restricted_until
     FROM conversation_participants cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.conversation_id = $1 AND cp.user_id = $2`,
    [conversationId, senderId]
  )
  const [participant] = participantRows

  if (!participant) {
    log('warn', 'Access denied sending message', { conversationId, senderId })
    throw new Error('Access denied: You are not a participant in this conversation')
  }

  if (
    participant.messaging_restricted_until &&
    new Date(participant.messaging_restricted_until).getTime() > Date.now()
  ) {
    throw new Error('Votre messagerie est temporairement restreinte. Vous pouvez contester cette mesure depuis votre espace recours.')
  }

  const recipients = await sql.query(
    `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
    [conversationId, senderId]
  )

  for (const recipient of recipients) {
    await assertUsersCanInteract(senderId, recipient.user_id)
  }

  const [conversationAccess] = await sql.query(
    `SELECT c.access_mode,
            EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id) AS has_history
     FROM conversations c
     WHERE c.id = $1`,
    [conversationId]
  )

  const recipientIds = recipients.map((recipient: any) => recipient.user_id)
  const acceptedMatchRows = recipientIds.length > 0
    ? await sql.query(
        `SELECT 1 FROM user_matches
         WHERE status = 'accepted'
           AND (
             (user_id_1 = $1 AND user_id_2 = ANY($2::uuid[]))
             OR
             (user_id_2 = $1 AND user_id_1 = ANY($2::uuid[]))
           )
         LIMIT 1`,
        [senderId, recipientIds]
      )
    : []

  const adminParticipantRows = acceptedMatchRows.length === 0
    ? await sql.query(
        `SELECT 1
         FROM conversation_participants cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.conversation_id = $1
           AND u.role = 'admin'
         LIMIT 1`,
        [conversationId]
      )
    : []

  const legacyHistoryAllowed =
    conversationAccess?.access_mode === 'legacy_import' &&
    conversationAccess?.has_history === true
  const adminConversationAllowed = conversationAccess?.access_mode === 'admin'

  if (
    !legacyHistoryAllowed &&
    !adminConversationAllowed &&
    acceptedMatchRows.length === 0 &&
    adminParticipantRows.length === 0
  ) {
    log('warn', 'Message blocked without accepted match', { conversationId, senderId })
    throw new Error('La messagerie nécessite un match accepté avant échange.')
  }

  if (messageContent) {
    await enforceMemberContent({
      actorUserId: senderId,
      surface: 'message',
      content: messageContent
    })
  }

  const moderation = await evaluateMessageModeration({
    senderId,
    content: messageContent
  })

  if (moderation.outcome === 'hold' || moderation.outcome === 'restrict') {
    const moderationCase = await createModerationCase({
      conversationId,
      senderId,
      content: messageContent,
      evaluation: moderation
    })
    if (moderation.outcome === 'restrict') {
      await sql.query(
        `UPDATE users
         SET messaging_restricted_until = NOW() + INTERVAL '24 hours', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [senderId]
      )
    }
    return {
      delivery_status: 'held' as const,
      moderation_outcome: moderation.outcome,
      case_id: moderationCase.id,
      reason: 'Ce message attend un réexamen humain au titre de la charte de sécurité.'
    }
  }

  // Insert the new message
  const [newMessage] = await sql.query(
    `WITH message_state AS (
       SELECT
         COUNT(*)::int AS prior_message_count,
         COUNT(DISTINCT sender_id)::int AS prior_sender_count,
         BOOL_OR(sender_id = $2) AS sender_had_messages
       FROM messages
       WHERE conversation_id = $1
     ), inserted_message AS (
       INSERT INTO messages (conversation_id, sender_id, content, is_read)
       VALUES ($1, $2, $3, false)
       RETURNING *
     )
     SELECT inserted_message.*, message_state.prior_message_count,
       message_state.prior_sender_count, COALESCE(message_state.sender_had_messages, false) AS sender_had_messages
     FROM inserted_message CROSS JOIN message_state;`,
    [conversationId, senderId, messageContent]
  )

  const savedAttachments = []
  for (const [index, attachment] of messageAttachments.entries()) {
    const [savedAttachment] = await sql.query(
      `INSERT INTO message_attachments
        (message_id, url, media_type, file_name, mime_type, size_bytes, duration_seconds, width, height, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *;`,
      [
        newMessage.id,
        attachment.url,
        attachment.mediaType,
        attachment.fileName || null,
        attachment.mimeType,
        attachment.sizeBytes,
        attachment.durationSeconds || null,
        attachment.width || null,
        attachment.height || null,
        index
      ]
    )
    savedAttachments.push(savedAttachment)
  }

  // Update the conversation's updated_at timestamp
  await sql.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;`, [conversationId])

  const activationEvents: ProductEventInput[] = [{
    eventName: 'message_sent' as const,
    userId: senderId,
    metadata: {
      surface: 'conversation',
      media_type: messageAttachments[0]?.mediaType || 'text'
    }
  }]
  if (Number(newMessage.prior_message_count || 0) === 0) {
    activationEvents.push({
      eventName: 'conversation_started',
      userId: senderId,
      metadata: { surface: 'conversation', media_type: messageAttachments[0]?.mediaType || 'text' }
    })
  }
  if (Number(newMessage.prior_message_count || 0) > 0 && !newMessage.sender_had_messages) {
    activationEvents.push({
      eventName: 'message_replied',
      userId: senderId,
      metadata: { surface: 'conversation', media_type: messageAttachments[0]?.mediaType || 'text' }
    })
  }
  await trackProductEvents(activationEvents)

  let moderationCaseId: string | null = null
  if (moderation.shouldCreateCase) {
    const moderationCase = await createModerationCase({
      conversationId,
      senderId,
      content: messageContent,
      sourceId: newMessage.id,
      evaluation: moderation
    })
    moderationCaseId = moderationCase.id
  }

  // Notify all recipients except the sender
  for (const recipient of recipients) {
    await createNotification({
      userId: recipient.user_id,
      type: 'new_message',
      title: 'Nouveau message',
      description: 'Vous avez reçu un nouveau message.',
      link: `/messages/${conversationId}`,
    })
    await sendMemberActivityEmail({
      recipientUserId: recipient.user_id,
      category: 'messages',
      subject: 'Vous avez reçu un nouveau message',
      title: `Nouveau message de ${currentUser.name || 'un membre'}`,
      description: `${currentUser.name || 'Un membre'} vous a envoyé un nouveau message privé.`,
      ctaLabel: 'Ouvrir la conversation',
      ctaPath: `/messages/${conversationId}`
    })
  }

  return {
    ...newMessage,
    attachments: savedAttachments,
    delivery_status: 'delivered' as const,
    moderation_outcome: moderation.outcome,
    case_id: moderationCaseId
  };
}

export async function updateOwnMessage(input: {
  messageId: string
  conversationId: string
  content: string
}) {
  const currentUser = await requireAuth()
  const content = input.content.trim()

  if (!content) {
    throw new Error('Le message ne peut pas être vide')
  }
  if (content.length > 1000) {
    throw new Error('Le message ne peut pas dépasser 1000 caractères')
  }

  const [updatedMessage] = await sql.query(
    `UPDATE messages
     SET content = $3,
         edited_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND conversation_id = $2
       AND sender_id = $4
       AND deleted_at IS NULL
     RETURNING *`,
    [input.messageId, input.conversationId, content, currentUser.id]
  )

  if (!updatedMessage) {
    throw new Error('Vous ne pouvez modifier que votre propre message')
  }

  return updatedMessage
}

export async function deleteOwnMessage(input: {
  messageId: string
  conversationId: string
}) {
  const currentUser = await requireAuth()
  const [deletedMessage] = await sql.query(
    `WITH deleted_message AS (
       UPDATE messages
       SET content = 'Message supprimé',
           deleted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND conversation_id = $2
         AND sender_id = $3
         AND deleted_at IS NULL
       RETURNING *
     ), deleted_attachments AS (
       DELETE FROM message_attachments
       WHERE message_id IN (SELECT id FROM deleted_message)
       RETURNING id
     )
     SELECT deleted_message.*, '[]'::json AS attachments
     FROM deleted_message`,
    [input.messageId, input.conversationId, currentUser.id]
  )

  if (!deletedMessage) {
    throw new Error('Vous ne pouvez supprimer que votre propre message')
  }

  return deletedMessage
}

export async function findOrCreateConversation(userId1: string, userId2: string) {
  // Validation des paramètres
  const validation = validateSchema(createConversationSchema, { userId1, userId2 })
  if (!validation.success) {
    throw new Error(`Paramètres invalides: ${validation.errors?.join(', ')}`)
  }

  // Vérifier l'authentification
  const currentUser = await requireAuth()
  
  // Vérifier que l'utilisateur ne peut créer des conversations qu'avec lui-même comme participant
  if (userId1 !== currentUser.id && userId2 !== currentUser.id && currentUser.role !== 'admin') {
    log('warn', 'Tentative de création de conversation sans être participant', { 
      currentUserId: currentUser.id, 
      userId1,
      userId2 
    })
    throw new Error('Vous devez être participant de la conversation que vous créez')
  }

  await assertUsersCanInteract(userId1, userId2)

  // Check if a conversation already exists between the two users
  const existingRows = await sql.query(
    `SELECT c.id FROM conversations c JOIN conversation_participants cp1 ON c.id = cp1.conversation_id JOIN conversation_participants cp2 ON c.id = cp2.conversation_id WHERE (cp1.user_id = $1 AND cp2.user_id = $2) OR (cp1.user_id = $2 AND cp2.user_id = $1);`,
    [userId1, userId2]
  )
  const [existingConversation] = existingRows

  if (existingConversation) {
    return existingConversation.id;
  }

  const acceptedMatchRows = await sql.query(
    `SELECT 1
     FROM user_matches
     WHERE status = 'accepted'
       AND ((user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1))
     LIMIT 1`,
    [userId1, userId2]
  )

  if (acceptedMatchRows.length === 0 && currentUser.role !== 'admin') {
    throw new Error('La messagerie nécessite un match accepté avant une nouvelle conversation.')
  }

  // If not, create a new conversation
  const [newConversation] = await sql.query(`INSERT INTO conversations DEFAULT VALUES RETURNING id;`)

  // Add participants to the new conversation
  await sql.query(
    `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3);`,
    [newConversation.id, userId1, userId2]
  )

  return newConversation.id;
}

// Get messages sent grouped by day/week/month
export async function getMessagesStats({ startDate, endDate, scale }: { startDate: string, endDate: string, scale: "day"|"week"|"month" }) {
  await requireAdmin()

  const unit = scale === 'month' ? 'month' : scale === 'week' ? 'week' : 'day'
  const dateTrunc = `TO_CHAR(DATE_TRUNC('${unit}', created_at AT TIME ZONE 'Europe/Paris'), 'YYYY-MM-DD')`
  const query = `
    SELECT ${dateTrunc} as period, COUNT(*) as count
    FROM messages
    WHERE created_at >= ($1::date AT TIME ZONE 'Europe/Paris')
      AND created_at < (($2::date + INTERVAL '1 day') AT TIME ZONE 'Europe/Paris')
    GROUP BY period
    ORDER BY period ASC
  `;
  const stats = await sql.query(query, [startDate, endDate]);
  return stats;
}
