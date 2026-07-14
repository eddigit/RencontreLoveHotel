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

function comparisonLabel(current: number, previous: number, suffix = '') {
  if (previous === 0) {
    return current === 0 ? 'Stable par rapport à hier' : 'Nouvelle activité vs hier'
  }

  const change = Math.round(((current - previous) / previous) * 100)
  return `${change > 0 ? '+' : ''}${change}% vs hier${suffix}`
}

function KpiCard({
  title,
  value,
  previous,
  icon,
  suffix = ''
}: {
  title: string
  value: number
  previous: number
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
          {comparisonLabel(value, previous)}
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
  const [scale, setScale] = useState<MessagingRecoveryScale>('day')
  const [stats, setStats] = useState<MessagingRecoveryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadStats() {
      setLoading(true)
      try {
        const result = await getMessagingRecoveryStats({ scale, days: 30 })
        if (!active) return
        setStats(result)
        setError(null)
      } catch (loadError) {
        console.error(loadError)
        if (!active) return
        setError('Impossible de charger les KPI de messagerie')
      } finally {
        if (active) setLoading(false)
      }
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
            Activité entre membres aujourd’hui et évolution sur les 30 derniers jours.
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
        <>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <KpiCard
              title='Conversations créées'
              {...metric(stats, 'createdConversations')}
              icon={<MessagesSquare className='h-4 w-4' />}
            />
            <KpiCard
              title='Conversations démarrées'
              {...metric(stats, 'startedConversations')}
              icon={<Send className='h-4 w-4' />}
            />
            <KpiCard
              title='Messages envoyés'
              {...metric(stats, 'messages')}
              icon={<MessageCircleMore className='h-4 w-4' />}
            />
            <KpiCard
              title='Matchs acceptés'
              {...metric(stats, 'acceptedMatches')}
              icon={<HeartHandshake className='h-4 w-4' />}
            />
            <KpiCard
              title='Conversations actives'
              {...metric(stats, 'activeConversations')}
              icon={<Activity className='h-4 w-4' />}
            />
            <KpiCard
              title='Conversations avec réponse'
              {...metric(stats, 'respondedConversations')}
              icon={<UsersRound className='h-4 w-4' />}
            />
            <KpiCard
              title='Taux de réponse'
              {...metric(stats, 'responseRate')}
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
                  messages dans {stats.service.activeConversations.toLocaleString('fr-FR')}{' '}
                  conversation(s) de service
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className='border-pink-500/20'>
            <CardHeader>
              <CardTitle className='text-base'>Dynamique de reprise</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width='100%' height={320}>
                <LineChart data={stats.series} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray='3 3' opacity={0.35} />
                  <XAxis dataKey='period' tick={{ fontSize: 12 }} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey="startedConversations"
                    name='Conversations démarrées'
                    stroke='#ec4899'
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type='monotone'
                    dataKey="messages"
                    name='Messages'
                    stroke='#8b5cf6'
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type='monotone'
                    dataKey="acceptedMatches"
                    name='Matchs acceptés'
                    stroke='#22c55e'
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  )
}
