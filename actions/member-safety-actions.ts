"use server"

import { sql } from '@/lib/db'
import { createAppNotificationInternal as createAppNotification } from '@/lib/notification-service'
import { requireCurrentUser } from '@/lib/server-auth'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const reportReasons = [
  'fake_profile',
  'harassment',
  'inappropriate_content',
  'spam',
  'underage_concern',
  'paid_sexual_solicitation',
  'other'
] as const

export type MemberReportReason = (typeof reportReasons)[number]
const MIN_DECLARATION_LENGTH = 20

function validateTarget(currentUserId: string, targetUserId: string) {
  if (!uuidPattern.test(targetUserId) || targetUserId === currentUserId) {
    throw new Error('Membre invalide')
  }
}

export async function blockMember(targetUserId: string) {
  const currentUser = await requireCurrentUser()
  validateTarget(currentUser.id, targetUserId)

  const rows = await sql.query<Array<{ blocked_id: string }>>(
    `
      WITH blocked_member AS (
        INSERT INTO user_blocks (blocker_id, blocked_id)
        VALUES ($1, $2)
        ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET blocker_id = EXCLUDED.blocker_id
        RETURNING blocked_id
      ), closed_relationship AS (
        DELETE FROM user_matches
        WHERE (user_id_1 = $1 AND user_id_2 = $2)
           OR (user_id_1 = $2 AND user_id_2 = $1)
        RETURNING id
      )
      SELECT blocked_id FROM blocked_member
    `,
    [currentUser.id, targetUserId]
  )

  if (!rows[0]) throw new Error('Blocage impossible')
  return { success: true }
}

export async function unblockMember(targetUserId: string) {
  const currentUser = await requireCurrentUser()
  validateTarget(currentUser.id, targetUserId)

  await sql.query(
    `DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [currentUser.id, targetUserId]
  )
  return { success: true }
}

export async function reportMember(input: {
  targetUserId: string
  reason: MemberReportReason
  details?: string
  conversationId?: string
  messageId?: string
}) {
  const currentUser = await requireCurrentUser()
  validateTarget(currentUser.id, input.targetUserId)
  if (!reportReasons.includes(input.reason)) {
    throw new Error('Motif de signalement invalide')
  }
  if (input.conversationId && !uuidPattern.test(input.conversationId)) {
    throw new Error('Conversation invalide')
  }
  if (input.messageId && !uuidPattern.test(input.messageId)) {
    throw new Error('Message invalide')
  }
  if (input.messageId && !input.conversationId) {
    throw new Error('Une reference de message exige sa conversation')
  }

  const details = input.details?.trim().slice(0, 1000) || null
  // A report with neither a referenced message nor a written account gives the
  // reviewer nothing to examine.
  if (input.reason === 'paid_sexual_solicitation' && !input.messageId && (details?.length || 0) < MIN_DECLARATION_LENGTH) {
    throw new Error(`Décrivez les faits en au moins ${MIN_DECLARATION_LENGTH} caractères, ou signalez le message concerné depuis la conversation`)
  }
  let report: { id: string } | undefined
  let moderationCaseId: string | null = null
  if (input.reason === 'paid_sexual_solicitation') {
    const [created] = await sql.query<Array<{ report_id: string; investigation_id: string }>>(
      `WITH report AS (
         INSERT INTO user_reports (reporter_id, reported_id, conversation_id, reason, details)
         SELECT $1, $2, $3, $4, $5
         WHERE ($3::uuid IS NULL OR EXISTS (
           SELECT 1 FROM conversation_participants reporter
           JOIN conversation_participants subject ON subject.conversation_id = reporter.conversation_id
           WHERE reporter.conversation_id = $3 AND reporter.user_id = $1 AND subject.user_id = $2
         )) AND ($6::uuid IS NULL OR EXISTS (
           SELECT 1 FROM messages m WHERE m.id = $6 AND m.conversation_id = $3 AND m.sender_id = $2
         ))
         RETURNING id
       ), investigation AS (
         INSERT INTO moderation_investigations (subject_user_id, category, priority)
         SELECT $2, 'paid_solicitation', 100 FROM report
         ON CONFLICT (subject_user_id) DO UPDATE SET
           category = 'paid_solicitation', priority = GREATEST(moderation_investigations.priority, 100), updated_at = NOW()
         RETURNING id
       ), queued AS (
       INSERT INTO moderation_queue (
         source_type, source_id, user_id, reporter_id, conversation_id,
         severity, status, reason, excerpt, metadata, score, outcome,
         policy_version, subject_pseudonym, retention_until, investigation_id
       ) SELECT
         CASE WHEN $6::uuid IS NULL THEN 'user' ELSE 'message' END,
         COALESCE($6::uuid, $2), $2, $1, $3, 'high', 'new',
         'Signalement membre : sollicitation sexuelle rémunérée ou contre avantage',
         CASE WHEN $6::uuid IS NULL THEN NULL ELSE (SELECT LEFT(content, 1000) FROM messages WHERE id = $6) END,
         JSONB_BUILD_OBJECT('reportId', report.id, 'automationContributed', false,
           'evidence', JSONB_BUILD_OBJECT(
             'kind', CASE WHEN $6::uuid IS NULL THEN 'member_declaration' ELSE 'authorized_message_reference' END,
             'status', CASE WHEN $6::uuid IS NULL THEN 'unverified' ELSE 'reference_authorized' END,
             'description', $5::text
           )), 0, 'hold', 'member-report-2026-07-15', $7,
         NOW() + INTERVAL '365 days', investigation.id
       FROM report CROSS JOIN investigation
       RETURNING id
       )
       SELECT report.id AS report_id, investigation.id AS investigation_id
       FROM report CROSS JOIN investigation CROSS JOIN queued`,
      [
        currentUser.id,
        input.targetUserId,
        input.conversationId || null,
        input.reason,
        details,
        input.messageId || null,
        `Membre-${input.targetUserId.slice(0, 8)}`
      ]
    )
    if (!created) throw new Error('Signalement impossible')
    report = { id: created.report_id }
    moderationCaseId = created.investigation_id
  } else {
    [report] = await sql.query<Array<{ id: string }>>(
      `INSERT INTO user_reports (reporter_id, reported_id, conversation_id, reason, details)
       SELECT $1, $2, $3, $4, $5
       WHERE ($3::uuid IS NULL OR EXISTS (
         SELECT 1 FROM conversation_participants reporter
         JOIN conversation_participants subject ON subject.conversation_id = reporter.conversation_id
         WHERE reporter.conversation_id = $3 AND reporter.user_id = $1 AND subject.user_id = $2
       )) AND ($6::uuid IS NULL OR EXISTS (
         SELECT 1 FROM messages m WHERE m.id = $6 AND m.conversation_id = $3 AND m.sender_id = $2
       ))
       RETURNING id`,
      [currentUser.id, input.targetUserId, input.conversationId || null, input.reason, details, input.messageId || null]
    )
    if (!report) throw new Error('Signalement impossible')
  }

  const reviewers = await sql.query<Array<{ id: string; role: string }>>(
    `SELECT id, role FROM users WHERE role IN ('admin', 'community_moderator') AND COALESCE(is_banned, false) = false`,
    []
  ) || []
  await Promise.all(reviewers.map(reviewer => createAppNotification({
    userId: reviewer.id,
    type: 'member_report',
    title: 'Nouveau signalement membre',
    description: 'Un dossier confidentiel attend un examen humain.',
    link: moderationCaseId ? `/moderation/${moderationCaseId}` : '/admin/diagnostic',
    priority: 'high',
    category: 'moderation',
    audience: reviewer.role === 'admin' ? 'admin' : 'user',
    metadata: { reportId: report.id, caseId: moderationCaseId },
    createdBy: currentUser.id
  })))

  return { success: true, reportId: report.id }
}
