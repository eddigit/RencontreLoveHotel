'use server'

import { sql } from '@/lib/db'
import { notifyAdmins } from '@/actions/notification-actions'
import { requireAdmin } from '@/lib/server-auth'
import { notifyAdminByEmail } from '@/lib/admin-email-notifications'

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
  source_type: 'message' | 'profile' | 'event' | 'user' | 'wall_post' | 'wall_comment'
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

export type WallModerationQueueItem = ModerationQueueItem & {
  author_name?: string | null
  author_avatar?: string | null
  image_url?: string | null
}

export type ProfileReportStatus = 'new' | 'in_review' | 'dismissed' | 'actioned'

export type ProfileReportQueueItem = {
  id: string
  reporter_id: string
  reported_user_id: string
  reason: string
  details?: string | null
  status: ProfileReportStatus
  created_at: string | Date
  reporter_name?: string | null
  reporter_avatar?: string | null
  reported_name?: string | null
  reported_avatar?: string | null
  distinct_report_count: number | string
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

export async function getProfileReportQueue(): Promise<ProfileReportQueueItem[]> {
  await requireAdmin()

  return await sql.query<ProfileReportQueueItem[]>(`
    SELECT
      pr.id,
      pr.reporter_id,
      pr.reported_user_id,
      pr.reason,
      pr.details,
      pr.status,
      pr.created_at,
      reporter.name AS reporter_name,
      reporter.avatar AS reporter_avatar,
      reported.name AS reported_name,
      reported.avatar AS reported_avatar,
      (
        SELECT COUNT(DISTINCT other_report.reporter_id)
        FROM profile_reports other_report
        WHERE other_report.reported_user_id = pr.reported_user_id
          AND other_report.status IN ('new', 'in_review', 'actioned')
      ) AS distinct_report_count
    FROM profile_reports pr
    JOIN users reporter ON reporter.id = pr.reporter_id
    JOIN users reported ON reported.id = pr.reported_user_id
    WHERE pr.status IN ('new', 'in_review')
    ORDER BY
      distinct_report_count DESC,
      pr.created_at DESC
    LIMIT 100
  `)
}

export async function resolveProfileReport(input: {
  reportId: string
  status: Exclude<ProfileReportStatus, 'new'>
  note?: string
}) {
  const admin = await requireAdmin()
  if (!['in_review', 'dismissed', 'actioned'].includes(input.status)) {
    throw new Error('Statut de signalement invalide')
  }

  const note = String(input.note || '').trim().slice(0, 1000) || null
  await sql.query(
    `UPDATE profile_reports
     SET status = $2,
         resolved_by = CASE WHEN $2 IN ('dismissed', 'actioned') THEN $3 ELSE NULL END,
         resolution_note = $4,
         resolved_at = CASE WHEN $2 IN ('dismissed', 'actioned') THEN CURRENT_TIMESTAMP ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [input.reportId, input.status, admin.id, note]
  )

  const queueStatus = input.status === 'dismissed'
    ? 'ignored'
    : input.status === 'actioned'
      ? 'actioned'
      : 'in_review'
  await sql.query(
    `UPDATE moderation_queue
     SET status = $2,
         resolved_by = CASE WHEN $2 IN ('ignored', 'actioned') THEN $3 ELSE NULL END,
         resolved_at = CASE WHEN $2 IN ('ignored', 'actioned') THEN CURRENT_TIMESTAMP ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP
     WHERE source_type = 'profile'
       AND metadata->>'reportId' = $1`,
    [input.reportId, queueStatus, admin.id]
  )

  await sql.query(
    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, reason)
     VALUES ($1, 'profile_report_resolution', 'profile_report', $2, $3)`,
    [admin.id, input.reportId, note || input.status]
  )

  return { success: true as const }
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

  await notifyAdminByEmail({
    kind: 'moderation_rule_updated',
    subject: `Règle de modération : ${keyword}`,
    title: 'Une règle de modération vient d’être créée ou réactivée',
    details: [
      { label: 'Mot-clé', value: keyword },
      { label: 'Gravité', value: input.severity || 'medium' },
      { label: 'Action', value: input.action || 'flag' },
      { label: 'Administrateur', value: admin.email || admin.id }
    ],
    actionPath: '/admin/moderation'
  })

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

  await notifyAdminByEmail({
    kind: 'moderation_updated',
    subject: `Modération mise à jour : ${input.status}`,
    title: 'Une décision de modération vient d’être enregistrée',
    details: [
      { label: 'Élément', value: input.itemId },
      { label: 'Statut', value: input.status },
      { label: 'Administrateur', value: admin.email || admin.id }
    ],
    message: input.reason,
    actionPath: '/admin/moderation'
  })

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
    await notifyAdminByEmail({
      kind: 'moderation_queued',
      subject: `${flagged} message(s) à modérer`,
      title: 'Le contrôle de modération a détecté des messages',
      details: [
        { label: 'Messages analysés', value: messages.length },
        { label: 'Messages signalés', value: flagged },
        { label: 'Administrateur', value: admin.email || admin.id }
      ],
      actionPath: '/admin/moderation'
    })
  }

  return {
    scanned: messages.length,
    flagged,
    activeKeywords: rules.length
  }
}

async function getWallModerationTarget(itemId: string) {
  const [item] = await sql.query<Array<{
    source_type: 'wall_post' | 'wall_comment'
    source_id: string
  }>>(
    `
      SELECT source_type, source_id
      FROM moderation_queue
      WHERE id = $1
        AND source_type IN ('wall_post', 'wall_comment')
      LIMIT 1
    `,
    [itemId]
  )

  if (!item?.source_id) {
    throw new Error('Element de moderation mur introuvable')
  }

  return item
}

function wallTableForSource(sourceType: 'wall_post' | 'wall_comment') {
  return sourceType === 'wall_post' ? 'wall_posts' : 'wall_comments'
}

export async function getWallModerationQueue(): Promise<WallModerationQueueItem[]> {
  await requireAdmin()

  return await sql.query<WallModerationQueueItem[]>(
    `
      SELECT
        mq.id,
        mq.source_type,
        mq.source_id,
        mq.user_id,
        mq.severity,
        mq.status,
        mq.reason,
        mq.matched_keywords,
        mq.excerpt,
        mq.created_at,
        wp.image_url,
        u.name AS author_name,
        u.avatar AS author_avatar
      FROM moderation_queue mq
      LEFT JOIN users u ON u.id = mq.user_id
      LEFT JOIN wall_posts wp
        ON mq.source_type = 'wall_post'
       AND wp.id = mq.source_id
      WHERE mq.source_type IN ('wall_post', 'wall_comment')
        AND mq.status IN ('new', 'in_review', 'escalated')
      ORDER BY mq.created_at DESC
      LIMIT 50
    `,
    []
  )
}

export async function restoreWallModerationItem(input: {
  itemId: string
  reason?: string
}) {
  const admin = await requireAdmin()
  const item = await getWallModerationTarget(input.itemId)
  const tableName = wallTableForSource(item.source_type)

  await sql.query(
    `UPDATE ${tableName} SET status = 'active' WHERE id = $1`,
    [item.source_id]
  )

  await sql.query(
    `
      UPDATE moderation_queue
      SET status = $2,
          resolved_by = $3,
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [input.itemId, 'ignored', admin.id]
  )

  await sql.query(
    `
      INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, reason)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      admin.id,
      'wall_restore',
      item.source_type,
      item.source_id,
      input.reason || null
    ]
  )

  await notifyAdminByEmail({
    kind: 'moderation_updated',
    subject: 'Contenu du mur restauré',
    title: 'Un contenu modéré vient d’être restauré',
    details: [
      { label: 'Type', value: item.source_type },
      { label: 'Contenu', value: item.source_id },
      { label: 'Administrateur', value: admin.email || admin.id }
    ],
    message: input.reason,
    actionPath: '/admin/moderation'
  })

  return { success: true }
}

export async function removeWallModerationItem(input: {
  itemId: string
  reason?: string
}) {
  const admin = await requireAdmin()
  const item = await getWallModerationTarget(input.itemId)
  const tableName = wallTableForSource(item.source_type)

  await sql.query(
    `UPDATE ${tableName} SET status = 'removed' WHERE id = $1`,
    [item.source_id]
  )

  await sql.query(
    `
      UPDATE moderation_queue
      SET status = $2,
          resolved_by = $3,
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [input.itemId, 'actioned', admin.id]
  )

  await sql.query(
    `
      INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, reason)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      admin.id,
      'wall_remove',
      item.source_type,
      item.source_id,
      input.reason || null
    ]
  )

  await notifyAdminByEmail({
    kind: 'moderation_updated',
    subject: 'Contenu du mur supprimé',
    title: 'Un contenu modéré vient d’être supprimé',
    details: [
      { label: 'Type', value: item.source_type },
      { label: 'Contenu', value: item.source_id },
      { label: 'Administrateur', value: admin.email || admin.id }
    ],
    message: input.reason,
    actionPath: '/admin/moderation'
  })

  return { success: true }
}
