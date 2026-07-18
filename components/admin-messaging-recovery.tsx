'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  HeartHandshake,
  MessageCircleMore,
  MessagesSquare,
  RefreshCw,
  Send,
  Sparkles,
  UsersRound
} from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import {
  getMessagingRecoveryStats,
  getMessagingRecoveryHistory,
  type MessagingRecoveryHistory,
  type MessagingRecoveryMetrics,
  type MessagingRecoveryScale,
  type MessagingRecoveryStats
} from '@/actions/messaging-recovery-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const scaleOptions: Array<{ label: string; value: MessagingRecoveryScale }> = [
  { label: 'Jour', value: 'day' },
  { label: 'Semaine', value: 'week' },
  { label: 'Mois', value: 'month' }
]

function formatPeriod(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`))
}

function trendPresentation(history: MessagingRecoveryHistory) {
  const { status, changePercent } = history.trend
  const signedChange = `${changePercent > 0 ? '+' : ''}${changePercent.toLocaleString('fr-FR')}%`

  if (status === 'recovering') {
    return {
      label: 'La messagerie repart',
      change: signedChange,
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
    }
  }
  if (status === 'declining') {
    return {
      label: 'Activité en baisse',
      change: signedChange,
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-600'
    }
  }
  return {
    label: 'Activité stable',
    change: signedChange,
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-600'
  }
}

function comparisonLabel(current: number, previous: number, previousPeriodLabel: string) {
  if (previous === 0) {
    return current === 0
      ? `Stable par rapport à ${previousPeriodLabel}`
      : `Nouvelle activité vs ${previousPeriodLabel}`
  }

  const change = Math.round(((current - previous) / previous) * 100)
  return `${change > 0 ? '+' : ''}${change}% vs ${previousPeriodLabel}`
}

function KpiCard({
  title,
  value,
  previous,
  previousPeriodLabel,
  icon,
  suffix = ''
}: {
  title: string
  value: number
  previous: number
  previousPeriodLabel: string
  icon: React.ReactNode
  suffix?: string
}) {
  return (
    <Card className='border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-background to-purple-500/5'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <div className='rounded-lg bg-pink-500/15 p-2 text-pink-500'>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>
          {value.toLocaleString('fr-FR')}
          {suffix}
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>
          {comparisonLabel(value, previous, previousPeriodLabel)}
        </p>
      </CardContent>
    </Card>
  )
}

function LoadingCards() {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {Array.from({ length: 8 }, (_, index) => (
        <Card key={index} className='animate-pulse border-pink-500/10'>
          <CardContent className='space-y-3 pt-6'>
            <div className='h-4 w-2/3 rounded bg-muted' />
            <div className='h-8 w-1/3 rounded bg-muted' />
            <div className='h-3 w-1/2 rounded bg-muted' />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function metric(
  stats: MessagingRecoveryStats,
  key: keyof MessagingRecoveryMetrics
) {
  return {
    value: stats.summary[key],
    previous: stats.previous[key]
  }
}

export function AdminMessagingRecovery() {
  const [scale, setScale] = useState<MessagingRecoveryScale>('week')
  const [stats, setStats] = useState<MessagingRecoveryStats | null>(null)
  const [history, setHistory] = useState<MessagingRecoveryHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const selectedPeriodLabel = {
    day: 'Aujourd’hui',
    week: 'Cette semaine',
    month: 'Ce mois'
  }[scale]
  const previousPeriodLabel = {
    day: 'hier',
    week: 'la semaine précédente',
    month: 'le mois précédent'
  }[scale]

  useEffect(() => {
    let active = true

    async function loadStats() {
      setLoading(true)
      setHistoryLoading(true)

      const [statsResult, historyResult] = await Promise.allSettled([
        getMessagingRecoveryStats({ scale, days: 30 }),
        getMessagingRecoveryHistory({ scale })
      ])
      if (!active) return

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value)
        setError(null)
      } else {
        console.error(statsResult.reason)
        setError('Impossible de charger les KPI de messagerie')
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value)
        setHistoryError(null)
      } else {
        console.error(historyResult.reason)
        setHistoryError('Impossible de charger l’historique')
      }

      setLoading(false)
      setHistoryLoading(false)
    }

    loadStats()
    return () => {
      active = false
    }
  }, [scale])

  return (
    <section className='mb-10 space-y-5' aria-labelledby='messaging-recovery-title'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='mb-1 flex items-center gap-2 text-pink-500'>
            <Sparkles className='h-5 w-5' />
            <span className='text-xs font-semibold uppercase tracking-[0.2em]'>
              Indicateurs prioritaires
            </span>
          </div>
          <h2 id='messaging-recovery-title' className='text-2xl font-bold'>
            Relance de la messagerie
          </h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Activité entre membres — {selectedPeriodLabel.toLocaleLowerCase('fr-FR')} — et évolution depuis le lancement.
          </p>
        </div>
        <div className='flex w-fit gap-1 rounded-xl border bg-card p-1'>
          {scaleOptions.map(option => (
            <button
              key={option.value}
              type='button'
              onClick={() => setScale(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                scale === option.value
                  ? 'bg-pink-500 text-white'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingCards /> : null}

      {!loading && error ? (
        <Card className='border-red-500/30 bg-red-500/10'>
          <CardContent className='flex items-center gap-3 py-6 text-red-600'>
            <RefreshCw className='h-5 w-5' />
            <span>{error}</span>
          </CardContent>
        </Card>
      ) : null}

      {!loading && stats ? (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <KpiCard
              title='Conversations créées'
              {...metric(stats, 'createdConversations')}
              previousPeriodLabel={previousPeriodLabel}
              icon={<MessagesSquare className='h-4 w-4' />}
            />
            <KpiCard
              title='Conversations démarrées'
              {...metric(stats, 'startedConversations')}
              previousPeriodLabel={previousPeriodLabel}
              icon={<Send className='h-4 w-4' />}
            />
            <KpiCard
              title='Messages envoyés'
              {...metric(stats, 'messages')}
              previousPeriodLabel={previousPeriodLabel}
              icon={<MessageCircleMore className='h-4 w-4' />}
            />
            <KpiCard
              title='Matchs acceptés'
              {...metric(stats, 'acceptedMatches')}
              previousPeriodLabel={previousPeriodLabel}
              icon={<HeartHandshake className='h-4 w-4' />}
            />
            <KpiCard
              title='Conversations actives'
              {...metric(stats, 'activeConversations')}
              previousPeriodLabel={previousPeriodLabel}
              icon={<Activity className='h-4 w-4' />}
            />
            <KpiCard
              title='Conversations avec réponse'
              {...metric(stats, 'respondedConversations')}
              previousPeriodLabel={previousPeriodLabel}
              icon={<UsersRound className='h-4 w-4' />}
            />
            <KpiCard
              title='Taux de réponse'
              {...metric(stats, 'responseRate')}
              previousPeriodLabel={previousPeriodLabel}
              suffix='%'
              icon={<RefreshCw className='h-4 w-4' />}
            />
            <Card className='border-violet-500/20 bg-violet-500/10'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium'>Admin / conciergerie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats.service.messages.toLocaleString('fr-FR')}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {selectedPeriodLabel} : messages dans {stats.service.activeConversations.toLocaleString('fr-FR')}{' '}
                  conversation(s) de service
                </p>
              </CardContent>
            </Card>
        </div>
      ) : null}

      {historyLoading ? (
        <Card className='animate-pulse border-pink-500/10'>
          <CardContent className='h-[390px] pt-6' />
        </Card>
      ) : null}

      {!historyLoading && historyError ? (
        <Card className='border-red-500/30 bg-red-500/10'>
          <CardContent className='flex items-center gap-3 py-6 text-red-600'>
            <RefreshCw className='h-5 w-5' />
            <span>{historyError}</span>
          </CardContent>
        </Card>
      ) : null}

      {!historyLoading && history ? (
        <Card className='border-pink-500/20'>
          <CardHeader className='gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div>
              <CardTitle className='text-lg'>Activité depuis le lancement</CardTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                Historique disponible depuis {history.startsAt ? formatPeriod(history.startsAt) : 'aujourd’hui'}.
              </p>
            </div>
            {(() => {
              const trend = trendPresentation(history)
              return (
                <div className={`rounded-xl border px-4 py-3 ${trend.className}`}>
                  <div className='flex items-baseline gap-2'>
                    <span className='font-semibold'>{trend.label}</span>
                    <span className='text-xl font-black'>{trend.change}</span>
                  </div>
                  <p className='mt-1 text-xs opacity-80'>
                    30 derniers jours complets vs 30 jours précédents
                  </p>
                  <p className='mt-1 text-xs opacity-80'>
                    {history.trend.recentMessages.toLocaleString('fr-FR')} messages contre{' '}
                    {history.trend.previousMessages.toLocaleString('fr-FR')}
                  </p>
                </div>
              )
            })()}
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={360}>
              <LineChart data={history.series} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray='3 3' opacity={0.35} />
                <XAxis
                  dataKey='period'
                  tick={{ fontSize: 11 }}
                  minTickGap={32}
                  tickFormatter={formatPeriod}
                />
                <YAxis
                  yAxisId='messages'
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Messages', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId='activity'
                  orientation='right'
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Conversations / matchs', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  labelFormatter={value => formatPeriod(String(value))}
                  formatter={(value: number) => value.toLocaleString('fr-FR')}
                />
                <Legend />
                <Line
                  yAxisId='messages'
                  type='monotone'
                  dataKey='messages'
                  name='Messages entre membres'
                  stroke='#8b5cf6'
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  yAxisId='activity'
                  type='monotone'
                  dataKey='activeConversations'
                  name='Conversations actives'
                  stroke='#ec4899'
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId='activity'
                  type='monotone'
                  dataKey='createdConversations'
                  name='Conversations créées'
                  stroke='#0ea5e9'
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId='activity'
                  type='monotone'
                  dataKey='acceptedMatches'
                  name='Matchs acceptés'
                  stroke='#22c55e'
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
