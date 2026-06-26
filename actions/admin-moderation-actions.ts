'use server'

import { sql } from '@/lib/db'
import { notifyAdmins } from '@/actions/notification-actions'
import { requireAdmin } from '@/lib/server-auth'

export type ModerationSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ModerationQueueStatus =
  | 'new'
  | 'in_review'
  | 'ignored'
  | 'actioned'
  | 'escalated'

export type ModerationKeywordRule = {
  id: string
  keyword: string
  severity: ModerationSeverity
  action: 'flag' | 'hide' | 'escalate'
  active: boolean
  created_at?: string | Date
}

export type ModerationQueueItem = {
  id: string
  source_type: 'message' | 'profile' | 'event' | 'user'
  source_id?: string | null
  user_id?: string | null
  conversation_id?: string | null
  severity: ModerationSeverity
  status: ModerationQueueStatus
  reason: string
  matched_keywords: string[]
  excerpt?: string | null
  created_at?: string | Date
}

export type AdminModerationDashboard = {
  counts: {
    pendingItems: number
    highSeverityItems: number
    activeKeywords: number
    bannedMembers: number
    messagesLast24h: number
  }
  keywordRules: ModerationKeywordRule[]
  recentItems: ModerationQueueItem[]
}

type MessageForScan = {
  id: string
  conversation_id?: string | null
  sender_id?: string | null
  content?: string | null
}

const severityRank: Record<ModerationSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
}

async function safeCount(query: string, params: unknown[] = []) {
  try {
    const result = await sql.query<Array<{ count: string | number }>>(query, params)
    return Number(result[0]?.count || 0)
  } catch (error) {
    console.warn('Requete moderation echouee:', query, error)
    return 0
  }
}

async function safeRows<T>(query: string, params: unknown[] = []) {
  try {
    return await sql.query<T[]>(query, params)
  } catch (error) {
    console.warn('Lecture moderation echouee:', query, error)
    return []
  }
}

function pickSeverity(rules: ModerationKeywordRule[]): ModerationSeverity {
  return rules.reduce<ModerationSeverity>((current, rule) => {
    return severityRank[rule.severity] > severityRank[current]
      ? rule.severity
      : current
  }, 'low')
}

export async function getModerationDashboard(): Promise<AdminModerationDashboard> {
  await requireAdmin()

  const [
    pendingItems,
    highSeverityItems,
    activeKeywords,
    bannedMembers,
    messagesLast24h,
    keywordRules,
    recentItems
  ] = await Promise.all([
    safeCount(`SELECT COUNT(*) as count FROM moderation_queue WHERE status IN ('new', 'in_review', 'escalated')`),
    safeCount(`SELECT COUNT(*) as count FROM moderation_queue WHERE status IN ('new', 'in_review', 'escalated') AND severity IN ('high', 'critical')`),
    safeCount(`SELECT COUNT(*) as count FROM moderation_keywords WHERE active = true`),
    safeCount(`SELECT COUNT(*) as count FROM users WHERE COALESCE(is_banned, false) = true OR status = 'banned'`),
    safeCount(`SELECT COUNT(*) as count FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours'`),
    safeRows<ModerationKeywordRule>(`
      SELECT id, keyword, severity, action, active, created_at
      FROM moderation_keywords
      ORDER BY active DESC, severity DESC, created_at DESC
      LIMIT 20
    `),
    safeRows<ModerationQueueItem>(`
      SELECT id, source_type, source_id, user_id, conversation_id, severity, status,
             reason, matched_keywords, excerpt, created_at
      FROM moderation_queue
      ORDER BY created_at DESC
      LIMIT 20
    `)
  ])

  return {
    counts: {
      pendingItems,
      highSeverityItems,
      activeKeywords,
      bannedMembers,
      messagesLast24h
    },
    keywordRules,
    recentItems
  }
}

export async function createModerationKeyword(input: {
  keyword: string
  severity?: ModerationSeverity
  action?: 'flag' | 'hide' | 'escalate'
  createdBy?: string
}) {
  const admin = await requireAdmin()
  const keyword = input.keyword.trim().toLowerCase()
  if (!keyword) {
    throw new Error('Mot-cle requis')
  }

  const [rule] = await sql.query<ModerationKeywordRule[]>(
    `
      INSERT INTO moderation_keywords (keyword, severity, action, created_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (keyword)
      DO UPDATE SET
        severity = EXCLUDED.severity,
        action = EXCLUDED.action,
        active = true,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, keyword, severity, action, active, created_at
    `,
    [
      keyword,
      input.severity || 'medium',
      input.action || 'flag',
      admin.id
    ]
  )

  return rule
}

export async function updateModerationQueueStatus(input: {
  itemId: string
  status: ModerationQueueStatus
  adminId?: string
  reason?: string
}) {
  const admin = await requireAdmin()

  await sql.query(
    `
      UPDATE moderation_queue
      SET status = $2,
          resolved_by = CASE WHEN $2 IN ('ignored', 'actioned', 'escalated') THEN $3 ELSE resolved_by END,
          resolved_at = CASE WHEN $2 IN ('ignored', 'actioned', 'escalated') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [input.itemId, input.status, admin.id]
  )

  await sql.query(
    `
      INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, reason)
      VALUES ($1, 'moderation_status_update', 'moderation_queue', $2, $3)
    `,
    [admin.id, input.itemId, input.reason || null]
  )

  return { success: true }
}

export async function scanRecentMessagesForModeration(input: {
  limit?: number
  adminId?: string
} = {}) {
  const admin = await requireAdmin()

  const rules = await safeRows<ModerationKeywordRule>(
    `
      SELECT id, keyword, severity, action, active, created_at
      FROM moderation_keywords
      WHERE active = true
    `
  )

  if (rules.length === 0) {
    return { scanned: 0, flagged: 0, activeKeywords: 0 }
  }

  const messages = await safeRows<MessageForScan>(
    `
      SELECT id, conversation_id, sender_id, content
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND content IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [input.limit || 250]
  )

  let flagged = 0

  for (const message of messages) {
    const content = message.content || ''
    const normalizedContent = content.toLowerCase()
    const matchedRules = rules.filter(rule =>
      normalizedContent.includes(rule.keyword.toLowerCase())
    )

    if (matchedRules.length === 0) continue

    const severity = pickSeverity(matchedRules)
    const matchedKeywords = matchedRules.map(rule => rule.keyword)
    const excerpt = content.length > 280 ? `${content.slice(0, 277)}...` : content

    await sql.query(
      `
        INSERT INTO moderation_queue (
          source_type, source_id, user_id, conversation_id, severity, status,
          reason, matched_keywords, excerpt, metadata
        )
        SELECT 'message', $1, $2, $3, $4, 'new', $5, $6::text[], $7, $8::jsonb
        WHERE NOT EXISTS (
          SELECT 1
          FROM moderation_queue
          WHERE source_type = 'message'
            AND source_id = $1
            AND status IN ('new', 'in_review', 'escalated')
        )
      `,
      [
        message.id,
        message.sender_id || null,
        message.conversation_id || null,
        severity,
        'Mot-cle detecte dans un message',
        matchedKeywords,
        excerpt,
        JSON.stringify({ scan: 'recent_messages', adminId: admin.id })
      ]
    )

    flagged += 1
  }

  if (flagged > 0) {
    await notifyAdmins({
      type: 'moderation_alert',
      title: 'Messages a moderer',
      description: `${flagged} message(s) correspondent aux regles de moderation.`,
      link: '/admin/moderation',
      category: 'moderation',
      priority: flagged >= 5 ? 'high' : 'normal',
      createdBy: admin.id,
      metadata: { flagged, scanned: messages.length }
    })
  }

  return {
    scanned: messages.length,
    flagged,
    activeKeywords: rules.length
  }
}
