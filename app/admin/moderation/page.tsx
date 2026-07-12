'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Ban,
  ListChecks,
  MessageSquareWarning,
  Radar,
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
  getProfileReportQueue,
  getWallModerationQueue,
  removeWallModerationItem,
  restoreWallModerationItem,
  resolveProfileReport,
  scanRecentMessagesForModeration,
  type AdminModerationDashboard,
  type ProfileReportQueueItem,
  type ProfileReportStatus,
  type ModerationSeverity,
  type WallModerationQueueItem
} from '@/actions/admin-moderation-actions'

const severityOptions: ModerationSeverity[] = ['low', 'medium', 'high', 'critical']

export default function AdminModerationPage () {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<AdminModerationDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [savingKeyword, setSavingKeyword] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [severity, setSeverity] = useState<ModerationSeverity>('medium')
  const [status, setStatus] = useState('')
  const [wallItems, setWallItems] = useState<WallModerationQueueItem[]>([])
  const [wallActionId, setWallActionId] = useState<string | null>(null)
  const [profileReports, setProfileReports] = useState<ProfileReportQueueItem[]>([])
  const [profileReportActionId, setProfileReportActionId] = useState<string | null>(null)

  async function loadDashboard () {
    setLoading(true)
    try {
      const [moderationDashboard, wallQueue, profileReportQueue] = await Promise.all([
        getModerationDashboard(),
        getWallModerationQueue(),
        getProfileReportQueue()
      ])
      setDashboard(moderationDashboard)
      setWallItems(wallQueue)
      setProfileReports(profileReportQueue)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function handleScan () {
    setScanning(true)
    setStatus('')
    try {
      const result = await scanRecentMessagesForModeration({
        limit: 250,
        adminId: user?.id
      })
      setStatus(
        `${result.flagged} alerte(s) detectee(s) sur ${result.scanned} message(s) analyses.`
      )
      await loadDashboard()
    } catch (error) {
      setStatus('Impossible de lancer le scan de moderation pour le moment.')
    } finally {
      setScanning(false)
    }
  }

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

  async function handleWallModerationAction (
    item: WallModerationQueueItem,
    action: 'restore' | 'remove'
  ) {
    setWallActionId(item.id)
    setStatus('')
    try {
      if (action === 'restore') {
        await restoreWallModerationItem({
          itemId: item.id,
          reason: 'Restauration depuis la moderation du mur'
        })
        setStatus('Contenu du mur restauré.')
      } else {
        await removeWallModerationItem({
          itemId: item.id,
          reason: 'Suppression depuis la moderation du mur'
        })
        setStatus('Contenu du mur supprimé.')
      }
      await loadDashboard()
    } catch (error) {
      setStatus('Action de moderation mur impossible pour le moment.')
    } finally {
      setWallActionId(null)
    }
  }

  async function handleProfileReportAction (
    item: ProfileReportQueueItem,
    nextStatus: Exclude<ProfileReportStatus, 'new'>
  ) {
    setProfileReportActionId(item.id)
    setStatus('')
    try {
      await resolveProfileReport({
        reportId: item.id,
        status: nextStatus,
        note: nextStatus === 'dismissed'
          ? 'Signalement classé depuis le centre de modération.'
          : nextStatus === 'actioned'
            ? 'Signalement traité depuis le centre de modération.'
            : 'Signalement pris en charge par la modération.'
      })
      setStatus('Signalement de profil mis à jour.')
      await loadDashboard()
    } catch {
      setStatus('Impossible de mettre à jour ce signalement.')
    } finally {
      setProfileReportActionId(null)
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
              <Button
                onClick={handleScan}
                disabled={scanning}
                className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'
              >
                <Radar className='mr-2 h-4 w-4' />
                {scanning ? 'Scan en cours...' : 'Scanner les messages'}
              </Button>
              <Button asChild variant='outline'>
                <Link href='/admin/messages'>Moderation messages</Link>
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

          <Card className='mt-6'>
            <CardHeader>
              <CardTitle>Signalements de profils</CardTitle>
              <p className='text-sm text-muted-foreground'>
                Chaque dossier demande un examen humain. Aucun bannissement automatique.
              </p>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {loading && <p className='text-sm text-muted-foreground'>Chargement des signalements...</p>}
                {!loading && profileReports.length === 0 && (
                  <p className='text-sm text-muted-foreground'>Aucun signalement de profil en attente.</p>
                )}
                {profileReports.map(item => (
                  <div key={item.id} className='rounded-lg border border-white/10 bg-white/5 p-4'>
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='rounded-full bg-[#ff3b8b]/20 px-2 py-1 text-xs font-bold text-[#ffb3d7]'>
                            {item.reason}
                          </span>
                          <span className='rounded-full bg-white/10 px-2 py-1 text-xs'>{item.status}</span>
                          <span className='text-xs text-muted-foreground'>
                            {Number(item.distinct_report_count || 0)} déclarant(s) distinct(s)
                          </span>
                        </div>
                        {item.details && <p className='mt-3 whitespace-pre-wrap text-sm text-white/76'>{item.details}</p>}
                        <div className='mt-3 flex flex-wrap gap-4 text-sm'>
                          <Link href={`/profile/${item.reported_user_id}`} className='font-bold text-[#ffb3d7] underline underline-offset-4'>
                            Profil signalé : {item.reported_name || 'Membre'}
                          </Link>
                          <Link href={`/profile/${item.reporter_id}`} className='text-[#94ffc9] underline underline-offset-4'>
                            Déclarant : {item.reporter_name || 'Membre'}
                          </Link>
                        </div>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <Button type='button' variant='outline' disabled={profileReportActionId === item.id} onClick={() => handleProfileReportAction(item, 'in_review')}>
                          Examiner
                        </Button>
                        <Button type='button' variant='outline' disabled={profileReportActionId === item.id} onClick={() => handleProfileReportAction(item, 'dismissed')}>
                          Classer
                        </Button>
                        <Button type='button' disabled={profileReportActionId === item.id} onClick={() => handleProfileReportAction(item, 'actioned')} className='bg-[#21b56f] text-white hover:bg-[#27c87c]'>
                          Traité
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className='mt-6'>
            <CardHeader>
              <CardTitle>Mur communauté</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {loading && (
                  <p className='text-sm text-muted-foreground'>Chargement de la file du mur...</p>
                )}
                {!loading && wallItems.length === 0 && (
                  <p className='text-sm text-muted-foreground'>
                    Aucun signalement ou contenu filtré sur le mur.
                  </p>
                )}
                {wallItems.map(item => (
                  <div key={item.id} className='rounded-lg border border-white/10 bg-white/5 p-4'>
                    <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                      <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2 text-sm'>
                          <span className='font-semibold'>
                            {item.source_type === 'wall_post' ? 'Annonce' : 'Commentaire'}
                          </span>
                          <span className='rounded-full bg-[#ff3b8b]/20 px-2 py-1 text-xs text-[#ffb3d7]'>
                            {item.severity}
                          </span>
                          <span className='rounded-full bg-white/10 px-2 py-1 text-xs'>
                            {item.status}
                          </span>
                        </div>
                        <p className='mt-2 text-sm text-muted-foreground'>
                          {item.reason}
                        </p>
                        {item.excerpt && (
                          <p className='mt-2 line-clamp-3 text-sm text-white'>
                            {item.excerpt}
                          </p>
                        )}
                        {item.image_url && (
                          <div className='mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#170321]'>
                            <img
                              src={item.image_url}
                              alt='Image signalée sur le mur communauté'
                              className='max-h-64 w-full object-cover'
                            />
                          </div>
                        )}
                        {item.user_id && (
                          <Button asChild variant='link' className='mt-2 h-auto p-0 text-[#ffb3d7]'>
                            <Link href={`/profile/${item.user_id}`}>
                              Profil de {item.author_name || 'l’auteur'}
                            </Link>
                          </Button>
                        )}
                      </div>
                      <div className='flex shrink-0 gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          disabled={wallActionId === item.id}
                          onClick={() => handleWallModerationAction(item, 'restore')}
                        >
                          Restaurer
                        </Button>
                        <Button
                          type='button'
                          disabled={wallActionId === item.id}
                          onClick={() => handleWallModerationAction(item, 'remove')}
                          className='bg-red-600 text-white hover:bg-red-500'
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
