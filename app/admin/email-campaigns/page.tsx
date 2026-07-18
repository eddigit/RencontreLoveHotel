'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Mail, ShieldCheck, Send, Users } from 'lucide-react'
import MainLayout from '@/components/layout/main-layout'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import {
  createEmailCampaignDraft,
  createEmailTemplate,
  listEmailCampaigns,
  listEmailTemplates,
  prepareCampaignRecipients,
  previewEmailAudience,
  sendPreparedEmailCampaign,
  type EmailAudience,
  type EmailAudiencePreview,
  type EmailCampaignSummary,
  type EmailTemplateSummary
} from '@/actions/email-campaign-actions'

const audienceLabels: Record<EmailAudience, string> = {
  all_active: 'Tous les membres actifs consentants',
  verified: 'Emails verifies consentants',
  admins: 'Admins uniquement',
  event_interested: 'Interesses par les evenements',
  manual: 'Selection manuelle'
}

export default function AdminEmailCampaignsPage () {
  const { user } = useAuth()
  const [preview, setPreview] = useState<EmailAudiencePreview | null>(null)
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preparingCampaignId, setPreparingCampaignId] = useState<string | null>(null)
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [audience, setAudience] = useState<EmailAudience>('all_active')
  const [form, setForm] = useState({
    name: 'Invitation apero jacuzzi',
    subject: 'Une nouvelle experience Love Hotel vous attend',
    bodyHtml:
      '<p>Bonjour [name],</p><p>Nous preparons une experience rencontre Love Hotel autour des Love Rooms, jacuzzi et rideaux ouverts.</p><p><a href="[cta-url]">Voir les experiences</a></p>',
    bodyText:
      'Bonjour [name], une experience rencontre Love Hotel vous attend. Voir les experiences : [cta-url]'
  })

  const audienceFilter = useMemo(() => ({ audience }), [audience])

  async function loadData () {
    setLoading(true)
    try {
      const [previewResult, templatesResult, campaignsResult] = await Promise.all([
        previewEmailAudience(audienceFilter),
        listEmailTemplates().catch(() => []),
        listEmailCampaigns().catch(() => [])
      ])
      setPreview(previewResult)
      setTemplates(templatesResult)
      setCampaigns(campaignsResult)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [audienceFilter])

  async function handleCreateDraft (event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setStatus('')
    try {
      const slug = `${form.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}-${Date.now()}`

      const template = await createEmailTemplate({
        name: form.name,
        slug,
        subject: form.subject,
        bodyHtml: form.bodyHtml,
        bodyText: form.bodyText,
        ctaLabel: 'Voir les experiences',
        ctaUrl: '/events',
        createdBy: user?.id
      })

      await createEmailCampaignDraft({
        name: form.name,
        templateId: template?.id,
        audienceFilter,
        createdBy: user?.id
      })

      setStatus('Brouillon cree. Vous pouvez maintenant preparer les destinataires.')
      await loadData()
    } catch (error) {
      setStatus('Impossible de creer le brouillon email.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePrepareRecipients (campaignId: string) {
    setPreparingCampaignId(campaignId)
    setStatus('')
    try {
      const result = await prepareCampaignRecipients(campaignId)
      setStatus(
        `${result.eligible} destinataire(s) prepare(s), ${result.excluded} exclu(s) par consentement ou moderation.`
      )
      await loadData()
    } catch (error) {
      setStatus('Impossible de preparer les destinataires de cette campagne.')
    } finally {
      setPreparingCampaignId(null)
    }
  }

  async function handleSendCampaign(campaign: EmailCampaignSummary) {
    if (!window.confirm(
      `Envoyer maintenant « ${campaign.name} » à ${campaign.eligible_count} destinataire(s) éligible(s) ?`
    )) return

    setSendingCampaignId(campaign.id)
    setStatus('')
    try {
      const result = await sendPreparedEmailCampaign(campaign.id)
      setStatus(`${result.sentCount} email(s) envoyé(s), ${result.errorCount} erreur(s).`)
      await loadData()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Envoi de la campagne impossible.')
    } finally {
      setSendingCampaignId(null)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container mx-auto px-4 py-10'>
          <AdminHeader user={user} />
          <AdminTabs />

          <div className='mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div>
              <h1 className='text-2xl font-bold'>Campagnes email</h1>
              <p className='mt-2 max-w-3xl text-sm text-muted-foreground'>
                Templates, audiences et consentements. Aucun membre opt-out,
                supprime, banni ou non consentant ne peut entrer dans la file.
              </p>
            </div>
            <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>
              <a href='#campaigns'>
              <Send className='mr-2 h-4 w-4' />
              Voir les envois
              </a>
            </Button>
          </div>

          {status && (
            <div className='mb-5 rounded-lg border border-[#ff8cc8]/30 bg-[#ff3b8b]/10 px-4 py-3 text-sm text-white'>
              {status}
            </div>
          )}

          <div className='grid gap-5 md:grid-cols-3'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Users className='h-5 w-5 text-[#ff8cc8]' />
                  Audience eligible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-3xl font-black'>
                  {loading ? '...' : preview?.eligible || 0}
                </div>
                <p className='mt-2 text-sm text-muted-foreground'>
                  Membres avec consentement campagne actif.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <ShieldCheck className='h-5 w-5 text-[#94ffc9]' />
                  Exclus proteges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-3xl font-black'>
                  {loading ? '...' : preview?.excluded || 0}
                </div>
                <p className='mt-2 text-sm text-muted-foreground'>
                  Opt-out, absence de consentement, suppression list ou compte banni.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Mail className='h-5 w-5 text-[#ffd166]' />
                  Regle email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-base font-bold'>Consentement obligatoire</div>
                <p className='mt-2 text-sm text-muted-foreground'>
                  Une campagne ne part qu’après préparation et confirmation manuelle.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className='mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
            <Card>
              <CardHeader>
                <CardTitle>Nouveau template campagne</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateDraft} className='space-y-4'>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <label className='space-y-1 text-sm'>
                      <span className='text-muted-foreground'>Nom campagne</span>
                      <input
                        value={form.name}
                        onChange={event => setForm({ ...form, name: event.target.value })}
                        className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                      />
                    </label>
                    <label className='space-y-1 text-sm'>
                      <span className='text-muted-foreground'>Audience</span>
                      <select
                        value={audience}
                        onChange={event => setAudience(event.target.value as EmailAudience)}
                        className='w-full rounded-md border border-white/10 bg-[#241035] px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                      >
                        {Object.entries(audienceLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className='block space-y-1 text-sm'>
                    <span className='text-muted-foreground'>Sujet</span>
                    <input
                      value={form.subject}
                      onChange={event => setForm({ ...form, subject: event.target.value })}
                      className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                    />
                  </label>

                  <label className='block space-y-1 text-sm'>
                    <span className='text-muted-foreground'>HTML</span>
                    <textarea
                      value={form.bodyHtml}
                      onChange={event => setForm({ ...form, bodyHtml: event.target.value })}
                      rows={7}
                      className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                    />
                  </label>

                  <label className='block space-y-1 text-sm'>
                    <span className='text-muted-foreground'>Version texte</span>
                    <textarea
                      value={form.bodyText}
                      onChange={event => setForm({ ...form, bodyText: event.target.value })}
                      rows={4}
                      className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                    />
                  </label>

                  <Button
                    type='submit'
                    disabled={saving || !form.name.trim() || !form.subject.trim()}
                    className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'
                  >
                    {saving ? 'Creation...' : 'Creer le brouillon'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className='space-y-6'>
              <Card id='campaigns'>
                <CardHeader>
                  <CardTitle>Campagnes recentes</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {campaigns.length ? (
                    campaigns.map(campaign => (
                      <div
                        key={campaign.id}
                        className='rounded-lg border border-white/10 bg-white/5 p-3'
                      >
                        <div className='font-semibold'>{campaign.name}</div>
                        <div className='mt-1 text-xs text-muted-foreground'>
                          {campaign.status} · {campaign.eligible_count} eligibles ·{' '}
                          {campaign.skipped_count} exclus
                        </div>
                        <Button
                          size='sm'
                          variant='outline'
                          className='mt-3 w-full'
                          disabled={preparingCampaignId === campaign.id}
                          onClick={() => handlePrepareRecipients(campaign.id)}
                        >
                          {preparingCampaignId === campaign.id
                            ? 'Preparation...'
                            : 'Preparer les destinataires'}
                        </Button>
                        {campaign.status === 'ready' && campaign.audience_filter?.audience === 'manual' && (
                          <Button
                            size='sm'
                            className='mt-2 w-full'
                            disabled={sendingCampaignId === campaign.id}
                            onClick={() => void handleSendCampaign(campaign)}
                          >
                            <Send className='mr-2 h-4 w-4' />
                            {sendingCampaignId === campaign.id ? 'Envoi...' : 'Envoyer maintenant'}
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      Aucune campagne creee.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Templates sauvegardes</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 text-sm'>
                  {templates.length ? (
                    templates.map(template => (
                      <div
                        key={template.id}
                        className='rounded-md border border-white/10 bg-white/5 px-3 py-2'
                      >
                        <div className='font-semibold'>{template.name}</div>
                        <div className='text-muted-foreground'>{template.subject}</div>
                      </div>
                    ))
                  ) : (
                    <p className='text-muted-foreground'>Aucun template sauvegarde.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
