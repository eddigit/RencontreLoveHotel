'use server'

import { createHash } from 'node:crypto'
import { createAppNotification } from '@/actions/notification-actions'
import { sql } from '@/lib/db'
import { requireModerator } from '@/lib/moderation-auth'
import { requireAdmin, requireCurrentUser } from '@/lib/server-auth'

type InvestigationRow = Record<string, any>

function projectInvestigation(row: InvestigationRow, role: string) {
  const common = {
    id: row.id,
    subject: row.subject_pseudonym || `Membre-${String(row.subject_user_id || '').slice(0, 8)}`,
    category: row.category,
    priority: Number(row.priority || 0),
    status: row.status,
    severity: row.severity || 'medium',
    openAlerts: Number(row.open_alerts || 0),
    latestAlertAt: row.latest_alert_at,
    enhancedAccessUntil: row.enhanced_access_until,
    legalHold: Boolean(row.legal_hold),
    automationEnabled: row.automation_enabled !== false,
    alerts: row.alerts || []
  }
  if (role !== 'admin') return common
  return {
    ...common,
    subjectUserId: row.subject_user_id,
    name: row.name || row.subject_pseudonym || 'Membre',
    email: row.email || null,
    avatar: row.avatar || null,
    statusAccount: row.account_status || null,
    isBanned: Boolean(row.is_banned),
    messagingRestrictedUntil: row.messaging_restricted_until || null,
    profile: row.profile || null
  }
}

async function logAccess(input: {
  investigationId: string
  actor: { id: string; role?: string | null }
  resourceType: string
  resourceId?: string | null
  purpose: string
}) {
  await sql.query(
    `INSERT INTO moderation_case_access (
       case_id, investigation_id, actor_id, actor_role, purpose, resource_type, resource_id
     )
     SELECT mq.id, $1, $2, $3, $6, $4, $5::uuid
     FROM moderation_queue mq
     WHERE mq.investigation_id = $1
     ORDER BY mq.created_at ASC
     LIMIT 1`,
    [
      input.investigationId,
      input.actor.id,
      input.actor.role,
      input.resourceType,
      input.resourceId || null,
      input.purpose.slice(0, 120)
    ]
  )
}

export async function getModerationInvestigations() {
  const actor = await requireModerator()
  const rows = await sql.query<InvestigationRow[]>(
    `SELECT mi.id, mi.subject_user_id, mi.category, mi.priority, mi.status,
            mi.enhanced_access_until, mi.legal_hold, mi.automation_enabled,
            u.name, u.email, u.avatar, u.status AS account_status, u.is_banned,
            COALESCE(MAX(mq.subject_pseudonym), 'Membre-' || LEFT(mi.subject_user_id::text, 8)) AS subject_pseudonym,
            COUNT(mq.id) FILTER (WHERE mq.status IN ('new', 'in_review', 'escalated')) AS open_alerts,
            MAX(mq.created_at) AS latest_alert_at,
            (ARRAY_AGG(mq.severity ORDER BY CASE mq.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC))[1] AS severity
     FROM moderation_investigations mi
     JOIN users u ON u.id = mi.subject_user_id
     LEFT JOIN moderation_queue mq ON mq.investigation_id = mi.id
     WHERE mi.status <> 'closed'
     GROUP BY mi.id, u.id
     ORDER BY mi.priority DESC, MAX(mq.created_at) DESC NULLS LAST
     LIMIT 200`,
    []
  )
  return rows.map(row => projectInvestigation(row, actor.role))
}

export async function getModerationInvestigation(investigationId: string) {
  const actor = await requireModerator()
  const [row] = await sql.query<InvestigationRow[]>(
    `SELECT mi.*, u.name, u.email, u.avatar, u.status AS account_status, u.is_banned,
            u.messaging_restricted_until,
            COALESCE(MAX(mq.subject_pseudonym), 'Membre-' || LEFT(mi.subject_user_id::text, 8)) AS subject_pseudonym,
            COUNT(mq.id) FILTER (WHERE mq.status IN ('new', 'in_review', 'escalated')) AS open_alerts,
            MAX(mq.created_at) AS latest_alert_at,
            (ARRAY_AGG(mq.severity ORDER BY CASE mq.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC))[1] AS severity,
            COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
              'id', mq.id, 'reason', mq.reason, 'excerpt', mq.excerpt,
              'severity', mq.severity, 'status', mq.status, 'sourceType', mq.source_type,
              'sourceId', mq.source_id, 'conversationId', mq.conversation_id,
              'createdAt', mq.created_at, 'matchedKeywords', mq.matched_keywords
            ) ORDER BY mq.created_at DESC) FILTER (WHERE mq.id IS NOT NULL), '[]'::jsonb) AS alerts,
            (SELECT TO_JSONB(up) - 'id' - 'user_id' FROM user_profiles up WHERE up.user_id = u.id LIMIT 1) AS profile
     FROM moderation_investigations mi
     JOIN users u ON u.id = mi.subject_user_id
     LEFT JOIN moderation_queue mq ON mq.investigation_id = mi.id
     WHERE mi.id = $1
     GROUP BY mi.id, u.id`,
    [investigationId]
  )
  if (!row) throw new Error('Dossier de modération introuvable')
  await logAccess({ investigationId, actor, resourceType: 'investigation', purpose: 'investigation' })
  return projectInvestigation(row, actor.role)
}

export async function getInvestigationConversations(investigationId: string) {
  const actor = await requireAdmin()
  const [investigation] = await sql.query<Array<{ subject_user_id: string; enhanced_access_until: Date }>>(
    `SELECT subject_user_id, enhanced_access_until FROM moderation_investigations WHERE id = $1`,
    [investigationId]
  )
  if (!investigation) throw new Error('Dossier introuvable')
  if (new Date(investigation.enhanced_access_until).getTime() < Date.now()) {
    throw new Error('La période renforcée de six mois doit être réévaluée formellement')
  }
  const rows = await sql.query<InvestigationRow[]>(
    `SELECT c.id, c.updated_at,
            COUNT(m.id)::int AS message_count,
            MAX(m.created_at) AS last_message_at,
            (ARRAY_AGG(m.content ORDER BY m.created_at DESC) FILTER (WHERE m.id IS NOT NULL))[1] AS last_message,
            COALESCE((SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
              'userId', cp2.user_id, 'name', u2.name, 'avatar', u2.avatar, 'email', u2.email
            ) ORDER BY u2.name) FROM conversation_participants cp2 JOIN users u2 ON u2.id = cp2.user_id
              WHERE cp2.conversation_id = c.id), '[]'::jsonb) AS participants,
            COUNT(DISTINCT mq.id)::int AS alert_count
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
     LEFT JOIN messages m ON m.conversation_id = c.id
     LEFT JOIN moderation_queue mq ON mq.conversation_id = c.id AND mq.investigation_id = $2
     GROUP BY c.id
     ORDER BY MAX(m.created_at) DESC NULLS LAST`,
    [investigation.subject_user_id, investigationId]
  )
  await logAccess({ investigationId, actor, resourceType: 'conversation_list', purpose: 'conversation_list' })
  return rows.map(row => ({
    id: row.id,
    updatedAt: row.updated_at,
    messageCount: Number(row.message_count || 0),
    lastMessageAt: row.last_message_at,
    lastMessage: row.last_message || '',
    participants: row.participants || [],
    alertCount: Number(row.alert_count || 0)
  }))
}

export async function getInvestigationThread(investigationId: string, conversationId: string) {
  const actor = await requireAdmin()
  const [scope] = await sql.query<Array<{ subject_user_id: string }>>(
    `SELECT mi.subject_user_id
     FROM moderation_investigations mi
     JOIN conversation_participants cp ON cp.user_id = mi.subject_user_id AND cp.conversation_id = $2
     WHERE mi.id = $1 AND mi.enhanced_access_until >= CURRENT_TIMESTAMP`,
    [investigationId, conversationId]
  )
  if (!scope) throw new Error('Conversation hors du périmètre autorisé')
  const rows = await sql.query<InvestigationRow[]>(
    `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at, m.updated_at,
            u.name AS sender_name, u.avatar AS sender_avatar,
            EXISTS (SELECT 1 FROM moderation_queue mq WHERE mq.investigation_id = $1 AND mq.source_id = m.id) AS flagged,
            COALESCE((SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
              'id', ma.id, 'url', ma.url, 'mediaType', ma.media_type, 'fileName', ma.file_name,
              'mimeType', ma.mime_type, 'sizeBytes', ma.size_bytes
            ) ORDER BY ma.sort_order, ma.created_at) FROM message_attachments ma WHERE ma.message_id = m.id), '[]'::jsonb) AS attachments
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $2
     ORDER BY m.created_at ASC`,
    [investigationId, conversationId]
  )
  await logAccess({
    investigationId,
    actor,
    resourceType: 'conversation_thread',
    resourceId: conversationId,
    purpose: 'conversation_thread'
  })
  return rows.map(row => ({
    id: row.id, conversationId: row.conversation_id, senderId: row.sender_id,
    senderName: row.sender_name || 'Membre', senderAvatar: row.sender_avatar || null,
    content: row.content, createdAt: row.created_at, updatedAt: row.updated_at,
    isRead: Boolean(row.is_read), flagged: Boolean(row.flagged), attachments: row.attachments || []
  }))
}

export async function getOfficialModerationMessages(investigationId: string) {
  const actor = await requireAdmin()
  const rows = await sql.query<InvestigationRow[]>(
    `SELECT mom.*, u.name AS sender_name, u.avatar AS sender_avatar
     FROM moderation_official_messages mom JOIN users u ON u.id = mom.sender_id
     WHERE mom.investigation_id = $1 ORDER BY mom.created_at ASC`,
    [investigationId]
  )
  await logAccess({ investigationId, actor, resourceType: 'official_channel', purpose: 'official_channel' })
  return rows
}

export async function sendOfficialModerationMessage(investigationId: string, rawContent: string) {
  const actor = await requireAdmin()
  const content = rawContent.trim().slice(0, 4000)
  if (content.length < 8) throw new Error('Message officiel trop court')
  const [investigation] = await sql.query<Array<{ subject_user_id: string }>>(
    `SELECT subject_user_id FROM moderation_investigations WHERE id = $1`, [investigationId]
  )
  if (!investigation) throw new Error('Dossier introuvable')
  const [message] = await sql.query<Array<{ id: string; created_at: Date }>>(
    `INSERT INTO moderation_official_messages (investigation_id, sender_id, recipient_id, content)
     VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
    [investigationId, actor.id, investigation.subject_user_id, content]
  )
  await sql.query(
    `INSERT INTO moderation_investigation_events (investigation_id, actor_id, event_type, details)
     VALUES ($1, $2, 'official_message_sent', $3::jsonb)`,
    [investigationId, actor.id, JSON.stringify({ messageId: message.id })]
  )
  await createAppNotification({
    userId: investigation.subject_user_id,
    type: 'official_moderation_message',
    title: 'Message officiel de la modération',
    description: 'Une communication officielle et confidentielle vous attend.',
    link: '/account/moderation', priority: 'high', category: 'moderation', audience: 'user',
    metadata: { investigationId, messageId: message.id }, createdBy: actor.id
  })
  return { success: true, messageId: message.id }
}

export async function getMyOfficialModerationMessages() {
  const actor = await requireCurrentUser()
  const rows = await sql.query<InvestigationRow[]>(
    `UPDATE moderation_official_messages SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE recipient_id = $1
     RETURNING id, investigation_id, sender_id, recipient_id, content, read_at, created_at`,
    [actor.id]
  )
  return rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export async function applyInvestigationAction(input: {
  investigationId: string
  action: 'warning' | 'message_restriction' | 'suspension' | 'permanent_ban' | 'legal_escalation' | 'restore_messaging'
  reason: string
}) {
  const actor = await requireAdmin()
  const reason = input.reason.trim().slice(0, 2000)
  if (reason.length < 8) throw new Error('Motif factuel obligatoire')
  const [investigation] = await sql.query<Array<{ subject_user_id: string }>>(
    `SELECT subject_user_id FROM moderation_investigations WHERE id = $1`, [input.investigationId]
  )
  if (!investigation) throw new Error('Dossier introuvable')
  if (input.action === 'message_restriction') {
    await sql.query(`UPDATE users SET messaging_restricted_until = NOW() + INTERVAL '30 days', updated_at = NOW() WHERE id = $1`, [investigation.subject_user_id])
  } else if (input.action === 'restore_messaging') {
    await sql.query(`UPDATE users SET messaging_restricted_until = NULL, updated_at = NOW() WHERE id = $1`, [investigation.subject_user_id])
  } else if (input.action === 'suspension') {
    await sql.query(`UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = $1`, [investigation.subject_user_id])
  } else if (input.action === 'permanent_ban') {
    await sql.query(`UPDATE users SET is_banned = TRUE, status = 'banned', updated_at = NOW() WHERE id = $1`, [investigation.subject_user_id])
  }
  await sql.query(
    `INSERT INTO moderation_investigation_events (investigation_id, actor_id, event_type, details)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [input.investigationId, actor.id, input.action, JSON.stringify({ reason, humanDecision: true })]
  )
  await sql.query(
    `UPDATE moderation_investigations SET status = $2, updated_at = NOW() WHERE id = $1`,
    [input.investigationId, input.action === 'legal_escalation' ? 'escalated' : input.action === 'warning' ? 'in_review' : 'restricted']
  )
  return { success: true }
}

export async function recommendInvestigationAction(input: {
  investigationId: string
  recommendation: 'warning' | 'message_restriction' | 'suspension' | 'permanent_ban' | 'legal_escalation'
  reason: string
}) {
  const actor = await requireModerator()
  const reason = input.reason.trim().slice(0, 2000)
  if (reason.length < 8) throw new Error('Motif factuel obligatoire')
  const rows = await sql.query<Array<{ id: string }>>(
    `SELECT id FROM moderation_investigations WHERE id = $1`, [input.investigationId]
  )
  if (!rows[0]) throw new Error('Dossier introuvable')
  await sql.query(
    `INSERT INTO moderation_investigation_events (investigation_id, actor_id, event_type, details)
     VALUES ($1, $2, 'moderator_recommendation', $3::jsonb)`,
    [input.investigationId, actor.id, JSON.stringify({ recommendation: input.recommendation, reason })]
  )
  return { success: true }
}

export async function setInvestigationAutomation(investigationId: string, enabled: boolean, reason: string) {
  const actor = await requireAdmin()
  if (reason.trim().length < 8) throw new Error('Motif obligatoire')
  await sql.query(`UPDATE moderation_investigations SET automation_enabled = $2, updated_at = NOW() WHERE id = $1`, [investigationId, enabled])
  await sql.query(
    `INSERT INTO moderation_investigation_events (investigation_id, actor_id, event_type, details)
     VALUES ($1, $2, 'automation_updated', $3::jsonb)`,
    [investigationId, actor.id, JSON.stringify({ enabled, reason: reason.trim().slice(0, 1000) })]
  )
  return { success: true }
}

export async function freezeInvestigationEvidence(investigationId: string, reason: string) {
  const actor = await requireAdmin()
  if (reason.trim().length < 8) throw new Error('Motif de gel obligatoire')
  const snapshotRows = await sql.query<InvestigationRow[]>(
    `SELECT mi.*, JSONB_BUILD_OBJECT(
              'id', u.id, 'email', u.email, 'name', u.name, 'role', u.role, 'avatar', u.avatar,
              'status', u.status, 'isBanned', u.is_banned, 'createdAt', u.created_at,
              'messagingRestrictedUntil', u.messaging_restricted_until
            ) AS subject,
            COALESCE((SELECT JSONB_AGG(TO_JSONB(mq) ORDER BY mq.created_at) FROM moderation_queue mq WHERE mq.investigation_id = mi.id), '[]'::jsonb) AS alerts,
            COALESCE((SELECT JSONB_AGG(TO_JSONB(mom) ORDER BY mom.created_at) FROM moderation_official_messages mom WHERE mom.investigation_id = mi.id), '[]'::jsonb) AS official_messages
     FROM moderation_investigations mi JOIN users u ON u.id = mi.subject_user_id WHERE mi.id = $1`,
    [investigationId]
  )
  if (!snapshotRows[0]) throw new Error('Dossier introuvable')
  const snapshot = { createdAt: new Date().toISOString(), reason: reason.trim(), data: snapshotRows[0] }
  const canonical = JSON.stringify(snapshot)
  const sha256 = createHash('sha256').update(canonical).digest('hex')
  const [record] = await sql.query<Array<{ id: string }>>(
    `INSERT INTO moderation_evidence_snapshots (investigation_id, created_by, snapshot, sha256)
     VALUES ($1, $2, $3::jsonb, $4) RETURNING id`,
    [investigationId, actor.id, canonical, sha256]
  )
  await sql.query(`UPDATE moderation_investigations SET legal_hold = TRUE, updated_at = NOW() WHERE id = $1`, [investigationId])
  await sql.query(`UPDATE moderation_queue SET legal_hold = TRUE WHERE investigation_id = $1`, [investigationId])
  return { success: true, snapshotId: record.id, sha256 }
}

export async function registerEvidenceTransmission(input: {
  investigationId: string; exportId: string; recipientType: 'lawyer' | 'authority' | 'other'
  recipientName: string; reference?: string; legalBasis: string; transmittedAt: string
}) {
  const actor = await requireAdmin()
  if (input.recipientName.trim().length < 2 || input.legalBasis.trim().length < 5) throw new Error('Transmission incomplète')
  const [row] = await sql.query<Array<{ id: string }>>(
    `INSERT INTO moderation_transmissions (
       export_id, investigation_id, created_by, recipient_type, recipient_name, reference, legal_basis, transmitted_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz) RETURNING id`,
    [input.exportId, input.investigationId, actor.id, input.recipientType, input.recipientName.trim(), input.reference?.trim() || null, input.legalBasis.trim(), input.transmittedAt]
  )
  return { success: true, transmissionId: row.id }
}
