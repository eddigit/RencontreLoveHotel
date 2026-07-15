'use server'

import { createAppNotification } from '@/actions/notification-actions'
import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'
import { requireModerator } from '@/lib/moderation-auth'

type ModerationCaseRow = {
  id: string
  subject_pseudonym?: string | null
  user_id?: string | null
  email?: string | null
  excerpt?: string | null
  severity: string
  status: string
  reason?: string
  score?: number
  outcome?: string
  created_at?: string | Date
}

function projectCase(row: ModerationCaseRow, role: string) {
  const common = {
    id: row.id,
    subject: row.subject_pseudonym || 'Membre confidentiel',
    excerpt: row.excerpt || null,
    severity: row.severity,
    status: row.status,
    reason: row.reason,
    score: row.score,
    outcome: row.outcome,
    created_at: row.created_at
  }
  return role === 'admin'
    ? { ...common, subject_user_id: row.user_id || null, subject_email: row.email || null }
    : common
}

export async function getModerationCases() {
  const actor = await requireModerator()
  const rows = await sql.query<ModerationCaseRow[]>(
    `SELECT mq.id, mq.subject_pseudonym, mq.user_id, u.email, mq.excerpt,
            mq.severity, mq.status, mq.reason, mq.score, mq.outcome, mq.created_at
     FROM moderation_queue mq
     LEFT JOIN users u ON u.id = mq.user_id
     WHERE mq.status IN ('new', 'in_review', 'escalated')
     ORDER BY CASE mq.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
              mq.created_at ASC
     LIMIT 100`,
    []
  )
  return rows.map(row => projectCase(row, actor.role))
}

export async function getModerationCaseDetail(caseId: string, purpose = 'review') {
  const actor = await requireModerator()
  const [row] = await sql.query<ModerationCaseRow[]>(
    `SELECT mq.id, mq.subject_pseudonym, mq.user_id, u.email, mq.excerpt,
            mq.severity, mq.status, mq.reason, mq.score, mq.outcome, mq.created_at
     FROM moderation_queue mq
     LEFT JOIN users u ON u.id = mq.user_id
     WHERE mq.id = $1`,
    [caseId]
  )
  if (!row) throw new Error('Dossier de modération introuvable')

  await sql.query(
    `INSERT INTO moderation_case_access (case_id, actor_id, actor_role, purpose)
     VALUES ($1, $2, $3, $4)`,
    [caseId, actor.id, actor.role, purpose.slice(0, 120)]
  )
  return projectCase(row, actor.role)
}

const adminOnlyActions = new Set(['suspension', 'permanent_ban', 'legal_escalation'])

export async function createModerationDecision(input: {
  caseId: string
  action: 'no_action' | 'reminder' | 'warning' | 'message_restriction' | 'suspension' | 'permanent_ban' | 'legal_escalation'
  reason: string
}) {
  const actor = await requireModerator()
  const reason = input.reason.trim().slice(0, 2000)
  if (reason.length < 8) throw new Error('Motif détaillé requis')
  if (adminOnlyActions.has(input.action) && actor.role !== 'admin') {
    throw new Error('Cette décision est réservée à un administrateur')
  }

  const [decision] = await sql.query<Array<{ id: string }>>(
    `INSERT INTO moderation_decisions (
       case_id, actor_id, action, reason, statement_of_reasons, automation_contributed
     ) VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id`,
    [
      input.caseId,
      actor.id,
      input.action,
      reason,
      `${reason} Une détection automatisée a contribué à l’ouverture du dossier ; la présente décision est humaine.`
    ]
  )
  if (!decision) throw new Error('Décision impossible')

  await sql.query(
    `UPDATE moderation_queue
     SET status = $2, resolved_by = $3, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [input.caseId, input.action === 'legal_escalation' ? 'escalated' : 'actioned', actor.id]
  )
  if (input.action === 'permanent_ban') {
    await sql.query(
      `UPDATE users SET is_banned = true, status = 'banned', updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT user_id FROM moderation_queue WHERE id = $1)`,
      [input.caseId]
    )
  }
  return { success: true, decisionId: decision.id }
}

export async function submitModerationAppeal(input: { caseId: string; reason: string }) {
  const actor = await requireCurrentUser()
  const reason = input.reason.trim().slice(0, 2000)
  if (reason.length < 8) throw new Error('Motif de recours requis')
  const [appeal] = await sql.query<Array<{ id: string }>>(
    `INSERT INTO moderation_appeals (case_id, appellant_id, reason)
     SELECT $1, $2, $3
     WHERE EXISTS (
       SELECT 1 FROM moderation_queue WHERE id = $1 AND user_id = $2
     )
     RETURNING id`,
    [input.caseId, actor.id, reason]
  )
  if (!appeal) throw new Error('Recours indisponible')

  const admins = await sql.query<Array<{ id: string }>>(
    `SELECT id FROM users WHERE role = 'admin' AND COALESCE(is_banned, false) = false`,
    []
  ) || []
  await Promise.all(admins.map(admin => createAppNotification({
    userId: admin.id,
    type: 'moderation_appeal',
    title: 'Nouveau recours de modération',
    description: 'Un recours attend un réexamen humain.',
    link: '/admin/moderation',
    priority: 'high',
    category: 'moderation',
    audience: 'admin',
    metadata: { appealId: appeal.id }
  })))
  return { success: true, appealId: appeal.id }
}
