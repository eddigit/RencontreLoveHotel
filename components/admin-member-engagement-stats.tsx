'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, Clock3, MailCheck, RefreshCw, Search, Users } from 'lucide-react'
import { getAdminMemberEngagementStats, type AdminMemberEngagementStats, type AdminStatsPeriodDays } from '@/actions/admin-stats-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const PERIODS: Array<{ value: AdminStatsPeriodDays; label: string }> = [
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
  { value: 90, label: '90 jours' }
]

function Metric({ label, value, tone = 'text-foreground' }: { label: string; value: number | null; tone?: string }) {
  return <div className='rounded-lg border border-border/60 bg-background/60 p-3'><div className={`text-2xl font-bold ${tone}`}>{value?.toLocaleString('fr-FR') ?? '—'}</div><div className='mt-1 text-xs text-muted-foreground'>{label}</div></div>
}

export function AdminMemberEngagementStats() {
  const [periodDays, setPeriodDays] = useState<AdminStatsPeriodDays>(30)
  const [data, setData] = useState<AdminMemberEngagementStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'activeDays' | 'messagesReceived' | 'unreadMessages' | 'readMessages' | 'repliedConversations'>('activeDays')
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'messages'>('all')
  const [newsFilter, setNewsFilter] = useState<'all' | 'optedIn' | 'optedOut'>('all')
  const [emailCategory, setEmailCategory] = useState<'all' | 'messages' | 'matches' | 'events'>('all')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const requestId = useRef(0)
  const refresh = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    try {
      const result = await getAdminMemberEngagementStats(periodDays)
      if (id !== requestId.current) return
      setData(result)
      setError(null)
    } catch (refreshError) {
      if (id !== requestId.current) return
      console.error('Statistiques de fréquentation indisponibles:', refreshError)
      setError('Les statistiques de fréquentation sont momentanément indisponibles.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [periodDays])

  useEffect(() => { refresh() }, [refresh])

  const members = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr-FR')
    const searched = !term || !data
      ? data?.members || []
      : data.members.filter(member => `${member.name || ''} ${member.email}`.toLocaleLowerCase('fr-FR').includes(term))
    const filtered = searched.filter(member => (activityFilter === 'all' || (activityFilter === 'active' && member.activeDays > 0) || (activityFilter === 'messages' && (member.messagesSent > 0 || member.messagesReceived > 0))) && (newsFilter === 'all' || (newsFilter === 'optedIn' && member.emailNewsOptIn === true) || (newsFilter === 'optedOut' && member.emailNewsOptIn === false)) && (emailCategory === 'all' || member.emailActivityCategories?.[emailCategory] === true))
    return [...filtered].sort((left, right) => right[sortBy] - left[sortBy] || (left.name || left.email).localeCompare(right.name || right.email, 'fr'))
  }, [data, search, sortBy, activityFilter, newsFilter, emailCategory])
  const pageCount = Math.max(1, Math.ceil(members.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const visibleMembers = members.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  function changeSearch(value: string) { setSearch(value); setPage(0) }
  function changeSort(value: 'activeDays' | 'messagesReceived' | 'unreadMessages' | 'readMessages' | 'repliedConversations') { setSortBy(value); setPage(0) }
  function changeActivity(value: 'all' | 'active' | 'messages') { setActivityFilter(value); setPage(0) }
  function changeNews(value: 'all' | 'optedIn' | 'optedOut') { setNewsFilter(value); setPage(0) }
  function changeEmailCategory(value: 'all' | 'messages' | 'matches' | 'events') { setEmailCategory(value); setPage(0) }

  return <Card className='mb-8 overflow-hidden border-primary/20' data-testid='admin-member-engagement-stats'>
    <CardHeader className='border-b border-border/60'>
      <div className='flex flex-col justify-between gap-4 lg:flex-row lg:items-start'>
        <div>
          <CardTitle className='flex items-center gap-2 text-xl'><Activity className='h-5 w-5 text-emerald-500' />Fréquentation et messages par membre</CardTitle>
          <CardDescription className='mt-2'>Comptes, présence, réceptions et lectures sur la période — sans aucun contenu de message.</CardDescription>
        </div>
        <div className='flex flex-wrap gap-2'>
          {PERIODS.map(period => <Button key={period.value} size='sm' variant={period.value === periodDays ? 'default' : 'outline'} onClick={() => setPeriodDays(period.value)}>{period.label}</Button>)}
          <Button variant='outline' size='sm' onClick={refresh} disabled={loading} aria-label='Actualiser les statistiques de fréquentation'><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className='space-y-5 pt-6'>
      {error ? <div className='flex gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500'><AlertTriangle className='h-5 w-5' />{error}</div> : !data ? <div className='h-72 animate-pulse rounded-xl bg-muted' /> : <>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
          <Metric label='Comptes enregistrés' value={data.accounts.total} tone='text-sky-500' />
          <Metric label='Comptes actifs' value={data.accounts.active} tone='text-emerald-500' />
          <Metric label='En ligne maintenant' value={data.accounts.online} tone='text-emerald-500' />
          <Metric label='Messages envoyés' value={data.messageReceiptsAvailable ? data.messages.sent : null} tone='text-[#d6bc87]' />
          <Metric label='Messages lus' value={data.messageReceiptsAvailable ? data.messages.read : null} tone='text-[#d6bc87]' />
        </div>

        <div className='rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300'>
          <div className='flex gap-2 font-semibold'><AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />Audience web</div>
          <p className='mt-1'>{data.anonymousVisitors.detail} <a className='font-semibold underline' href={data.anonymousVisitors.audienceUrl} target='_blank' rel='noreferrer'>Ouvrir Vercel Analytics</a>.</p>
        </div>

        {!data.presenceAvailable || !data.presenceHistoryAvailable || !data.authAuditAvailable || !data.messageReceiptsAvailable ? <div className='rounded-lg border border-dashed border-amber-500/40 p-4 text-sm text-amber-700 dark:text-amber-300'>
          {!data.presenceAvailable ? 'La présence courante est indisponible. ' : ''}{!data.presenceHistoryAvailable ? "L’historique journalier de présence n’est pas encore disponible : les jours actifs n’incluent que les traces de connexion, de message et la dernière présence. " : ''}{!data.authAuditAvailable ? "L’historique d’authentification n’est pas disponible. " : ''}{!data.messageReceiptsAvailable ? 'Les reçus de livraison et de lecture sont indisponibles.' : ''}
        </div> : null}

        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
          <Metric label='Réceptions 1:1' value={data.messageReceiptsAvailable ? data.members.reduce((total, member) => total + member.messagesReceived, 0) : null} tone='text-sky-500' />
          <Metric label='Livrés' value={data.messageReceiptsAvailable ? data.messages.delivered : null} tone='text-emerald-500' />
          <Metric label='En attente de livraison' value={data.messageReceiptsAvailable ? data.messages.pendingDelivery : null} tone='text-amber-500' />
          <Metric label='Non lus' value={data.messageReceiptsAvailable ? data.messages.unread : null} tone='text-orange-500' />
          <Metric label='Connexions réussies' value={data.authAuditAvailable ? data.members.reduce((total, member) => total + member.successfulLogins, 0) : null} tone='text-[#d6bc87]' />
        </div>
        <p className='text-xs text-muted-foreground'>Les états de livraison, lecture et réponse sont rattachés à un membre uniquement pour les conversations à deux participants. « Réponses 1:1 » compte les conversations où le membre a répondu après un message reçu pendant la période. Les conversations de groupe sont exclues ; les totaux généraux restent distincts.</p>

        <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
          <div><h3 className='flex items-center gap-2 font-semibold'><Users className='h-4 w-4 text-sky-500' />Membres identifiés</h3><p className='text-xs text-muted-foreground'>Jours actifs = jour distinct avec connexion réussie, message envoyé ou présence enregistrée.</p></div>
          <div className='flex w-full flex-wrap gap-2 sm:w-auto'><select value={activityFilter} onChange={event => changeActivity(event.target.value as 'all' | 'active' | 'messages')} aria-label='Filtrer par activité' className='h-10 rounded-md border border-input bg-background px-3 text-sm'><option value='all'>Toute activité</option><option value='active'>Actifs</option><option value='messages'>Avec messages</option></select><select value={newsFilter} onChange={event => changeNews(event.target.value as 'all' | 'optedIn' | 'optedOut')} aria-label='Filtrer par actualités e-mail' disabled={!data.emailPreferencesAvailable} className='h-10 rounded-md border border-input bg-background px-3 text-sm'><option value='all'>Actualités : tous</option><option value='optedIn'>Actualités : oui</option><option value='optedOut'>Actualités : non</option></select><select value={emailCategory} onChange={event => changeEmailCategory(event.target.value as 'all' | 'messages' | 'matches' | 'events')} aria-label='Filtrer par catégorie e-mail' disabled={!data.emailPreferencesAvailable} className='h-10 rounded-md border border-input bg-background px-3 text-sm'><option value='all'>E-mails : catégories</option><option value='messages'>E-mails messages</option><option value='matches'>E-mails matchs</option><option value='events'>E-mails événements</option></select><label className='sr-only' htmlFor='member-stat-sort'>Trier les membres</label><select id='member-stat-sort' value={sortBy} onChange={event => changeSort(event.target.value as 'activeDays' | 'messagesReceived' | 'unreadMessages' | 'readMessages' | 'repliedConversations')} className='h-10 rounded-md border border-input bg-background px-3 text-sm'><option value='activeDays'>Plus actifs</option><option value='messagesReceived'>Plus de reçus 1:1</option><option value='readMessages'>Plus de lus 1:1</option><option value='unreadMessages'>Plus de non lus 1:1</option><option value='repliedConversations'>Plus de réponses 1:1</option></select><div className='relative min-w-0 flex-1 sm:w-72'><Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' /><Input value={search} onChange={event => changeSearch(event.target.value)} placeholder='Trouver un membre…' aria-label='Trouver un membre par nom ou email' className='pl-9' /></div></div>
        </div>
        <div className='overflow-x-auto rounded-lg border border-border/70'>
          <table className='w-full min-w-[1050px] text-sm'>
            <thead className='bg-muted/50 text-left text-xs text-muted-foreground'><tr><th className='px-4 py-3'>Membre</th><th className='px-3 py-3 text-right'>Jours actifs</th><th className='px-3 py-3 text-right'>Connexions</th><th className='px-3 py-3 text-right'>Envoyés</th><th className='px-3 py-3 text-right'>Reçus</th><th className='px-3 py-3 text-right'>Livrés</th><th className='px-3 py-3 text-right'>Lus / non lus</th><th className='px-3 py-3 text-right'>Réponses 1:1</th><th className='px-3 py-3'>Actualités</th><th className='px-4 py-3'>Présence</th></tr></thead>
            <tbody className='divide-y divide-border/60'>{visibleMembers.map(member => <tr key={member.userId} className='hover:bg-muted/30'>
              <td className='px-4 py-3'><div className='font-medium'>{member.name || member.email}</div><div className='text-xs text-muted-foreground'>{member.name ? member.email : ''}</div><Link href={`/admin/users?member=${member.userId}`} className='text-xs text-primary hover:underline'>Voir le portrait</Link></td>
              <td className='px-3 py-3 text-right font-medium'>{member.activeDays}</td><td className='px-3 py-3 text-right'>{data.authAuditAvailable ? member.successfulLogins : '—'}</td><td className='px-3 py-3 text-right'>{data.messageReceiptsAvailable ? member.messagesSent : '—'}</td><td className='px-3 py-3 text-right'>{data.messageReceiptsAvailable ? member.messagesReceived : 'Indisponible'}</td><td className='px-3 py-3 text-right'>{data.messageReceiptsAvailable ? member.deliveredMessages : 'Indisponible'}</td><td className='px-3 py-3 text-right'>{data.messageReceiptsAvailable ? `${member.readMessages} / ${member.unreadMessages}` : 'Indisponible'}</td><td className='px-3 py-3 text-right'>{data.messageReceiptsAvailable ? member.repliedConversations : 'Indisponible'}</td><td className='px-3 py-3'>{member.emailNewsOptIn === null ? 'Indisponible' : member.emailNewsOptIn ? 'Oui' : 'Non'}</td>
              <td className='px-4 py-3'><Badge variant={member.online ? 'default' : 'secondary'}>{member.online ? 'En ligne' : member.lastSeenAt ? 'Vu' : 'Aucune'}</Badge></td>
            </tr>)}</tbody>
          </table>
          {members.length === 0 ? <div className='p-5 text-sm text-muted-foreground'>Aucun membre ne correspond à cette recherche.</div> : null}
        </div>
        {members.length > pageSize ? <div className='flex items-center justify-between gap-3 text-sm'><span className='text-muted-foreground'>{members.length.toLocaleString('fr-FR')} membres · page {currentPage + 1} / {pageCount}</span><div className='flex gap-2'><Button size='sm' variant='outline' disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Précédent</Button><Button size='sm' variant='outline' disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Suivant</Button></div></div> : null}
        <p className='flex items-center gap-2 text-xs text-muted-foreground'><Clock3 className='h-3.5 w-3.5' />Période glissante de {data.periodDays} jours, arrêtée à {new Date(data.periodEnd).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}. <MailCheck className='ml-2 h-3.5 w-3.5' />Aucun texte, pièce jointe ou contenu de message n’est récupéré.</p>
      </>}
    </CardContent>
  </Card>
}
