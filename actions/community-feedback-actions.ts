"use server"

import { getServerSession } from 'next-auth'
import nodemailer from 'nodemailer'
import { authOptions } from '@/lib/auth'
import { FEEDBACK_RECIPIENT_EMAIL } from '@/lib/community-feedback-config'
import { createAppNotificationInternal as createAppNotification } from '@/lib/notification-service'
import { getUserByEmail } from '@/lib/user-service'

type CommunityFeedbackKind = 'bug' | 'suggestion'

export type CommunityFeedbackInput = {
  kind: CommunityFeedbackKind
  message: string
  page?: string
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

export async function submitCommunityFeedback(input: CommunityFeedbackInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.email) {
    return {
      success: false,
      message: 'Vous devez être connecté pour envoyer un retour.'
    }
  }

  try {
    const feedback = normalizeFeedbackInput(input)
    const recipient = await getUserByEmail(FEEDBACK_RECIPIENT_EMAIL)
    const label = feedback.kind === 'bug' ? 'Bug signalé' : 'Suggestion'
    const reporterName = session.user.name || 'Membre'

    if (recipient?.id) {
      await createAppNotification({
        userId: recipient.id,
        type: 'community_feedback',
        title: `${label} par ${reporterName}`,
        description: feedback.message,
        link: '/notifications',
        priority: feedback.kind === 'bug' ? 'high' : 'normal',
        category: 'feedback',
        audience: 'admin',
        metadata: {
          kind: feedback.kind,
          page: feedback.page,
          reporterId: session.user.id,
          reporterEmail: session.user.email,
          reporterName
        },
        createdBy: session.user.id
      })
    }

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

    return {
      success: true,
      message: 'Merci, votre retour a bien été transmis.'
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
