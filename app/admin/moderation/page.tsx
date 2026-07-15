'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Ban,
  ListChecks,
  MessageSquareWarning,
  ShieldAlert
} from 'lucide-react'
import MainLayout from '@/components/layout/main-layout'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import {
  createModerationKeyword,
  getModerationDashboard,
  type AdminModerationDashboard,
  type ModerationSeverity
} from '@/actions/admin-moderation-actions'

const severityOptions: ModerationSeverity[] = ['low', 'medium', 'high', 'critical']

export default function AdminModerationPage () {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<AdminModerationDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingKeyword, setSavingKeyword] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [severity, setSeverity] = useState<ModerationSeverity>('medium')
  const [status, setStatus] = useState('')

  async function loadDashboard () {
    setLoading(true)
    try {
      setDashboard(await getModerationDashboard())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function handleCreateKeyword (event: FormEvent) {
    event.preventDefault()
    if (!keyword.trim()) return

    setSavingKeyword(true)
    setStatus('')
    try {
      await createModerationKeyword({
        keyword,
        severity,
        action: severity === 'critical' || severity === 'high' ? 'escalate' : 'flag',
        createdBy: user?.id
      })
      setKeyword('')
      setStatus('Regle de moderation ajoutee.')
      await loadDashboard()
    } catch (error) {
      setStatus('Impossible d’ajouter cette regle.')
    } finally {
      setSavingKeyword(false)
    }
  }

  const counts = dashboard?.counts

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container mx-auto px-4 py-10'>
          <AdminHeader user={user} />
          <AdminTabs />

          <div className='mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <h1 className='text-2xl font-bold'>Centre de moderation</h1>
              <p className='mt-2 max-w-3xl text-sm text-muted-foreground'>
                Pilotage des mots-cles, alertes messages, bannissements et
                actions sensibles. Les alertes critiques notifient les admins.
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button asChild variant='outline'>
                <Link href='/moderation'>Ouvrir les dossiers ciblés</Link>
              </Button>
            </div>
          </div>

          {status && (
            <div className='mb-5 rounded-lg border border-[#ff8cc8]/30 bg-[#ff3b8b]/10 px-4 py-3 text-sm text-white'>
              {status}
            </div>
          )}

          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-5'>
            <ModerationStat
              title='Alertes ouvertes'
              value={loading ? '...' : counts?.pendingItems || 0}
              icon={ListChecks}
            />
            <ModerationStat
              title='Haute priorite'
              value={loading ? '...' : counts?.highSeverityItems || 0}
              icon={ShieldAlert}
            />
            <ModerationStat
              title='Mots-cles actifs'
              value={loading ? '...' : counts?.activeKeywords || 0}
              icon={MessageSquareWarning}
            />
            <ModerationStat
              title='Membres bannis'
              value={loading ? '...' : counts?.bannedMembers || 0}
              icon={Ban}
            />
            <ModerationStat
              title='Messages 24h'
              value={loading ? '...' : counts?.messagesLast24h || 0}
              icon={AlertTriangle}
            />
          </div>

          <div className='mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]'>
            <Card>
              <CardHeader>
                <CardTitle>Regles par mots-cles</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateKeyword} className='space-y-3'>
                  <input
                    value={keyword}
                    onChange={event => setKeyword(event.target.value)}
                    className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#ff8cc8]'
                    placeholder='Mot-cle a surveiller'
                  />
                  <select
                    value={severity}
                    onChange={event => setSeverity(event.target.value as ModerationSeverity)}
                    className='w-full rounded-md border border-white/10 bg-[#241035] px-3 py-2 text-sm text-white outline-none focus:border-[#ff8cc8]'
                  >
                    {severityOptions.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <Button
                    type='submit'
                    disabled={savingKeyword || !keyword.trim()}
                    className='w-full'
                  >
                    {savingKeyword ? 'Enregistrement...' : 'Ajouter la regle'}
                  </Button>
                </form>

                <div className='mt-5 space-y-2'>
                  {dashboard?.keywordRules.length ? (
                    dashboard.keywordRules.map(rule => (
                      <div
                        key={rule.id}
                        className='flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm'
                      >
                        <span className='font-semibold'>{rule.keyword}</span>
                        <span className='rounded-full bg-[#ff3b8b]/20 px-2 py-1 text-xs text-[#ffb3d7]'>
                          {rule.severity}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      Aucune regle active pour le moment.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File de moderation recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {dashboard?.recentItems.length ? (
                    dashboard.recentItems.map(item => (
                      <div
                        key={item.id}
                        className='rounded-lg border border-white/10 bg-white/5 p-4'
                      >
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <div className='font-semibold'>
                            {item.source_type} · {item.reason}
                          </div>
                          <div className='flex gap-2 text-xs'>
                            <span className='rounded-full bg-[#ff3b8b]/20 px-2 py-1 text-[#ffb3d7]'>
                              {item.severity}
                            </span>
                            <span className='rounded-full bg-white/10 px-2 py-1'>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        {item.excerpt && (
                          <p className='mt-2 line-clamp-3 text-sm text-muted-foreground'>
                            {item.excerpt}
                          </p>
                        )}
                        {item.matched_keywords?.length > 0 && (
                          <p className='mt-2 text-xs text-muted-foreground'>
                            Mots-cles : {item.matched_keywords.join(', ')}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      Aucune alerte en file pour le moment.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}

function ModerationStat ({
  title,
  value,
  icon: Icon
}: {
  title: string
  value: number | string
  icon: typeof AlertTriangle
}) {
  return (
    <Card>
      <CardContent className='p-5'>
        <Icon className='mb-4 h-5 w-5 text-[#ff8cc8]' />
        <div className='text-3xl font-black'>{value}</div>
        <p className='mt-1 text-sm text-muted-foreground'>{title}</p>
      </CardContent>
    </Card>
  )
}
