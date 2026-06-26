"use server"

import { sql } from "@/lib/db"
import { log } from "../utils/logger"
import { createNotification } from "@/actions/notification-actions"
import { messageSchema, getMessagesSchema, createConversationSchema, validateSchema, type MessageAttachmentInput } from "@/lib/validation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

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
        cp.user_id AS participant_user_id
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
    ),
    valid_conversations AS (
      SELECT DISTINCT uc.id, uc.created_at, uc.updated_at
      FROM user_conversations uc
      JOIN conversation_participants cp_other ON uc.id = cp_other.conversation_id AND cp_other.user_id != $1
      JOIN users viewer_user ON viewer_user.id = $1
      JOIN users other_user ON other_user.id = cp_other.user_id
      LEFT JOIN user_matches um ON
        ((um.user_id_1 = $1 AND um.user_id_2 = cp_other.user_id) OR
         (um.user_id_1 = cp_other.user_id AND um.user_id_2 = $1))
        AND um.status = 'accepted'
      WHERE um.id IS NOT NULL
        OR viewer_user.role = 'admin'
        OR other_user.role = 'admin'
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
      lm.content as last_message,
      lm.created_at as last_message_date,
      lm.sender_id as last_message_sender_id,
      cu.user_id as other_user_id,
      cu.name as other_user_name,
      cu.avatar as other_user_avatar
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
      AND m.created_at > $2::timestamptz
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

  const updatedRows = await sql.query(
    `UPDATE messages
     SET is_read = true, updated_at = CURRENT_TIMESTAMP
     WHERE conversation_id = $1
       AND sender_id != $2
       AND COALESCE(is_read, false) = false
     RETURNING id`,
    [conversationId, targetUserId]
  )

  return { updatedCount: updatedRows.length }
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
    `SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = $1 AND cp.user_id = $2`,
    [conversationId, senderId]
  )
  const [participant] = participantRows

  if (!participant) {
  log('warn', 'Access denied sending message', { conversationId, senderId })
  throw new Error('Access denied: You are not a participant in this conversation')
  }

  const recipients = await sql.query(
    `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
    [conversationId, senderId]
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

  if (acceptedMatchRows.length === 0 && adminParticipantRows.length === 0) {
    log('warn', 'Message blocked without accepted match', { conversationId, senderId })
    throw new Error('La messagerie nécessite un match accepté avant échange.')
  }

  // Insert the new message
  const [newMessage] = await sql.query(
    `INSERT INTO messages (conversation_id, sender_id, content, is_read) VALUES ($1, $2, $3, false) RETURNING *;`,
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

  // Notify all recipients except the sender
  for (const recipient of recipients) {
    await createNotification({
      userId: recipient.user_id,
      type: 'new_message',
      title: 'Nouveau message',
      description: 'Vous avez reçu un nouveau message.',
      link: `/messages/${conversationId}`,
    })
  }

  return { ...newMessage, attachments: savedAttachments };
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
  // Check if a conversation already exists between the two users
  const existingRows = await sql.query(
    `SELECT c.id FROM conversations c JOIN conversation_participants cp1 ON c.id = cp1.conversation_id JOIN conversation_participants cp2 ON c.id = cp2.conversation_id WHERE (cp1.user_id = $1 AND cp2.user_id = $2) OR (cp1.user_id = $2 AND cp2.user_id = $1);`,
    [userId1, userId2]
  )
  const [existingConversation] = existingRows

  if (existingConversation) {
    return existingConversation.id;
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
  let dateTrunc;
  if (scale === "day") {
    dateTrunc = "TO_CHAR(DATE(created_at), 'YYYY-MM-DD')";
  } else if (scale === "week") {
    dateTrunc = "TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')";
  } else {
    dateTrunc = "TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM-DD')";
  }
  const query = `
    SELECT ${dateTrunc} as period, COUNT(*) as count
    FROM messages
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY period
    ORDER BY period ASC
  `;
  const stats = await sql.query(query, [startDate, endDate]);
  return stats;
}
