'use server'

import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'
import { notifyAdminByEmail } from '@/lib/admin-email-notifications'
import { getBlockRelationship } from '@/lib/member-safety'
import { profileReportReasons, type ProfileReportReason } from '@/lib/member-safety-types'

const reportReasonLabels: Record<ProfileReportReason, string> = {
  harassment: 'Comportement irrespectueux ou harcèlement',
  fake_profile: 'Faux profil ou usurpation',
  inappropriate_content: 'Contenu inapproprié',
  spam: 'Sollicitation commerciale ou spam',
  dangerous_behavior: 'Comportement dangereux',
  community_rules: 'Non-respect des règles de la communauté',
  other: 'Autre'
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function requireMemberId(memberId: string) {
  if (!uuidPattern.test(memberId)) throw new Error('Profil membre invalide')
  return memberId
}

function requireOtherMember(currentUserId: string, memberId: string) {
  requireMemberId(memberId)
  if (currentUserId === memberId) {
    throw new Error('Cette action n’est pas disponible sur votre propre profil.')
  }
}

export async function getMemberSafetyState(memberId: string) {
  const currentUser = await requireCurrentUser()
  requireMemberId(memberId)

  if (currentUser.id === memberId) {
    return { blockedByMe: false, blockedMe: false, canInteract: true }
  }

  const relationship = await getBlockRelationship(currentUser.id, memberId)
  return {
    blockedByMe: relationship.blockedByA,
    blockedMe: relationship.blockedByB,
    canInteract: !relationship.blockedByA && !relationship.blockedByB
  }
}

export async function blockMember(memberId: string) {
  const currentUser = await requireCurrentUser()
  requireOtherMember(currentUser.id, memberId)

  const [target] = await sql.query<Array<{ id: string }>>(
    'SELECT id FROM users WHERE id = $1 LIMIT 1',
    [memberId]
  )
  if (!target) throw new Error('Profil membre introuvable')

  await sql.query(
    `INSERT INTO user_blocks (blocker_id, blocked_id)
     VALUES ($1, $2)
     ON CONFLICT (blocker_id, blocked_id) DO NOTHING
     RETURNING id`,
    [currentUser.id, memberId]
  )

  await sql.query(
    `DELETE FROM user_matches
     WHERE (user_id_1 = $1 AND user_id_2 = $2)
        OR (user_id_1 = $2 AND user_id_2 = $1)`,
    [currentUser.id, memberId]
  )

  return { success: true as const }
}

export async function unblockMember(memberId: string) {
  const currentUser = await requireCurrentUser()
  requireOtherMember(currentUser.id, memberId)

  await sql.query(
    'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
    [currentUser.id, memberId]
  )
  return { success: true as const }
}

export async function reportProfile(input: {
  memberId: string
  reason: ProfileReportReason
  details?: string
}) {
  const currentUser = await requireCurrentUser()
  requireOtherMember(currentUser.id, input.memberId)

  if (!profileReportReasons.includes(input.reason)) {
    throw new Error('Motif de signalement invalide')
  }

  const details = String(input.details || '').trim().slice(0, 1000) || null
  const [target] = await sql.query<Array<{ id: string; name?: string | null }>>(
    'SELECT id, name FROM users WHERE id = $1 LIMIT 1',
    [input.memberId]
  )
  if (!target) throw new Error('Profil membre introuvable')

  const [report] = await sql.query<Array<{ id: string }>>(
    `INSERT INTO profile_reports (reporter_id, reported_user_id, reason, details)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (reporter_id, reported_user_id)
     DO UPDATE SET
       reason = EXCLUDED.reason,
       details = EXCLUDED.details,
       status = 'new',
       resolved_by = NULL,
       resolution_note = NULL,
       resolved_at = NULL,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [currentUser.id, input.memberId, input.reason, details]
  )

  await sql.query(
    `INSERT INTO moderation_queue (
       source_type, source_id, user_id, severity, status, reason, excerpt, metadata
     )
     VALUES ($1, $2, $3, 'medium', 'new', $4, $5, $6::jsonb)`,
    [
      'profile',
      input.memberId,
      input.memberId,
      `Signalement profil : ${reportReasonLabels[input.reason]}`,
      details,
      JSON.stringify({ reportId: report.id, reporterId: currentUser.id })
    ]
  )

  await notifyAdminByEmail({
    kind: 'profile_reported',
    subject: `Profil signalé : ${target.name || input.memberId}`,
    title: 'Un adhérent a signalé un profil',
    details: [
      { label: 'Profil signalé', value: target.name || input.memberId },
      { label: 'Motif', value: reportReasonLabels[input.reason] },
      { label: 'Déclarant', value: currentUser.email || currentUser.id }
    ],
    message: details,
    actionPath: '/admin/moderation'
  })

  return { success: true as const, reportId: report.id }
}
