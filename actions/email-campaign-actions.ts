"use server"

import { sql } from '@/lib/db'
import {
  canSendEmailForPurpose,
  type EmailPolicyReason
} from '@/lib/email-policy'
import { requireAdmin } from '@/lib/server-auth'

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
           error_count, created_at
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
