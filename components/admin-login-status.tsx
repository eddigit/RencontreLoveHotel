'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Clock3,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users
} from 'lucide-react'
import {
  AdminLoginRoleStatus,
  AdminLoginStatusData,
  getAdminLoginStatus
} from '@/actions/admin-stats-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

function RolePanel({
  title,
  status,
  admin = false
}: {
  title: string
  status: AdminLoginRoleStatus
  admin?: boolean
}) {
  const Icon = admin ? ShieldCheck : Users

  return (
    <div className='rounded-xl border border-border/70 bg-background/60 p-4'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <div className={admin ? 'rounded-lg bg-amber-500/10 p-2 text-amber-500' : 'rounded-lg bg-sky-500/10 p-2 text-sky-500'}>
            <Icon className='h-5 w-5' />
          </div>
          <div>
            <div className='font-semibold'>{title}</div>
            <div className='text-xs text-muted-foreground'>{status.total} comptes</div>
          </div>
        </div>
        <Badge className='border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10'>
          {status.online} en ligne
        </Badge>
      </div>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <Metric label='En ligne' value={status.online} accent='text-emerald-500' />
        <Metric label='Actifs 24 h' value={status.active24h} accent='text-sky-500' />
        <Metric label='Connexions 24 h' value={status.logins24h} accent='text-violet-500' />
        <Metric label='Échecs 24 h' value={status.failures24h} accent={status.failures24h ? 'text-red-500' : 'text-muted-foreground'} />
      </div>
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className='rounded-lg bg-muted/50 px-3 py-3'>
      <div className={`text-2xl font-bold ${accent}`}>{value.toLocaleString('fr-FR')}</div>
      <div className='mt-1 text-xs text-muted-foreground'>{label}</div>
    </div>
  )
}

function formatLoginDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

export function AdminLoginStatus() {
  const [data, setData] = useState<AdminLoginStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const nextData = await getAdminLoginStatus()
      setData(nextData)
      setError(null)
    } catch (refreshError) {
      console.error('Erreur état des connexions:', refreshError)
      setError("L'état des connexions est momentanément indisponible.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [refresh])

  return (
    <Card className='mb-8 overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5'>
      <CardHeader className='border-b border-border/60'>
        <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-start'>
          <div>
            <CardTitle className='flex items-center gap-2 text-xl'>
              <Activity className='h-5 w-5 text-emerald-500' />
              État des connexions
              <Badge variant='outline' className='border-emerald-500/30 text-emerald-500'>Live</Badge>
            </CardTitle>
            <CardDescription className='mt-2'>
              Présence en ligne et authentifications des administrateurs et utilisateurs.
            </CardDescription>
          </div>
          <Button variant='outline' size='sm' onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>

      <CardContent className='space-y-5 pt-6'>
        {loading && !data ? (
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='h-40 animate-pulse rounded-xl bg-muted' />
            <div className='h-40 animate-pulse rounded-xl bg-muted' />
          </div>
        ) : error || !data ? (
          <div className='flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500'>
            <AlertTriangle className='h-5 w-5' />
            {error || 'Données indisponibles'}
          </div>
        ) : (
          <>
            <div className='grid gap-4 lg:grid-cols-2'>
              <RolePanel title='Administrateurs' status={data.admins} admin />
              <RolePanel title='Utilisateurs' status={data.users} />
            </div>

            {data.unknownFailures24h > 0 && (
              <div className='flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600'>
                <AlertTriangle className='h-4 w-4' />
                {data.unknownFailures24h} échec{data.unknownFailures24h > 1 ? 's' : ''} non rattaché{data.unknownFailures24h > 1 ? 's' : ''} à un compte sur 24 h.
              </div>
            )}

            <div>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <h3 className='flex items-center gap-2 font-semibold'>
                  <Clock3 className='h-4 w-4 text-violet-500' />
                  Dernières connexions
                </h3>
                <span className='text-xs text-muted-foreground'>Mise à jour {new Date(data.timestamp).toLocaleTimeString('fr-FR')}</span>
              </div>

              {!data.auditAvailable ? (
                <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
                  L'historique démarre avec cette mise en service. La présence en ligne reste disponible.
                </div>
              ) : data.recentLogins.length === 0 ? (
                <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
                  Aucune connexion encore enregistrée depuis l'activation du suivi.
                </div>
              ) : (
                <div className='divide-y divide-border/60 rounded-lg border border-border/70'>
                  {data.recentLogins.map(login => (
                    <div key={login.id} className='flex flex-col justify-between gap-2 px-4 py-3 sm:flex-row sm:items-center'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <div className={login.role === 'admin' ? 'rounded-full bg-amber-500/10 p-2 text-amber-500' : 'rounded-full bg-sky-500/10 p-2 text-sky-500'}>
                          {login.role === 'admin' ? <ShieldCheck className='h-4 w-4' /> : <UserCheck className='h-4 w-4' />}
                        </div>
                        <div className='min-w-0'>
                          <div className='truncate text-sm font-medium'>{login.name || login.email || 'Compte utilisateur'}</div>
                          {login.name && login.email && <div className='truncate text-xs text-muted-foreground'>{login.email}</div>}
                        </div>
                      </div>
                      <div className='flex items-center gap-2 pl-11 text-xs sm:pl-0'>
                        <Badge variant='secondary'>{login.role === 'admin' ? 'Admin' : 'Utilisateur'}</Badge>
                        <span className='text-muted-foreground'>{login.provider}</span>
                        <span className='whitespace-nowrap text-muted-foreground'>{formatLoginDate(login.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
