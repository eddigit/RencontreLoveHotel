'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { getJougPilotAdminStatus, startJougPilot, type JougPilotAdminStatus } from '@/actions/joug-pilot-actions'

export function JougPilotAdmin() {
  const [status, setStatus] = useState<JougPilotAdminStatus | null>(null)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()
  useEffect(() => { void getJougPilotAdminStatus().then(setStatus).catch(() => setError(true)) }, [])
  const launch = () => startTransition(async () => { try { setStatus(await startJougPilot()) } catch { setError(true) } })
  const endLabel = status?.endAt && new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(status.endAt))
  const clicks = status?.aggregateClicks === null ? 'Statistiques indisponibles' : `${status?.aggregateClicks ?? 0} clic${status?.aggregateClicks === 1 ? '' : 's'} agrégé${status?.aggregateClicks === 1 ? '' : 's'}`
  return <section className='mb-8 rounded-xl border border-[#d6bc87]/30 bg-graphite p-5'><h2 className='text-lg font-bold'>Pilote Joug.World</h2><p className='mt-1 text-sm text-muted-foreground'>Invitation facultative, sans transfert Joug Rencontre → Joug.World. Mesure : clics agrégés Joug Rencontre uniquement.</p>{error ? <p className='mt-3 text-sm text-red-400'>État indisponible pour le moment.</p> : status?.state === 'active' ? <p className='mt-3 text-sm'>Actif jusqu’au {endLabel} · {clicks}.</p> : status?.state === 'expired' ? <p className='mt-3 text-sm'>Pilote expiré · {clicks}.</p> : <Button className='mt-4 bg-graphite hover:bg-graphite-hover' onClick={launch} disabled={pending}>{pending ? 'Démarrage…' : 'Démarrer le pilote 30 jours'}</Button>}</section>
}
