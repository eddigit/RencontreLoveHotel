'use client'

import { useEffect, useState, useTransition } from 'react'
import { AlertTriangle, ArrowDown, CheckCircle2, Database, HeartPulse, RefreshCw } from 'lucide-react'
import { getProductDiagnostic, createMissingProfileShells } from '@/actions/product-diagnostic-actions'
import type { ProductDiagnostic } from '@/lib/product-diagnostics'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const pillarLabels = {
  community: 'Communauté',
  profiles: 'Qualité profils',
  discovery: 'Rotation',
  matching: 'Matching',
  messaging: 'Messagerie',
  events: 'Événements',
  trust: 'Données & confiance'
}

const severityClasses = {
  critical: 'border-red-500/35 bg-red-500/10 text-red-100',
  high: 'border-amber-500/35 bg-amber-500/10 text-amber-100',
  medium: 'border-sky-500/35 bg-sky-500/10 text-sky-100',
  low: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
}

export function AdminProductDiagnostic() {
  const [diagnostic, setDiagnostic] = useState<ProductDiagnostic | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function load() {
    try {
      setDiagnostic(await getProductDiagnostic())
      setError(null)
    } catch {
      setError('Le diagnostic LHR est momentanément indisponible.')
    }
  }

  useEffect(() => { load() }, [])

  function recoverProfiles() {
    startTransition(async () => {
      const result = await createMissingProfileShells()
      setRecoveryMessage(`${result.created} profil(s) privé(s) créé(s).`)
      await load()
    })
  }

  if (error) return <Alert variant='destructive'><AlertTriangle className='h-4 w-4' /><AlertTitle>Diagnostic indisponible</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
  if (!diagnostic) return <div className='flex items-center gap-3 rounded-2xl border border-white/10 p-8 text-white/65'><RefreshCw className='h-5 w-5 animate-spin' />Calcul du diagnostic LHR…</div>

  return (
    <div className='space-y-8'>
      <section className='rounded-3xl border border-pink-500/25 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-black/20 p-6 md:p-8'>
        <div className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.22em] text-pink-300'>Pilotage exclusif Love Hotel Rencontre</p>
            <h1 className='mt-2 text-3xl font-black text-white'>Cockpit Produit & Croissance LHR</h1>
            <p className='mt-2 max-w-3xl text-sm text-white/65'>Des comptes jusqu’aux rencontres réelles : chaque alerte repose sur les données du projet.</p>
          </div>
          <div className='rounded-3xl border border-white/10 bg-black/25 px-8 py-5 text-center'>
            <div className='text-5xl font-black text-pink-300'>{diagnostic.overallScore}</div>
            <div className='text-xs uppercase tracking-[0.18em] text-white/50'>Santé produit / 100</div>
          </div>
        </div>
      </section>

      {diagnostic.metrics.schemaReady < diagnostic.metrics.schemaExpected ? (
        <Alert className='border-amber-500/30 bg-amber-500/10 text-amber-50'>
          <Database className='h-4 w-4' />
          <AlertTitle>État des migrations</AlertTitle>
          <AlertDescription>{diagnostic.metrics.schemaReady}/{diagnostic.metrics.schemaExpected} éléments de pilotage disponibles. Les métriques absentes sont signalées, jamais maquillées en activité.</AlertDescription>
        </Alert>
      ) : (
        <Alert className='border-emerald-500/30 bg-emerald-500/10 text-emerald-50'><CheckCircle2 className='h-4 w-4' /><AlertTitle>État des migrations</AlertTitle><AlertDescription>Le schéma de pilotage est prêt.</AlertDescription></Alert>
      )}

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {Object.entries(diagnostic.pillarScores).map(([key, score]) => (
          <Card key={key} className='border-white/10 bg-white/[0.04]'>
            <CardHeader className='pb-2'><CardTitle className='text-sm text-white/70'>{pillarLabels[key as keyof typeof pillarLabels]}</CardTitle></CardHeader>
            <CardContent><div className='mb-3 text-3xl font-black text-white'>{score}</div><Progress value={score} /></CardContent>
          </Card>
        ))}
      </section>

      <section>
        <div className='mb-4 flex items-center gap-2'><HeartPulse className='h-5 w-5 text-pink-400' /><h2 className='text-2xl font-black text-white'>Entonnoir réel</h2></div>
        <div className='grid gap-2 md:grid-cols-7'>
          {diagnostic.funnel.map((step, index) => (
            <div key={step.label} className='relative rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center'>
              <div className='text-2xl font-black text-white'>{step.value.toLocaleString('fr-FR')}</div>
              <div className='mt-1 text-xs text-white/55'>{step.label}</div>
              {index < diagnostic.funnel.length - 1 ? <ArrowDown className='mx-auto mt-2 h-4 w-4 text-pink-400 md:hidden' /> : null}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div><h2 className='text-2xl font-black text-white'>Plan d'action priorisé</h2><p className='text-sm text-white/55'>Urgence, preuve, impact et prochaine action.</p></div>
          <Button onClick={recoverProfiles} disabled={isPending} variant='outline' className='border-pink-400/30 bg-pink-500/10 text-white'>
            {isPending ? 'Création…' : 'Créer les profils privés manquants'}
          </Button>
        </div>
        {recoveryMessage ? <p className='mb-4 text-sm text-emerald-300'>{recoveryMessage}</p> : null}
        <div className='grid gap-4 lg:grid-cols-2'>
          {diagnostic.actions.map(action => (
            <Card key={action.id} className={`border ${severityClasses[action.severity]}`}>
              <CardHeader><div className='flex items-start justify-between gap-3'><CardTitle className='text-lg'>{action.title}</CardTitle><Badge variant='outline'>{action.severity}</Badge></div></CardHeader>
              <CardContent className='space-y-3 text-sm'><p><strong>Preuve :</strong> {action.evidence}</p><p><strong>Impact :</strong> {action.impact}</p><p><strong>Action :</strong> {action.nextAction}</p><p className='text-xs opacity-70'>Effort : {action.effort}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
