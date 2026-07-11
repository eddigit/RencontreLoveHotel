"use server"

import nodemailer from 'nodemailer'
import { sql } from '@/lib/db'
import {
  canSendEmailForPurpose,
  type EmailPolicyReason
} from '@/lib/email-policy'
import { requireAdmin } from '@/lib/server-auth'
import { renderEmailTemplate } from '@/lib/email-template-renderer'

export type EmailAudience =
  | 'all_active'
  | 'verified'
  | 'admins'
  | 'event_interested'
  | 'manual'

export type EmailAudiencePreviewInput = {
  audience: EmailAudience
  userIds?: string[]
}

export type EmailAudiencePreview = {
  total: number
  eligible: number
  excluded: number
  reasons: Record<string, number>
}

type AudienceRow = {
  id: string
  email: string
  name?: string | null
  status?: string | null
  is_banned?: boolean | null
  campaign_opt_in?: boolean | null
  opted_out_at?: string | Date | null
  suppressed_email?: string | null
}

export type EmailTemplateSummary = {
  id: string
  name: string
  slug: string
  subject: string
  created_at?: string | Date
}

export type EmailCampaignSummary = {
  id: string
  name: string
  status: string
  eligible_count: number
  skipped_count: number
  sent_count: number
  error_count: number
  audience_filter?: EmailAudiencePreviewInput
  created_at?: string | Date
}

function incrementReason(
  reasons: Record<string, number>,
  reason: EmailPolicyReason
) {
  reasons[reason] = (reasons[reason] || 0) + 1
}

function buildAudienceClause(input: EmailAudiencePreviewInput) {
  if (input.audience === 'admins') {
    return { where: "WHERE u.role = 'admin'", params: [] as unknown[] }
  }

  if (input.audience === 'verified') {
    return { where: 'WHERE COALESCE(u.email_verified, false) = true', params: [] as unknown[] }
  }

  if (input.audience === 'event_interested') {
    return {
      where: 'WHERE COALESCE(upref.interested_in_events, false) = true',
      params: [] as unknown[]
    }
  }

  if (input.audience === 'manual' && input.userIds?.length) {
    return { where: 'WHERE u.id = ANY($1::uuid[])', params: [input.userIds] }
  }

  return { where: '', params: [] as unknown[] }
}

function getEmailDecision(row: AudienceRow) {
  return canSendEmailForPurpose({
    purpose: 'campaign',
    requestedByUser: false,
    user: {
      status: row.status,
      isBanned: row.is_banned
    },
    preference: {
      campaignOptIn: row.campaign_opt_in,
      optedOutAt: row.opted_out_at
    },
    suppressed: Boolean(row.suppressed_email)
  })
}

function mapReasonToRecipientStatus(reason: EmailPolicyReason) {
  if (reason === 'campaign_opted_in') return 'queued'
  if (reason === 'opted_out') return 'skipped_opt_out'
  if (reason === 'suppressed') return 'skipped_suppressed'
  if (reason === 'banned_or_inactive') return 'skipped_banned'
  return 'skipped_no_consent'
}

async function fetchAudienceRows(input: EmailAudiencePreviewInput) {
  const clause = buildAudienceClause(input)
  return sql.query<AudienceRow[]>(
    `
      SELECT
        u.id,
        u.email,
        u.name,
        u.status,
        u.is_banned,
        ep.campaign_opt_in,
        ep.opted_out_at,
        es.email AS suppressed_email
      FROM users u
      LEFT JOIN email_preferences ep ON ep.user_id = u.id
      LEFT JOIN email_suppression_list es ON lower(es.email) = lower(u.email)
      LEFT JOIN user_preferences upref ON upref.user_id = u.id
      ${clause.where}
      ORDER BY u.created_at DESC
    `,
    clause.params
  )
}

function summarizeAudience(rows: AudienceRow[]): EmailAudiencePreview {
  const reasons: Record<string, number> = {}
  let eligible = 0

  for (const row of rows) {
    const decision = getEmailDecision(row)
    incrementReason(reasons, decision.reason)
    if (decision.allowed) eligible += 1
  }

  return {
    total: rows.length,
    eligible,
    excluded: rows.length - eligible,
    reasons
  }
}

export async function previewEmailAudience(
  input: EmailAudiencePreviewInput
): Promise<EmailAudiencePreview> {
  await requireAdmin()

  try {
    const rows = await fetchAudienceRows(input)
    return summarizeAudience(rows)
  } catch (error) {
    console.warn('Apercu audience email indisponible:', error)
    return {
      total: 0,
      eligible: 0,
      excluded: 0,
      reasons: {}
    }
  }
}

export async function listEmailTemplates(): Promise<EmailTemplateSummary[]> {
  await requireAdmin()

  return sql.query<EmailTemplateSummary[]>(`
    SELECT id, name, slug, subject, created_at
    FROM email_templates
    WHERE purpose = 'campaign'
    ORDER BY created_at DESC
    LIMIT 20
  `)
}

export async function listEmailCampaigns(): Promise<EmailCampaignSummary[]> {
  await requireAdmin()

  return sql.query<EmailCampaignSummary[]>(`
    SELECT id, name, status, eligible_count, skipped_count, sent_count,
           error_count, audience_filter, created_at
    FROM email_campaigns
    ORDER BY created_at DESC
    LIMIT 20
  `)
}

export async function createEmailTemplate(input: {
  name: string
  slug: string
  subject: string
  bodyHtml: string
  bodyText?: string
  preheader?: string
  ctaLabel?: string
  ctaUrl?: string
  createdBy?: string
}) {
  await requireAdmin()

  const [template] = await sql.query(
    `
      INSERT INTO email_templates (
        name, slug, purpose, subject, preheader, body_html, body_text,
        cta_label, cta_url, created_by
      )
      VALUES ($1, $2, 'campaign', $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      input.name,
      input.slug,
      input.subject,
      input.preheader || null,
      input.bodyHtml,
      input.bodyText || null,
      input.ctaLabel || null,
      input.ctaUrl || null,
      input.createdBy || null
    ]
  )

  return template
}

export async function createEmailCampaignDraft(input: {
  name: string
  templateId?: string
  audienceFilter: EmailAudiencePreviewInput
  createdBy?: string
}) {
  await requireAdmin()

  const preview = await previewEmailAudience(input.audienceFilter)
  const [campaign] = await sql.query(
    `
      INSERT INTO email_campaigns (
        template_id, name, audience_filter, status, created_by,
        eligible_count, skipped_count
      )
      VALUES ($1, $2, $3::jsonb, 'draft', $4, $5, $6)
      RETURNING *
    `,
    [
      input.templateId || null,
      input.name,
      JSON.stringify(input.audienceFilter),
      input.createdBy || null,
      preview.eligible,
      preview.excluded
    ]
  )

  return { campaign, preview }
}

export async function prepareCampaignRecipients(campaignId: string) {
  await requireAdmin()

  const campaigns = await sql.query<Array<{ audience_filter: EmailAudiencePreviewInput }>>(
    'SELECT audience_filter FROM email_campaigns WHERE id = $1 LIMIT 1',
    [campaignId]
  )
  const campaign = campaigns[0]
  if (!campaign) {
    throw new Error('Campagne introuvable')
  }

  const rows = await fetchAudienceRows(campaign.audience_filter)
  const preview = summarizeAudience(rows)

  for (const row of rows) {
    const decision = getEmailDecision(row)
    const status = mapReasonToRecipientStatus(decision.reason)

    await sql.query(
      `
        INSERT INTO email_campaign_recipients (
          campaign_id, user_id, email, status, skip_reason
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (campaign_id, email)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          status = EXCLUDED.status,
          skip_reason = EXCLUDED.skip_reason
      `,
      [
        campaignId,
        row.id || null,
        row.email,
        status,
        decision.allowed ? null : decision.reason
      ]
    )
  }

  await sql.query(
    `
      UPDATE email_campaigns
      SET eligible_count = $2,
          skipped_count = $3,
          status = CASE WHEN $2 > 0 THEN 'ready' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [campaignId, preview.eligible, preview.excluded]
  )

  return preview
}

type PreparedCampaign = {
  id: string
  name: string
  subject: string
  body_html: string
  body_text?: string | null
  cta_url?: string | null
  audience_filter: EmailAudiencePreviewInput
}

type PreparedRecipient = {
  id: string
  user_id: string
  email: string
  name?: string | null
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function smtpReady() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

export async function sendPreparedEmailCampaign(campaignId: string) {
  const admin = await requireAdmin()
  if (!smtpReady()) throw new Error('Service email non configuré')

  // Recheck recipient eligibility immediately before claiming the campaign.
  await sql.query(
    `
      UPDATE email_campaign_recipients r
      SET status = CASE
            WHEN COALESCE(u.is_banned, false) = true OR COALESCE(u.status, 'active') <> 'active'
              THEN 'skipped_banned'
            WHEN es.email IS NOT NULL THEN 'skipped_suppressed'
            WHEN ep.opted_out_at IS NOT NULL THEN 'skipped_opt_out'
            ELSE 'skipped_no_consent'
          END,
          skip_reason = CASE
            WHEN COALESCE(u.is_banned, false) = true OR COALESCE(u.status, 'active') <> 'active'
              THEN 'banned_or_inactive'
            WHEN es.email IS NOT NULL THEN 'suppressed'
            WHEN ep.opted_out_at IS NOT NULL THEN 'opted_out'
            ELSE 'missing_campaign_opt_in'
          END
      FROM users u
      LEFT JOIN email_preferences ep ON ep.user_id = u.id
      LEFT JOIN email_suppression_list es ON lower(es.email) = lower(u.email)
      WHERE r.campaign_id = $1
        AND r.user_id = u.id
        AND r.status = 'queued'
        AND (
          COALESCE(u.is_banned, false) = true
          OR COALESCE(u.status, 'active') <> 'active'
          OR es.email IS NOT NULL
          OR ep.opted_out_at IS NOT NULL
          OR COALESCE(ep.campaign_opt_in, false) = false
        )
    `,
    [campaignId]
  )

  const campaigns = await sql.query<PreparedCampaign[]>(
    `
      WITH claimed AS (
        UPDATE email_campaigns
        SET status = 'sending', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'ready'
        RETURNING *
      )
      SELECT c.id, c.name, c.audience_filter, t.subject, t.body_html, t.body_text, t.cta_url
      FROM claimed c
      JOIN email_templates t ON t.id = c.template_id
    `,
    [campaignId]
  )
  const campaign = campaigns[0]
  if (!campaign) throw new Error('La campagne doit être prête avant envoi')
  if (campaign.audience_filter?.audience !== 'manual') {
    await sql.query(
      `UPDATE email_campaigns SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [campaignId]
    )
    throw new Error('L’envoi direct est limité aux sélections manuelles')
  }

  const recipients = await sql.query<PreparedRecipient[]>(
    `
      SELECT r.id, r.user_id, r.email, u.name
      FROM email_campaign_recipients r
      JOIN users u ON u.id = r.user_id
      JOIN email_preferences ep ON ep.user_id = u.id
      LEFT JOIN email_suppression_list es ON lower(es.email) = lower(r.email)
      WHERE r.campaign_id = $1
        AND r.status = 'queued'
        AND COALESCE(u.status, 'active') = 'active'
        AND COALESCE(u.is_banned, false) = false
        AND ep.campaign_opt_in = true
        AND ep.opted_out_at IS NULL
        AND es.email IS NULL
      ORDER BY r.created_at ASC
      LIMIT 100
    `,
    [campaignId]
  )

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://rencontrelovehotel.com'
  ).replace(/\/$/, '')
  const preferencesUrl = `${baseUrl}/email-preferences`
  const ctaUrl = campaign.cta_url
    ? `${baseUrl}${campaign.cta_url.startsWith('/') ? campaign.cta_url : `/${campaign.cta_url}`}`
    : baseUrl

  let sentCount = 0
  let errorCount = 0

  for (const recipient of recipients) {
    const name = recipient.name?.trim() || 'membre'
    const variables = {
      name,
      'cta-url': ctaUrl,
      'unsubscribe-link': preferencesUrl
    }
    const rendered = renderEmailTemplate(
      {
        subject: campaign.subject,
        bodyHtml: campaign.body_html,
        bodyText: campaign.body_text
      },
      variables
    )
    const renderedHtml = renderEmailTemplate(
      { subject: '', bodyHtml: campaign.body_html },
      { ...variables, name: escapeHtml(name) }
    ).bodyHtml

    try {
      const result = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@rencontrelovehotel.com',
        to: recipient.email,
        subject: rendered.subject,
        html: `${renderedHtml}<hr><p style="font-size:12px;color:#666">Vous recevez cet email selon vos préférences Love Hotel Rencontres. <a href="${preferencesUrl}">Gérer mes préférences email</a>.</p>`,
        text: `${rendered.bodyText}\n\nGérer mes préférences email : ${preferencesUrl}`
      })
      sentCount += 1
      await sql.query(
        `UPDATE email_campaign_recipients SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = $1`,
        [recipient.id]
      )
      await sql.query(
        `
          INSERT INTO email_send_logs (
            campaign_id, user_id, email, purpose, status, provider_message_id, metadata
          ) VALUES ($1, $2, $3, 'campaign', 'sent', $4, $5::jsonb)
        `,
        [campaignId, recipient.user_id, recipient.email, result.messageId || null, JSON.stringify({ adminId: admin.id })]
      )
    } catch (error) {
      errorCount += 1
      const errorMessage = error instanceof Error ? error.message.slice(0, 500) : 'Erreur SMTP'
      await sql.query(
        `UPDATE email_campaign_recipients SET status = 'error', error_message = $2 WHERE id = $1`,
        [recipient.id, errorMessage]
      )
      await sql.query(
        `
          INSERT INTO email_send_logs (
            campaign_id, user_id, email, purpose, status, error_message, metadata
          ) VALUES ($1, $2, $3, 'campaign', 'error', $4, $5::jsonb)
        `,
        [campaignId, recipient.user_id, recipient.email, errorMessage, JSON.stringify({ adminId: admin.id })]
      )
    }
  }

  if (sentCount > 0) {
    await sql.query(
      `
        UPDATE email_campaigns
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP,
            sent_count = $2, error_count = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [campaignId, sentCount, errorCount]
    )
  } else {
    await sql.query(
      `
        UPDATE email_campaigns
        SET status = 'failed', error_count = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [campaignId, errorCount]
    )
  }

  return { sentCount, errorCount }
}
