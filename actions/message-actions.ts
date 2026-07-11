'use server'

import { executeQuery } from '@/lib/db'; // Correctly import executeQuery
import { requireAdmin } from '@/lib/server-auth';
import { notifyAdminByEmail } from '@/lib/admin-email-notifications';

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
  sender_avatar?: string | null;
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
        u.email AS sender_email,
        COALESCE(primary_photo.url, NULLIF(BTRIM(u.avatar), '')) AS sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN LATERAL (
        SELECT p.url
        FROM photos p
        WHERE p.user_id = u.id
        ORDER BY p.is_primary DESC, p.created_at DESC
        LIMIT 1
      ) primary_photo ON TRUE
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
          u_p.email,
          COALESCE(primary_photo.url, NULLIF(BTRIM(u_p.avatar), '')) AS avatar
        FROM conversation_participants cp
        JOIN users u_p ON cp.user_id = u_p.id
        LEFT JOIN user_profiles up_p ON u_p.id = up_p.user_id
        LEFT JOIN LATERAL (
          SELECT p.url
          FROM photos p
          WHERE p.user_id = u_p.id
          ORDER BY p.is_primary DESC, p.created_at DESC
          LIMIT 1
        ) primary_photo ON TRUE
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
  const admin = await requireAdmin();

  try {
    const moderatedContent = "Le contenu de ce message a été supprimé par le modérateur";
    const query = `
      UPDATE messages
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `;
    // Use executeQuery
    await executeQuery(query, [moderatedContent, messageId]);
    await notifyAdminByEmail({
      kind: 'message_moderated',
      subject: `Message modéré : ${messageId}`,
      title: 'Un message vient d’être supprimé par la modération',
      details: [
        { label: 'Message', value: messageId },
        { label: 'Action par', value: admin.email || admin.id }
      ],
      actionPath: '/admin/messages'
    });
  } catch (error) {
    console.error('Error deleting message ' + messageId + ':', error);
    throw new Error("Could not delete message.");
  } // Remove finally block if client.release() is no longer needed
}

/**
 * Bans a user.
 */
export async function banUser(userId: string): Promise<void> {
  const admin = await requireAdmin();

  try {
    const query = 'UPDATE users SET is_banned = TRUE, status = \'banned\', updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    // Use executeQuery
    await executeQuery(query, [userId]);
    await notifyAdminByEmail({
      kind: 'member_banned',
      subject: `Adhérent banni : ${userId}`,
      title: 'Un adhérent vient d’être banni',
      details: [
        { label: 'Adhérent', value: userId },
        { label: 'Action par', value: admin.email || admin.id }
      ],
      actionPath: `/admin/users/${userId}/edit`
    });
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
  const admin = await requireAdmin();

  try {
    const query = 'UPDATE users SET is_banned = FALSE, status = \'active\', updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    // Use executeQuery
    await executeQuery(query, [userId]);
    await notifyAdminByEmail({
      kind: 'member_unbanned',
      subject: `Adhérent réactivé : ${userId}`,
      title: 'Un adhérent vient d’être réactivé',
      details: [
        { label: 'Adhérent', value: userId },
        { label: 'Action par', value: admin.email || admin.id }
      ],
      actionPath: `/admin/users/${userId}/edit`
    });
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
      u.email AS sender_email,
      COALESCE(primary_photo.url, NULLIF(BTRIM(u.avatar), '')) AS sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN LATERAL (
      SELECT p.url
      FROM photos p
      WHERE p.user_id = u.id
      ORDER BY p.is_primary DESC, p.created_at DESC
      LIMIT 1
    ) primary_photo ON TRUE
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
        u_p.email,
        COALESCE(primary_photo.url, NULLIF(BTRIM(u_p.avatar), '')) AS avatar
      FROM conversation_participants cp
      JOIN users u_p ON cp.user_id = u_p.id
      LEFT JOIN user_profiles up_p ON u_p.id = up_p.user_id
      LEFT JOIN LATERAL (
        SELECT p.url
        FROM photos p
        WHERE p.user_id = u_p.id
        ORDER BY p.is_primary DESC, p.created_at DESC
        LIMIT 1
      ) primary_photo ON TRUE
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
