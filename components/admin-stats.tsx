"use client"
import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { getNewUsersStats, getActiveUsersStats, getMatchesStats } from "@/actions/user-actions"
import { getMessagesStats } from "@/actions/conversation-actions"
import { getEventSubscriptionsStats } from "@/actions/event-actions"

const defaultScale = "week"
const defaultRange = 90 // days

function getDateRange(days: number) {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

const scaleOptions = [
  { label: "Jour", value: "day" },
  { label: "Semaine", value: "week" },
  { label: "Mois", value: "month" },
]

const dateFormatter = (d: any) => {
  if (!d) return ""
  try {
    return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d))
  } catch {
    return String(d)
  }
}

export function AdminStats() {
  const [scale, setScale] = useState<"day"|"week"|"month">(defaultScale as any)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        const { startDate, endDate } = getDateRange(defaultRange)
        const [users, actives, matches, messages, subscriptions] = await Promise.all([
          getNewUsersStats({ startDate, endDate, scale }),
          getActiveUsersStats({ startDate, endDate, scale }),
          getMatchesStats({ startDate, endDate, scale }),
          getMessagesStats({ startDate, endDate, scale }),
          getEventSubscriptionsStats({ startDate, endDate, scale }),
        ])
        const periods = Array.from(new Set([
          ...users.map((d: any) => d.period),
          ...actives.map((d: any) => d.period),
          ...matches.map((d: any) => d.period),
          ...messages.map((d: any) => d.period),
          ...subscriptions.map((d: any) => d.period),
        ])).sort()
        const merged = periods.map(period => ({
          period,
          newUsers: users.find((d: any) => d.period === period)?.count || 0,
          activeUsers: actives.find((d: any) => d.period === period)?.count || 0,
          newMatches: matches.find((d: any) => d.period === period)?.count || 0,
          messages: messages.find((d: any) => d.period === period)?.count || 0,
          eventSubscriptions: subscriptions.find((d: any) => d.period === period)?.count || 0,
        })).sort((a, b) => a.period.localeCompare(b.period))
        setData(merged)
        setError('')
      } catch (fetchError) {
        console.error('Impossible de charger les graphiques administrateur:', fetchError)
        setError('Les graphiques d’activité sont momentanément indisponibles.')
      } finally {
        setLoading(false)
      }
    }
    void fetchStats()
    const interval = setInterval(fetchStats, 120000)
    return () => clearInterval(interval)
  }, [scale])

  return (
    <div className="mt-12">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-xl font-bold">Statistiques de vie de l'application</h2>
        <div className="ml-auto flex gap-2">
          {scaleOptions.map(opt => (
            <button
              key={opt.value}
              className={`px-3 py-1 rounded border ${scale === opt.value ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
              onClick={() => setScale(opt.value as any)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : loading ? (
        <div>Chargement des statistiques...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-2">Nouveaux utilisateurs</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tickFormatter={dateFormatter} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={dateFormatter}
                  formatter={(value: any) => value?.toLocaleString?.('fr-FR') ?? value}
                />
                <Line type="monotone" dataKey="newUsers" stroke="#8884d8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Utilisateurs actifs</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tickFormatter={dateFormatter} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={dateFormatter}
                  formatter={(value: any) => value?.toLocaleString?.('fr-FR') ?? value}
                />
                <Line type="monotone" dataKey="activeUsers" stroke="#82ca9d" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Demandes de contact</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tickFormatter={dateFormatter} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={dateFormatter}
                  formatter={(value: any) => value?.toLocaleString?.('fr-FR') ?? value}
                />
                <Line type="monotone" dataKey="newMatches" stroke="#ff7300" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Messages envoyés</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tickFormatter={dateFormatter} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={dateFormatter}
                  formatter={(value: any) => value?.toLocaleString?.('fr-FR') ?? value}
                />
                <Line type="monotone" dataKey="messages" stroke="#888" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Inscriptions à des événements</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tickFormatter={dateFormatter} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={dateFormatter}
                  formatter={(value: any) => value?.toLocaleString?.('fr-FR') ?? value}
                />
                <Line type="monotone" dataKey="eventSubscriptions" stroke="#b84cff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
