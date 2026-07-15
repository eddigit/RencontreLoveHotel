"use server"

import { createAppNotification } from '@/actions/notification-actions'
import { sql } from '@/lib/db'
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
}) {
  const currentUser = await requireCurrentUser()
  validateTarget(currentUser.id, input.targetUserId)
  if (!reportReasons.includes(input.reason)) {
    throw new Error('Motif de signalement invalide')
  }
  if (input.conversationId && !uuidPattern.test(input.conversationId)) {
    throw new Error('Conversation invalide')
  }

  const details = input.details?.trim().slice(0, 1000) || null
  const [report] = await sql.query<Array<{ id: string }>>(
    `
      INSERT INTO user_reports (
        reporter_id, reported_id, conversation_id, reason, details
      )
      SELECT $1, $2, $3, $4, $5
      WHERE $3::uuid IS NULL OR EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = $3 AND user_id = $1
      )
      RETURNING id
    `,
    [currentUser.id, input.targetUserId, input.conversationId || null, input.reason, details]
  )
  if (!report) throw new Error('Signalement impossible')

  let moderationCaseId: string | null = null
  if (input.reason === 'paid_sexual_solicitation') {
    const [moderationCase] = await sql.query<Array<{ id: string }>>(
      `INSERT INTO moderation_queue (
         source_type, source_id, user_id, reporter_id, conversation_id,
         severity, status, reason, excerpt, metadata, score, outcome,
         policy_version, subject_pseudonym, retention_until
       ) VALUES (
         'user', $1, $1, $2, $3, 'high', 'new',
         'Signalement membre : sollicitation sexuelle rémunérée ou contre avantage',
         $4, $5::jsonb, 0, 'hold', 'member-report-2026-07-15', $6,
         NOW() + INTERVAL '365 days'
       )
       RETURNING id`,
      [
        input.targetUserId,
        currentUser.id,
        input.conversationId || null,
        details,
        JSON.stringify({ reportId: report.id, automationContributed: false }),
        `Membre-${input.targetUserId.slice(0, 8)}`
      ]
    )
    moderationCaseId = moderationCase?.id || null
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
