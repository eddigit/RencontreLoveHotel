"use server"

import { sql } from "@/lib/db"
import { log } from "../utils/logger"
import { createNotification } from "@/actions/notification-actions"

export async function getUserConversations(userId: string) {
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
      SELECT uc.id, uc.created_at, uc.updated_at
      FROM user_conversations uc
      JOIN conversation_participants cp_other ON uc.id = cp_other.conversation_id AND cp_other.user_id != $1
      JOIN user_matches um ON
        ((um.user_id_1 = $1 AND um.user_id_2 = cp_other.user_id) OR
         (um.user_id_1 = cp_other.user_id AND um.user_id_2 = $1))
        AND um.status = 'accepted'
    ),
    last_messages AS (
      SELECT
        m.conversation_id,
        m.content,
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

  const conversations = await sql.query(query, [userId])
  return conversations || []
}

export async function getConversationMessages(conversationId: string, userId?: string) {
  // First, verify that the user is a participant in this conversation
  if (userId) {
    const participants = await sql.query(
      `SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = $1 AND cp.user_id = $2`,
      [conversationId, userId]
    )
    const [participant] = participants

    if (!participant) {
  // Log details to help debugging (conversationId and userId)
  log('warn', 'Access denied reading conversation', { conversationId, userId })
  throw new Error('Access denied: You are not a participant in this conversation')
    }
  }

  const messages = await sql.query(
    `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.conversation_id = $1 ORDER BY m.created_at ASC`,
    [conversationId]
  )

  return messages || []
}

export async function sendMessage({ conversationId, senderId, content }: {
  conversationId: string;
  senderId: string;
  content: string;
}) {
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

  // Insert the new message
  const [newMessage] = await sql.query(
    `INSERT INTO messages (conversation_id, sender_id, content, read) VALUES ($1, $2, $3, false) RETURNING *;`,
    [conversationId, senderId, content]
  )

  // Update the conversation's updated_at timestamp
  await sql.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;`, [conversationId])

  // Notify all recipients except the sender
  const recipients = await sql.query(
    `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
    [conversationId, senderId]
  )
  for (const recipient of recipients) {
    await createNotification({
      userId: recipient.user_id,
      type: 'new_message',
      title: 'Nouveau message',
      description: 'Vous avez reçu un nouveau message.',
      link: `/messages/${conversationId}`,
    })
  }

  return newMessage;
}

export async function findOrCreateConversation(userId1: string, userId2: string) {
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
