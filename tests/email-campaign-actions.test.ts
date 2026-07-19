import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAdminMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

vi.mock('@/lib/server-auth', () => ({
  requireAdmin: requireAdminMock
}))

import {
  createEmailCampaignDraft,
  createEmailTemplate,
  listEmailCampaigns,
  listEmailTemplates,
  prepareCampaignRecipients,
  previewEmailAudience
} from '../actions/email-campaign-actions'
import { renderEmailTemplate } from '../lib/email-template-renderer'
import { sql } from '@/lib/db'

describe('email campaign actions', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
    requireAdminMock.mockReset()
    requireAdminMock.mockResolvedValue({ id: 'admin-1', role: 'admin' })
  })

  it('requires admin access before touching campaign data', async () => {
    requireAdminMock.mockRejectedValue(new Error('Accès administrateur requis'))

    await expect(
      previewEmailAudience({ audience: 'all_active' })
    ).rejects.toThrow('administrateur')
    await expect(listEmailTemplates()).rejects.toThrow('administrateur')
    await expect(listEmailCampaigns()).rejects.toThrow('administrateur')
    await expect(
      createEmailTemplate({
        name: 'Relance',
        slug: 'relance',
        subject: 'Bonjour',
        bodyHtml: '<p>Bonjour</p>'
      })
    ).rejects.toThrow('administrateur')
    await expect(
      createEmailCampaignDraft({
        name: 'Campagne',
        audienceFilter: { audience: 'all_active' }
      })
    ).rejects.toThrow('administrateur')
    await expect(prepareCampaignRecipients('campaign-1')).rejects.toThrow(
      'administrateur'
    )

    expect(sql.query).not.toHaveBeenCalled()
  })

  it('previews eligible and excluded campaign recipients without sending email', async () => {
    ;(sql.query as any).mockResolvedValueOnce([
      {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'optin@example.com',
        name: 'Opt In',
        status: 'active',
        is_banned: false,
        campaign_opt_in: true,
        opted_out_at: null,
        suppressed_email: null
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'noconset@example.com',
        name: 'No Consent',
        status: 'active',
        is_banned: false,
        campaign_opt_in: false,
        opted_out_at: null,
        suppressed_email: null
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        email: 'suppressed@example.com',
        name: 'Suppressed',
        status: 'active',
        is_banned: false,
        campaign_opt_in: true,
        opted_out_at: null,
        suppressed_email: 'suppressed@example.com'
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        email: 'banned@example.com',
        name: 'Banned',
        status: 'banned',
        is_banned: true,
        campaign_opt_in: true,
        opted_out_at: null,
        suppressed_email: null
      }
    ])

    const result = await previewEmailAudience({ audience: 'all_active' })

    expect(result).toEqual({
      total: 4,
      eligible: 1,
      excluded: 3,
      reasons: {
        campaign_opted_in: 1,
        missing_campaign_opt_in: 1,
        suppressed: 1,
        banned_or_inactive: 1
      }
    })
    expect(sql.query).toHaveBeenCalledWith(expect.stringContaining('FROM users u'), [])
  })

  it('renders template variables without mutating the original template', () => {
    const template = {
      subject: 'Bonjour [name]',
      bodyHtml: '<p>Rendez-vous: [event]</p><a href="[unsubscribe-link]">stop</a>',
      bodyText: 'Rendez-vous: [event] - [unsubscribe-link]'
    }

    const rendered = renderEmailTemplate(template, {
      name: 'Gilles',
      event: 'Apero jacuzzi',
      'unsubscribe-link': 'https://example.com/unsubscribe'
    })

    expect(rendered).toEqual({
      subject: 'Bonjour Gilles',
      bodyHtml:
        '<p>Rendez-vous: Apero jacuzzi</p><a href="https://example.com/unsubscribe">stop</a>',
      bodyText: 'Rendez-vous: Apero jacuzzi - https://example.com/unsubscribe'
    })
    expect(template.subject).toBe('Bonjour [name]')
  })

  it('prepares campaign recipients with explicit skipped statuses', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([{ audience_filter: { audience: 'all_active' } }])
      .mockResolvedValueOnce([
        {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'optin@example.com',
          status: 'active',
          is_banned: false,
          campaign_opt_in: true,
          opted_out_at: null,
          suppressed_email: null
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'optout@example.com',
          status: 'active',
          is_banned: false,
          campaign_opt_in: true,
          opted_out_at: new Date('2026-06-26T00:00:00Z'),
          suppressed_email: null
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const preview = await prepareCampaignRecipients(
      '99999999-9999-4999-8999-999999999999'
    )

    expect(preview.eligible).toBe(1)
    expect(preview.excluded).toBe(1)
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO email_campaign_recipients'),
      [
        '99999999-9999-4999-8999-999999999999',
        '11111111-1111-4111-8111-111111111111',
        'optin@example.com',
        'queued',
        null
      ]
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO email_campaign_recipients'),
      [
        '99999999-9999-4999-8999-999999999999',
        '22222222-2222-4222-8222-222222222222',
        'optout@example.com',
        'skipped_opt_out',
        'opted_out'
      ]
    )
  })
})
