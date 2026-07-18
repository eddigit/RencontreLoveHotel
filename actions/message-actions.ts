'use server'

import { executeQuery } from '@/lib/db'; // Correctly import executeQuery
import { requireAdmin } from '@/lib/server-auth';

// --- Database types (adjust based on your actual schema and where you define types) ---
export type MessageFromDB = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  sender_name: string; // From JOIN with user_profiles
  sender_email: string; // From JOIN with users
};

export type ConversationProtagonist = {
  user_id: string;
  name: string; // From user_profiles
  email: string; // From users
  avatar?: string | null;
};

export type ModerationMessage = MessageFromDB & {
  protagonists: ConversationProtagonist[];
};

export type AdminConversation = {
  id: string
  updatedAt: Date
  lastMessageAt: Date | null
  lastMessage: string
  messageCount: number
  participants: Array<{ userId: string; name: string; email: string; avatar: string | null }>
}

export async function getAdminConversations({ page = 1, limit = 50, keywords = [] }: {
  page?: number; limit?: number; keywords?: string[]
} = {}): Promise<{ conversations: AdminConversation[]; total: number }> {
  await requireAdmin()
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const safePage = Math.max(page, 1)
  const patterns = keywords.map(keyword => `%${keyword.trim().toLowerCase()}%`).filter(pattern => pattern.length > 2)
  const filter = patterns.length
    ? `WHERE EXISTS (SELECT 1 FROM messages searched WHERE searched.conversation_id = c.id AND LOWER(searched.content) LIKE ANY($3::text[]))`
    : ''
  const params = patterns.length ? [safeLimit, (safePage - 1) * safeLimit, patterns] : [safeLimit, (safePage - 1) * safeLimit]
  const rows = await executeQuery<any[]>(
    `SELECT c.id, c.updated_at, COUNT(m.id)::int AS message_count, MAX(m.created_at) AS last_message_at,
            (ARRAY_AGG(m.content ORDER BY m.created_at DESC) FILTER (WHERE m.id IS NOT NULL))[1] AS last_message,
            COALESCE((SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
              'userId', cp.user_id, 'name', u.name, 'email', u.email, 'avatar', u.avatar
            ) ORDER BY u.name) FROM conversation_participants cp JOIN users u ON u.id = cp.user_id
              WHERE cp.conversation_id = c.id), '[]'::jsonb) AS participants
     FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id
     ${filter}
     GROUP BY c.id ORDER BY MAX(m.created_at) DESC NULLS LAST LIMIT $1 OFFSET $2`, params
  )
  const [countRow] = await executeQuery<Array<{ count: string }>>(
    `SELECT COUNT(*) FROM conversations c ${patterns.length ? `WHERE EXISTS (SELECT 1 FROM messages searched WHERE searched.conversation_id = c.id AND LOWER(searched.content) LIKE ANY($1::text[]))` : ''}`,
    patterns.length ? [patterns] : []
  )
  return {
    conversations: rows.map(row => ({
      id: row.id, updatedAt: row.updated_at, lastMessageAt: row.last_message_at,
      lastMessage: row.last_message || '', messageCount: Number(row.message_count || 0), participants: row.participants || []
    })),
    total: Number(countRow?.count || 0)
  }
}

export async function getAdminConversationThread(conversationId: string) {
  const admin = await requireAdmin()
  const rows = await executeQuery<any[]>(
    `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at, m.updated_at,
            u.name AS sender_name, u.avatar AS sender_avatar,
            EXISTS (SELECT 1 FROM moderation_queue mq WHERE mq.source_id = m.id) AS flagged,
            COALESCE((SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
              'id', ma.id, 'url', ma.url, 'mediaType', ma.media_type, 'fileName', ma.file_name,
              'mimeType', ma.mime_type, 'sizeBytes', ma.size_bytes
            ) ORDER BY ma.sort_order, ma.created_at) FROM message_attachments ma WHERE ma.message_id = m.id), '[]'::jsonb) AS attachments
     FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1 ORDER BY m.created_at ASC`, [conversationId]
  )
  await executeQuery(
    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, reason)
     VALUES ($1, 'conversation_thread_viewed', 'conversation', $2, 'Examen de modération')`,
    [admin.id, conversationId]
  )
  return rows.map(row => ({
    id: row.id, conversationId: row.conversation_id, senderId: row.sender_id,
    senderName: row.sender_name || 'Membre', senderAvatar: row.sender_avatar || null,
    content: row.content, createdAt: row.created_at, updatedAt: row.updated_at,
    isRead: Boolean(row.is_read), flagged: Boolean(row.flagged), attachments: row.attachments || []
  }))
}

/**
 * Fetches all messages for moderation with pagination.
 * Includes sender information and other protagonists in the conversation.
 */
export async function getAllMessages({ page = 1, limit = 50 }: { page?: number; limit?: number }): Promise<{ messages: ModerationMessage[], total: number }> {
  await requireAdmin();

  try {
    const offset = (page - 1) * limit;

    // Query to get messages with sender details
    const messagesQuery = `
      SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.created_at,
        m.updated_at,
        u.name AS sender_name,
        u.email AS sender_email
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    // Adjust type and access to results for messagesResult
    const messagesFromDB = await executeQuery<MessageFromDB[]>(messagesQuery, [limit, offset]);

    // Get total count for pagination
    // Adjust type and access to results for totalMessagesResult
    const totalMessagesRows = await executeQuery<{count: string}[]>('SELECT COUNT(*) FROM messages;');
    const total = totalMessagesRows.length > 0 ? parseInt(totalMessagesRows[0].count, 10) : 0;

    // For each message, fetch all protagonists in its conversation
    const messagesWithProtagonists: ModerationMessage[] = [];
    for (const msg of messagesFromDB) {
      const protagonistsQuery = `
        SELECT
          cp.user_id,
          u_p.name,
          u_p.email
        FROM conversation_participants cp
        JOIN users u_p ON cp.user_id = u_p.id
        LEFT JOIN user_profiles up_p ON u_p.id = up_p.user_id
        WHERE cp.conversation_id = $1;
      `;
      // Adjust type and access to results for protagonistsResult
      const protagonists = await executeQuery<ConversationProtagonist[]>(protagonistsQuery, [msg.conversation_id]);
      messagesWithProtagonists.push({
        ...msg,
        protagonists: protagonists, // Assign the array directly
      });
    }

    return { messages: messagesWithProtagonists, total };
  } catch (error) {
    console.error("Error fetching all messages:", error);
    throw new Error("Could not retrieve messages.");
  } // Remove finally block if client.release() is no longer needed
}

/**
 * Deletes a message by replacing its content.
 * (Soft delete: updates content and timestamp)
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await requireAdmin();

  try {
    const moderatedContent = "Le contenu de ce message a été supprimé par le modérateur";
    const query = `
      UPDATE messages
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `;
    // Use executeQuery
    await executeQuery(query, [moderatedContent, messageId]);
  } catch (error) {
    console.error('Error deleting message ' + messageId + ':', error);
    throw new Error("Could not delete message.");
  } // Remove finally block if client.release() is no longer needed
}

/**
 * Bans a user.
 */
export async function banUser(userId: string): Promise<void> {
  await requireAdmin();

  try {
    const query = 'UPDATE users SET is_banned = TRUE, status = \'banned\', updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    // Use executeQuery
    await executeQuery(query, [userId]);
    console.log('User ' + userId + ' has been banned.');
  } catch (error) {
    console.error('Error banning user ' + userId + ':', error);
    throw new Error("Could not ban user.");
  } // Remove finally block if client.release() is no longer needed
}

/**
 * Unbans a user.
 */
export async function unbanUser(userId: string): Promise<void> {
  await requireAdmin();

  try {
    const query = 'UPDATE users SET is_banned = FALSE, status = \'active\', updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    // Use executeQuery
    await executeQuery(query, [userId]);
    console.log('User ' + userId + ' has been unbanned.');
  } catch (error) {
    console.error('Error unbanning user ' + userId + ':', error);
    throw new Error("Could not unban user.");
  } // Remove finally block if client.release() is no longer needed
}

// Ajout d'une fonction pour rechercher des messages par mots-clés (modération)
/**
 * Recherche les messages contenant un ou plusieurs mots-clés (modération)
 * @param keywords Tableau de mots-clés à rechercher (insensible à la casse)
 * @param page Pagination (optionnel)
 * @param limit Pagination (optionnel)
 */
export async function searchMessagesByKeywords({ keywords, page = 1, limit = 50 }: { keywords: string[], page?: number, limit?: number }): Promise<{ messages: ModerationMessage[], total: number }> {
  await requireAdmin();

  if (!keywords || keywords.length === 0) return { messages: [], total: 0 };
  const offset = (page - 1) * limit;
  // Construction de la clause WHERE pour chaque mot-clé (insensible à la casse)
  const whereClauses = keywords.map((k, i) => `LOWER(m.content) LIKE $${i + 3}`);
  const params = [limit, offset, ...keywords.map(k => `%${k.toLowerCase()}%`)];
  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' OR ')}` : '';
  const messagesQuery = `
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      m.content,
      m.created_at,
      m.updated_at,
      u.name AS sender_name,
      u.email AS sender_email
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    ${where}
    ORDER BY m.created_at DESC
    LIMIT $1 OFFSET $2;
  `;
  const messagesFromDB = await executeQuery<MessageFromDB[]>(messagesQuery, params);
  // Correction : pour le COUNT, il faut que les paramètres commencent à $1
  const countWhereClauses = keywords.map((k, i) => `LOWER(m.content) LIKE $${i + 1}`);
  const countWhere = countWhereClauses.length > 0 ? `WHERE ${countWhereClauses.join(' OR ')}` : '';
  const countParams = keywords.map(k => `%${k.toLowerCase()}%`);
  const totalRows = await executeQuery<{count: string}[]>(`SELECT COUNT(*) FROM messages m ${countWhere};`, countParams);
  const total = totalRows.length > 0 ? parseInt(totalRows[0].count, 10) : 0;
  // Récupérer les protagonistes pour chaque message
  const messagesWithProtagonists: ModerationMessage[] = [];
  for (const msg of messagesFromDB) {
    const protagonistsQuery = `
      SELECT
        cp.user_id,
        u_p.name,
        u_p.email
      FROM conversation_participants cp
      JOIN users u_p ON cp.user_id = u_p.id
      LEFT JOIN user_profiles up_p ON u_p.id = up_p.user_id
      WHERE cp.conversation_id = $1;
    `;
    const protagonists = await executeQuery<ConversationProtagonist[]>(protagonistsQuery, [msg.conversation_id]);
    messagesWithProtagonists.push({
      ...msg,
      protagonists: protagonists,
    });
  }
  return { messages: messagesWithProtagonists, total };
}
