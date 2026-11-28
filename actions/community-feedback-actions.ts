"use server"

import { getServerSession } from 'next-auth'
import nodemailer from 'nodemailer'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { ensureFeedbackSchema } from '@/lib/community-feedback-schema'
import { FEEDBACK_RECIPIENT_EMAIL } from '@/lib/community-feedback-config'
import { createAppNotificationInternal as createAppNotification } from '@/lib/notification-service'
import { requireAdmin } from '@/lib/server-auth'
import { getUserByEmail } from '@/lib/user-service'

export type CommunityFeedbackKind = 'bug' | 'suggestion'
export type CommunityFeedbackStatus = 'open' | 'in_progress' | 'resolved'

export type CommunityFeedbackInput = {
  kind: CommunityFeedbackKind
  message: string
  page?: string
  stepsToReproduce?: string
  expected?: string
  observed?: string
  version?: string
  submissionId?: string
}

export type CommunityFeedbackAdminFilters = {
  status?: CommunityFeedbackStatus
  kind?: CommunityFeedbackKind
  page?: number
  pageSize?: number
}

export type CommunityFeedbackAdminItem = {
  id: string
  reporter_name: string
  kind: CommunityFeedbackKind
  message: string
  page: string
  status: CommunityFeedbackStatus
  created_at: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeText(value: string | undefined, maxLength: number) {
  return (value || '').trim().replace(/\r\n/g, '\n').slice(0, maxLength)
}

function normalizeFeedbackPage(value: string | undefined) {
  const raw = normalizeText(value, 180)
  if (!raw) return 'Accueil communauté'
  try {
    return new URL(raw, 'https://rencontrelovehotel.com').pathname.slice(0, 180) || 'Accueil communauté'
  } catch {
    return 'Accueil communauté'
  }
}

function normalizeFeedbackVersion(value: string | undefined) {
  const version = normalizeText(value, 80).replace(/[^a-zA-Z0-9._ -]/g, '')
  return version || 'Version non disponible'
}

function normalizeFeedbackInput(input: CommunityFeedbackInput) {
  const kind = input.kind === 'bug' ? 'bug' : 'suggestion'
  const page = normalizeFeedbackPage(input.page)

  if (kind === 'bug') {
    const stepsToReproduce = normalizeText(input.stepsToReproduce, 900)
    const expected = normalizeText(input.expected, 500)
    const observed = normalizeText(input.observed, 900)
    if (stepsToReproduce.length < 4 || expected.length < 4 || observed.length < 4) {
      throw new Error('Merci de renseigner les étapes, le résultat attendu et ce qui a été observé.')
    }
    const version = normalizeFeedbackVersion(input.version)
    const message = `Étapes pour reproduire :\n${stepsToReproduce}\n\nRésultat attendu :\n${expected}\n\nRésultat observé :\n${observed}\n\nContexte technique (automatique) :\nPage : ${page}\nVersion : ${version}`
    return { kind, message, page }
  }

  const message = normalizeText(input.message, 2000)

  if (message.length < 8) {
    throw new Error('Merci de préciser votre retour en quelques mots.')
  }

  return { kind, message, page }
}

function createFeedbackTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

function normalizeFeedbackStatus(status: string): CommunityFeedbackStatus {
  if (status === 'open' || status === 'in_progress' || status === 'resolved') return status
  throw new Error('Statut de retour invalide.')
}

function normalizeFeedbackKind(kind: string): CommunityFeedbackKind {
  if (kind === 'bug' || kind === 'suggestion') return kind
  throw new Error('Type de retour invalide.')
}

function safePage(value: number | undefined) {
  return Number.isInteger(value) && value && value > 0 ? value : 1
}

function safePageSize(value: number | undefined) {
  if (!Number.isInteger(value) || !value || value < 1) return 25
  return Math.min(value, 100)
}

export async function listCommunityFeedbackAdmin(
  filters: CommunityFeedbackAdminFilters = {}
): Promise<{ items: CommunityFeedbackAdminItem[]; total: number; openBugCount: number; page: number; pageSize: number }> {
  await requireAdmin()
  await ensureFeedbackSchema()
  await recoverHistoricalCommunityFeedbackNotifications()
  const status = filters.status ? normalizeFeedbackStatus(filters.status) : null
  const kind = filters.kind ? normalizeFeedbackKind(filters.kind) : null
  const page = safePage(filters.page)
  const pageSize = safePageSize(filters.pageSize)
  const rows = await sql.query<Array<CommunityFeedbackAdminItem & { total_count: string | number; open_bug_count: string | number }>>(
    `
      SELECT id, reporter_name, kind, message, page, status, created_at,
        COUNT(*) OVER() AS total_count,
        (SELECT COUNT(*) FROM community_feedback WHERE kind = 'bug' AND status IN ('open', 'in_progress')) AS open_bug_count
      FROM community_feedback
      WHERE ($1::text IS NULL OR status = $1)
        AND ($2::text IS NULL OR kind = $2)
      ORDER BY created_at DESC, id DESC
      LIMIT $3 OFFSET $4
    `,
    [status, kind, pageSize, (page - 1) * pageSize]
  )

  let total = Number(rows[0]?.total_count || 0)
  const openBugCount = Number(rows[0]?.open_bug_count || 0)
  if (rows.length === 0 && page > 1) {
    const [count] = await sql.query<Array<{ total: string }>>(
      'SELECT COUNT(*)::text AS total FROM community_feedback WHERE ($1::text IS NULL OR status = $1) AND ($2::text IS NULL OR kind = $2)',
      [status, kind]
    )
    total = Number(count.total)
  }
  return {
    items: rows.map(({ total_count: _totalCount, open_bug_count: _openBugCount, ...item }) => item),
    total,
    openBugCount,
    page,
    pageSize
  }
}

export async function updateCommunityFeedbackStatusAdmin(
  feedbackId: string,
  status: CommunityFeedbackStatus,
  resolutionConfirmed = false
) {
  const admin = await requireAdmin()
  const normalizedStatus = normalizeFeedbackStatus(status)
  if (normalizedStatus === 'resolved' && !resolutionConfirmed) {
    throw new Error('La résolution doit être confirmée avant de clôturer ce signalement.')
  }
  await ensureFeedbackSchema()
  const [feedback] = await sql.query<Array<{ id: string }>>(
    `
      UPDATE community_feedback
      SET status = $2,
        resolved_by = CASE WHEN $2 <> 'resolved' THEN NULL WHEN status = 'resolved' THEN resolved_by ELSE $3::uuid END,
        resolved_at = CASE WHEN $2 = 'resolved' THEN COALESCE(resolved_at, CURRENT_TIMESTAMP) ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `,
    [feedbackId, normalizedStatus, admin.id]
  )

  return { success: Boolean(feedback), feedback: feedback || null }
}

async function recoverHistoricalCommunityFeedbackNotifications(limit = 100) {
  const batchSize = Math.min(Math.max(Number.isInteger(limit) ? limit : 100, 1), 250)
  return sql.query<Array<{ id: string; source_notification_id: string }>>(
    `
      WITH candidates AS (
        SELECT n.id, n.created_at, n.description, n.metadata
        FROM notifications n
        WHERE n.type = 'community_feedback'
          AND n.audience = 'admin'
          AND n.metadata ? 'kind' AND n.metadata ? 'page'
          AND n.metadata ? 'reporterEmail' AND n.metadata ? 'reporterName'
          AND n.metadata ? 'reporterId'
          -- New notifications already identify their canonical feedback record.
          AND NOT (n.metadata ? 'feedbackId')
          AND n.metadata->>'kind' IN ('bug', 'suggestion')
          AND char_length(COALESCE(n.description, '')) BETWEEN 8 AND 2000
          AND char_length(n.metadata->>'page') BETWEEN 1 AND 180
          AND char_length(n.metadata->>'reporterEmail') BETWEEN 3 AND 320
          AND char_length(n.metadata->>'reporterName') BETWEEN 1 AND 180
          AND n.metadata->>'reporterId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          AND NOT EXISTS (
            SELECT 1 FROM community_feedback cf WHERE cf.source_notification_id = n.id
          )
        ORDER BY n.created_at ASC, n.id ASC
        LIMIT $1
      )
      INSERT INTO community_feedback (
        reporter_id, reporter_email, reporter_name, kind, message, page,
        status, created_at, updated_at, source_notification_id
      )
      SELECT u.id, c.metadata->>'reporterEmail',
        c.metadata->>'reporterName', c.metadata->>'kind', c.description,
        c.metadata->>'page', 'open', c.created_at, c.created_at, c.id
      FROM candidates c
      LEFT JOIN users u ON u.id = (c.metadata->>'reporterId')::uuid
      ON CONFLICT (source_notification_id) WHERE source_notification_id IS NOT NULL DO NOTHING
      RETURNING id, source_notification_id
    `,
    [batchSize]
  )

}

export async function importHistoricalCommunityFeedbackNotifications(limit = 100) {
  await requireAdmin()
  await ensureFeedbackSchema()
  const imported = await recoverHistoricalCommunityFeedbackNotifications(limit)
  return { importedCount: imported.length, imported }
}

export async function submitCommunityFeedback(input: CommunityFeedbackInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.email) {
    return {
      success: false,
      message: 'Vous devez être connecté pour envoyer un retour.'
    }
  }

  let feedback: ReturnType<typeof normalizeFeedbackInput>
  try {
    feedback = normalizeFeedbackInput(input)
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Retour invalide.'
    }
  }

  try {
    await ensureFeedbackSchema()
    const label = feedback.kind === 'bug' ? 'Bug signalé' : 'Suggestion'
    const reporterName = session.user.name || 'Membre'
    const [persistedFeedback] = await sql.query<Array<{ id: string }>>(
      `
        INSERT INTO community_feedback (
          reporter_id, reporter_email, reporter_name, kind, message, page, status, id
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'open', COALESCE($7::uuid, gen_random_uuid()))
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `,
      [session.user.id, session.user.email, reporterName, feedback.kind, feedback.message, feedback.page, input.submissionId ?? null]
    )

    if (!persistedFeedback && input.submissionId) {
      const [existing] = await sql.query<Array<{ id: string }>>(
        'SELECT id FROM community_feedback WHERE id = $1 AND reporter_id = $2 AND kind = $3 AND message = $4 AND page = $5',
        [input.submissionId, session.user.id, feedback.kind, feedback.message, feedback.page]
      )
      if (existing) return { success: true, feedbackId: existing.id, message: 'Merci, votre retour a bien été enregistré.' }
    }
    if (!persistedFeedback) {
      throw new Error("Impossible d'enregistrer votre retour pour le moment.")
    }

    // Notifications and email are best-effort effects; persistence is canonical.
    try {
      const recipient = await getUserByEmail(FEEDBACK_RECIPIENT_EMAIL)
      if (recipient?.id) {
        await createAppNotification({
          userId: recipient.id,
          type: 'community_feedback',
          title: `${label} par ${reporterName}`,
          description: feedback.message,
          link: '/admin/idees',
          priority: feedback.kind === 'bug' ? 'high' : 'normal',
          category: 'feedback',
          audience: 'admin',
          metadata: {
            feedbackId: persistedFeedback.id,
            kind: feedback.kind,
            page: feedback.page,
            reporterId: session.user.id,
            reporterEmail: session.user.email,
            reporterName
          },
          createdBy: session.user.id
        })
      }
    } catch (error) {
      console.error('Notification de retour communauté non envoyée')
    }

    try {
      const transporter = createFeedbackTransporter()
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@rencontrelovehotel.com',
        to: FEEDBACK_RECIPIENT_EMAIL,
        subject: `[Love Hotel Rencontre] ${label}`,
        html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f102f">
          <h2>${escapeHtml(label)}</h2>
          <p><strong>Membre :</strong> ${escapeHtml(reporterName)} (${escapeHtml(session.user.email)})</p>
          <p><strong>Page :</strong> ${escapeHtml(feedback.page)}</p>
          <p><strong>Message :</strong></p>
          <div style="white-space:pre-wrap;border-left:4px solid #ff3b8b;padding:12px;background:#f9eef6">
            ${escapeHtml(feedback.message)}
          </div>
        </div>
      `,
        text: `${label}\n\nMembre: ${reporterName} (${session.user.email})\nPage: ${feedback.page}\n\n${feedback.message}`
      })
    } catch (error) {
      console.error('Email de retour communauté non envoyé')
    }

    return {
      success: true,
      feedbackId: persistedFeedback.id,
      message: 'Merci, votre retour a bien été enregistré.'
    }
  } catch (error) {
    console.error('Échec de l’enregistrement du retour communauté')
    return {
      success: false,
      message: "Impossible d'enregistrer votre retour pour le moment."
    }
  }
}
