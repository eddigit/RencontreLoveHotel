"use server"

import nodemailer from 'nodemailer'
import { sql } from '@/lib/db'
import { sendMessage } from '@/actions/conversation-actions'
import { createAppNotification } from '@/actions/notification-actions'
import { FEEDBACK_RECIPIENT_EMAIL } from '@/lib/community-feedback-config'
import { requireAdmin, requireCurrentUser } from '@/lib/server-auth'
import { getUserByEmail } from '@/lib/user-service'

type CommunityFeedbackKind = 'bug' | 'suggestion'
export type CommunityFeedbackStatus = 'open' | 'in_progress' | 'resolved'

export type CommunityFeedbackInput = {
  kind: CommunityFeedbackKind
  message: string
  page?: string
  requestEmailReply?: boolean
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeFeedbackInput(input: CommunityFeedbackInput) {
  const kind = input.kind === 'bug' ? 'bug' : 'suggestion'
  const message = input.message.trim().slice(0, 2000)
  const page = (input.page || 'Accueil communauté').trim().slice(0, 180)

  if (message.length < 8) {
    throw new Error('Merci de préciser votre retour en quelques mots.')
  }

  return {
    kind,
    message,
    page,
    requestEmailReply: input.requestEmailReply === true
  }
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

async function findOrCreateSupportConversation(userId: string, adminId: string) {
  const existingRows = await sql.query<{ id: string }[]>(
    `
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp_user
        ON cp_user.conversation_id = c.id
       AND cp_user.user_id = $1
      JOIN conversation_participants cp_admin
        ON cp_admin.conversation_id = c.id
       AND cp_admin.user_id = $2
      ORDER BY c.updated_at DESC
      LIMIT 1
    `,
    [userId, adminId]
  )

  if (existingRows[0]?.id) {
    await sql.query(
      `UPDATE conversations SET access_mode = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [existingRows[0].id]
    )
    return existingRows[0].id
  }

  const [conversation] = await sql.query<{ id: string }[]>(
    `INSERT INTO conversations (access_mode) VALUES ('admin') RETURNING id`,
    []
  )

  await sql.query(
    `
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES ($1, $2), ($1, $3)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `,
    [conversation.id, userId, adminId]
  )

  return conversation.id
}

export async function submitCommunityFeedback(input: CommunityFeedbackInput) {
  let currentUser
  try {
    currentUser = await requireCurrentUser()
  } catch {
    return {
      success: false,
      message: 'Vous devez être connecté pour envoyer un retour.'
    }
  }

  try {
    const feedback = normalizeFeedbackInput(input)
    const recipient = await getUserByEmail(FEEDBACK_RECIPIENT_EMAIL)
    const [reporter] = await sql.query<{ name: string; email: string }[]>(
      `SELECT name, email FROM users WHERE id = $1`,
      [currentUser.id]
    )

    if (!currentUser.email && !reporter?.email) {
      throw new Error('Votre adresse email est nécessaire pour le suivi du retour.')
    }

    if (!recipient?.id) {
      throw new Error('Aucun administrateur de support n’est configuré.')
    }

    const [supportAdmin] = await sql.query<{ id: string; role: string }[]>(
      `SELECT id, role FROM users WHERE id = $1 AND role = 'admin' LIMIT 1`,
      [recipient.id]
    )

    if (!supportAdmin) {
      throw new Error('Le destinataire du support n’est pas un administrateur actif.')
    }

    const label = feedback.kind === 'bug' ? 'Bug signalé' : 'Suggestion'
    const reporterName = reporter?.name || 'Membre'
    const reporterEmail = currentUser.email || reporter.email
    const conversationId = await findOrCreateSupportConversation(currentUser.id, supportAdmin.id)
    const [feedbackRow] = await sql.query<{ id: string }[]>(
      `
        INSERT INTO community_feedback (
          reporter_id,
          reporter_email,
          reporter_name,
          kind,
          message,
          page,
          conversation_id,
          request_email_reply
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        currentUser.id,
        reporterEmail,
        reporterName,
        feedback.kind,
        feedback.message,
        feedback.page,
        conversationId,
        feedback.requestEmailReply
      ]
    )

    const initialMessage = `${label}\nPage : ${feedback.page}\n\n${feedback.message}`
    await sql.query(
      `
        INSERT INTO messages (conversation_id, sender_id, content, is_read)
        VALUES ($1, $2, $3, false)
      `,
      [conversationId, currentUser.id, initialMessage]
    )
    await sql.query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId]
    )

    await createAppNotification({
      userId: supportAdmin.id,
      type: 'community_feedback',
      title: `${label} par ${reporterName}`,
      description: feedback.message,
      link: `/admin/feedback?feedback=${feedbackRow.id}`,
      priority: feedback.kind === 'bug' ? 'high' : 'normal',
      category: 'feedback',
      audience: 'admin',
      metadata: {
        feedbackId: feedbackRow.id,
        conversationId,
        kind: feedback.kind,
        page: feedback.page,
        reporterId: currentUser.id,
        reporterEmail,
        reporterName,
        requestEmailReply: feedback.requestEmailReply
      },
      createdBy: currentUser.id
    })

    const transporter = createFeedbackTransporter()
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@rencontrelovehotel.com',
      to: FEEDBACK_RECIPIENT_EMAIL,
      subject: `[Love Hotel Rencontre] ${label}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f102f">
          <h2>${escapeHtml(label)}</h2>
          <p><strong>Membre :</strong> ${escapeHtml(reporterName)} (${escapeHtml(reporterEmail)})</p>
          <p><strong>Page :</strong> ${escapeHtml(feedback.page)}</p>
          <p><strong>Réponse email demandée :</strong> ${feedback.requestEmailReply ? 'Oui' : 'Non'}</p>
          <p><strong>Message :</strong></p>
          <div style="white-space:pre-wrap;border-left:4px solid #ff3b8b;padding:12px;background:#f9eef6">
            ${escapeHtml(feedback.message)}
          </div>
        </div>
      `,
      text: `${label}\n\nMembre: ${reporterName} (${reporterEmail})\nPage: ${feedback.page}\nRéponse email demandée: ${feedback.requestEmailReply ? 'Oui' : 'Non'}\n\n${feedback.message}`
    })

    return {
      success: true,
      message: 'Merci, votre retour est enregistré. L’équipe pourra vous répondre dans votre messagerie.',
      feedbackId: feedbackRow.id
    }
  } catch (error) {
    console.error('Erreur retour communauté:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer votre retour pour le moment."
    }
  }
}

export async function getCommunityFeedback(status?: CommunityFeedbackStatus) {
  await requireAdmin()
  const requestedStatus = status && ['open', 'in_progress', 'resolved'].includes(status)
    ? status
    : null

  return sql.query(
    `
      SELECT
        cf.id,
        cf.reporter_id,
        cf.reporter_email,
        cf.reporter_name,
        cf.kind,
        cf.message,
        cf.page,
        cf.status,
        cf.conversation_id,
        cf.request_email_reply,
        cf.email_reply_sent_at,
        cf.created_at,
        cf.updated_at,
        u.avatar AS reporter_avatar,
        lm.content AS last_message,
        lm.created_at AS last_message_at
      FROM community_feedback cf
      LEFT JOIN users u ON u.id = cf.reporter_id
      LEFT JOIN LATERAL (
        SELECT m.content, m.created_at
        FROM messages m
        WHERE m.conversation_id = cf.conversation_id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON true
      WHERE ($1::text IS NULL OR cf.status = $1)
      ORDER BY CASE WHEN cf.status = 'open' THEN 0 WHEN cf.status = 'in_progress' THEN 1 ELSE 2 END,
               cf.created_at DESC
      LIMIT 100
    `,
    [requestedStatus]
  )
}

export async function replyToCommunityFeedback(feedbackId: string, content: string) {
  const admin = await requireAdmin()
  const normalizedFeedbackId = feedbackId.trim()
  const normalizedContent = content.trim().slice(0, 4000)

  if (normalizedContent.length < 2) {
    throw new Error('La réponse est trop courte.')
  }

  const [feedback] = await sql.query<any[]>(
    `
      SELECT id, reporter_email, reporter_name, conversation_id,
             request_email_reply, email_reply_sent_at
      FROM community_feedback
      WHERE id = $1
      LIMIT 1
    `,
    [normalizedFeedbackId]
  )

  if (!feedback?.conversation_id) {
    throw new Error('Retour membre introuvable ou sans conversation.')
  }

  const [adminParticipant] = await sql.query(
    `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
    [feedback.conversation_id, admin.id]
  )

  if (!adminParticipant) {
    throw new Error('Cette conversation support n’est pas rattachée à votre compte admin.')
  }

  await sendMessage({
    conversationId: feedback.conversation_id,
    senderId: admin.id,
    content: normalizedContent
  })

  let emailSent = false
  if (feedback.request_email_reply && feedback.reporter_email) {
    try {
      const transporter = createFeedbackTransporter()
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@rencontrelovehotel.com',
        to: feedback.reporter_email,
        subject: '[Love Hotel Rencontre] Réponse à votre retour',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f102f">
            <h2>Réponse de l’équipe Love Hotel</h2>
            <p>Bonjour ${escapeHtml(feedback.reporter_name || 'Membre')},</p>
            <div style="white-space:pre-wrap;border-left:4px solid #ff3b8b;padding:12px;background:#f9eef6">
              ${escapeHtml(normalizedContent)}
            </div>
            <p>Retrouvez l’intégralité de l’échange dans votre messagerie Love Hotel Rencontre.</p>
          </div>
        `,
        text: `Bonjour ${feedback.reporter_name || 'Membre'},\n\n${normalizedContent}\n\nRetrouvez l’échange dans votre messagerie Love Hotel Rencontre.`
      })
      await sql.query(
        `UPDATE community_feedback SET email_reply_sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [normalizedFeedbackId]
      )
      emailSent = true
    } catch (error) {
      console.error('Réponse email support non envoyée:', error)
    }
  }

  await sql.query(
    `
      UPDATE community_feedback
      SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [normalizedFeedbackId]
  )

  return { success: true, emailSent }
}

export async function updateCommunityFeedbackStatus(
  feedbackId: string,
  status: CommunityFeedbackStatus
) {
  const admin = await requireAdmin()

  if (!['open', 'in_progress', 'resolved'].includes(status)) {
    throw new Error('Statut de retour invalide.')
  }

  await sql.query(
    `
      UPDATE community_feedback
      SET status = $1,
          resolved_by = CASE WHEN $1 = 'resolved' THEN $2 ELSE NULL END,
          resolved_at = CASE WHEN $1 = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
    [status, admin.id, feedbackId.trim()]
  )

  return { success: true }
}
