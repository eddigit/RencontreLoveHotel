'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Heart,
  Clock,
  UserCheck,
  Mail,
  CalendarDays,
  MessageCircle,
  Zap
} from 'lucide-react'
import { AdminStatsData, getAdminDashboardStats, getRealTimeMetrics } from '@/actions/admin-stats-actions'

interface StatCardProps {
  title: string
  value: number | string
  change?: number
  changeLabel?: string
  detail?: string
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink'
  trend?: 'up' | 'down' | 'neutral'
}

function StatCard({ title, value, change, changeLabel, detail, icon, color = 'blue', trend = 'neutral' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    green: 'bg-green-500/10 text-green-600 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    pink: 'bg-pink-500/10 text-pink-600 border-pink-500/20'
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity

  return (
    <Card className={`${colorClasses[color]} border-2 hover:scale-105 transition-transform duration-200`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`h-8 w-8 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        </div>
        {change !== undefined && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <TrendIcon className={`h-3 w-3 ${
              trend === 'up' ? 'text-green-500' : 
              trend === 'down' ? 'text-red-500' : 
              'text-gray-500'
            }`} />
            <span className={
              trend === 'up' ? 'text-green-500' : 
              trend === 'down' ? 'text-red-500' : 
              'text-gray-500'
            }>
              {change > 0 ? '+' : ''}{change}
            </span>
            <span>{changeLabel}</span>
          </div>
        )}
        {change === undefined && detail && (
          <p className="text-xs text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  )
}

function GenderDistribution({ data }: { data: AdminStatsData['usersByGender'] }) {
  const total = data.male + data.female + data.couple + data.other
  
  if (total === 0) return null

  const getPercentage = (count: number) => ((count / total) * 100).toFixed(1)

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Heart className="mr-2 h-5 w-5 text-pink-500" />
          Répartition par Genre
        </CardTitle>
        <CardDescription>Distribution des {total.toLocaleString()} utilisateurs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.male}</div>
            <div className="text-sm text-muted-foreground">Hommes</div>
            <Badge variant="secondary">{getPercentage(data.male)}%</Badge>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">{data.female}</div>
            <div className="text-sm text-muted-foreground">Femmes</div>
            <Badge variant="secondary">{getPercentage(data.female)}%</Badge>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{data.couple}</div>
            <div className="text-sm text-muted-foreground">Couples</div>
            <Badge variant="secondary">{getPercentage(data.couple)}%</Badge>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{data.other}</div>
            <div className="text-sm text-muted-foreground">Autres</div>
            <Badge variant="secondary">{getPercentage(data.other)}%</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RealTimeActivity() {
  const [metrics, setMetrics] = useState({
    connectionsLast5Min: 0,
    messagesLast5Min: 0,
    errorsLast5Min: 0,
    timestamp: ''
  })

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getRealTimeMetrics()
        setMetrics(data)
      } catch (error) {
        console.error('Erreur métriques temps réel:', error)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh toutes les 30 secondes

    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="col-span-1 md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="mr-2 h-5 w-5 text-yellow-500" />
          Activité Temps Réel
          <Badge variant="outline" className="ml-2">Live</Badge>
        </CardTitle>
        <CardDescription>
          Dernière mise à jour: {metrics.timestamp ? new Date(metrics.timestamp).toLocaleTimeString('fr-FR') : '...'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{metrics.connectionsLast5Min}</div>
            <div className="text-xs text-muted-foreground">Membres actifs (5 min)</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{metrics.messagesLast5Min}</div>
            <div className="text-xs text-muted-foreground">Messages (5 min)</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{metrics.errorsLast5Min}</div>
            <div className="text-xs text-muted-foreground">Erreurs (5 min)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminRealTimeStats() {
  const [stats, setStats] = useState<AdminStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const data = await getAdminDashboardStats()
        setStats(data)
        setError(null)
      } catch (err) {
        setError('Erreur lors du chargement des statistiques')
        console.error('Stats error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh toutes les 2 minutes
    const interval = setInterval(fetchStats, 120000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="text-red-600">{error || 'Erreur de chargement'}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total adhérents"
          value={stats.totalUsers}
          detail={`${stats.usersToday.toLocaleString('fr-FR')} nouveau(x) sur 24 h`}
          icon={<Users className="h-4 w-4" />}
          color="blue"
          trend={stats.usersToday > 0 ? 'up' : 'neutral'}
        />
        
        <StatCard
          title="En ligne maintenant"
          value={stats.onlineUsersNow}
          detail="Présence détectée sur 10 minutes"
          icon={<Zap className="h-4 w-4" />}
          color="green"
          trend={stats.onlineUsersNow > 0 ? 'up' : 'neutral'}
        />

        <StatCard
          title="Actifs sur 24 h"
          value={stats.activeUsersToday}
          detail={`${stats.activeUsersThisWeek.toLocaleString('fr-FR')} actifs sur 7 jours`}
          icon={<UserCheck className="h-4 w-4" />}
          color="blue"
          trend={stats.activeUsersToday > 0 ? 'up' : 'neutral'}
        />
        
        <StatCard
          title="Événements à Venir"
          value={stats.upcomingEvents}
          detail={`${stats.eventsToday.toLocaleString('fr-FR')} créé(s) sur 24 h`}
          icon={<Calendar className="h-4 w-4" />}
          color="orange"
          trend={stats.eventsToday > 0 ? 'up' : 'neutral'}
        />
      </div>

      {/* Statistiques de messages et conversations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Messages"
          value={stats.totalMessages}
          changeLabel="depuis le lancement"
          icon={<Mail className="h-4 w-4" />}
          color="blue"
        />
        
        <StatCard
          title="Messages sur 24 h"
          value={stats.messagesToday}
          detail={`${stats.messagesThisWeek.toLocaleString('fr-FR')} sur 7 jours`}
          icon={<MessageCircle className="h-4 w-4" />}
          color="green"
          trend={stats.messagesToday > 0 ? 'up' : 'neutral'}
        />

        <StatCard
          title="Total contacts / matchs"
          value={stats.totalMatches}
          icon={<Heart className="h-4 w-4" />}
          color="pink"
        />

        <StatCard
          title="Demandes de contact (24 h)"
          value={stats.matchRequestsLast24h}
          detail={`${stats.acceptedMatchesLast24h.toLocaleString('fr-FR')} acceptée(s) sur 24 h`}
          icon={<UserCheck className="h-4 w-4" />}
          color="purple"
          trend={stats.matchRequestsLast24h > 0 ? 'up' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Conversations actives (24 h)"
          value={stats.activeConversationsToday}
          detail={`${stats.conversationsToday.toLocaleString('fr-FR')} nouvelle(s) sur 24 h`}
          icon={<Activity className="h-4 w-4" />}
          color="pink"
          trend={stats.activeConversationsToday > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Inscriptions événements (24 h)"
          value={stats.eventSubscriptionsToday}
          icon={<CalendarDays className="h-4 w-4" />}
          color="orange"
          trend={stats.eventSubscriptionsToday > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Activité du mur (24 h)"
          value={stats.wallActivityLast24h}
          icon={<MessageSquare className="h-4 w-4" />}
          color="green"
          trend={stats.wallActivityLast24h > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Demandes support (24 h)"
          value={stats.supportRequestsLast24h}
          icon={<Mail className="h-4 w-4" />}
          color="red"
          trend={stats.supportRequestsLast24h > 0 ? 'up' : 'neutral'}
        />
      </div>

      {/* Répartition par genre et activité temps réel */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <GenderDistribution data={stats.usersByGender} />
        <RealTimeActivity />
      </div>

      {/* Indicateurs d'activité récente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-500" />
            Activité Récente (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.recentActivity.newUsersLast24h}</div>
              <div className="text-sm text-blue-700">Nouveaux Utilisateurs</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.recentActivity.messagesLast24h}</div>
              <div className="text-sm text-green-700">Messages Envoyés</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.recentActivity.conversationsLast24h}</div>
              <div className="text-sm text-purple-700">Nouvelles Conversations</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.recentActivity.eventSubscriptionsLast24h}</div>
              <div className="text-sm text-orange-700">Inscriptions Événements</div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{stats.recentActivity.matchRequestsLast24h}</div>
              <div className="text-sm text-pink-700">Demandes de Contact</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{stats.recentActivity.wallActivityLast24h}</div>
              <div className="text-sm text-emerald-700">Activité du Mur</div>
            </div>
          </div>
          <p className="mt-4 text-right text-xs text-muted-foreground">
            Instantané calculé le {new Date(stats.generatedAt).toLocaleString('fr-FR')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
