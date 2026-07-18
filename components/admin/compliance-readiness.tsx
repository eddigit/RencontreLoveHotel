'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { getAdminComplianceReadiness } from '@/actions/compliance-admin-actions'

type Readiness = Awaited<ReturnType<typeof getAdminComplianceReadiness>>

const flagLabels: Record<string, string> = {
  legalCenter: 'Centre juridique',
  versionedAcceptance: 'Acceptations versionnées',
  sensitiveConsent: 'Consentement données sensibles',
  newReporting: 'Nouveau signalement',
  moderationAppeals: 'Recours modération',
  coupleAccounts: 'Comptes couple',
  openCurtainConsent: 'Consentement rideaux ouverts',
  paymentHardening: 'Durcissement paiement',
  contactSafety: 'Blocage des coordonnées externes',
  scopedConversationAccess: 'Lecture modération justifiée'
}

export function ComplianceReadiness () {
  const [data, setData] = useState<Readiness | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminComplianceReadiness()
      .then(setData)
      .catch(reason => setError(reason instanceof Error ? reason.message : 'État indisponible'))
  }, [])

  if (error) return <p className='mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200'>{error}</p>
  if (!data) return <p className='mb-8 rounded-xl border border-white/10 p-4 text-sm text-muted-foreground'>Vérification Compliance…</p>

  const missing = Array.from(new Set([
    ...data.readiness.missingPublicationFields,
    ...data.readiness.missingPaymentFields
  ]))

  return (
    <section className='mb-8 rounded-2xl border border-pink-500/20 bg-pink-500/[0.06] p-5'>
      <div className='flex items-start gap-3'>
        <ShieldCheck className='mt-0.5 h-6 w-6 text-pink-300' />
        <div>
          <h2 className='text-xl font-bold'>État de préparation Compliance</h2>
          <p className='mt-1 text-sm text-muted-foreground'>Fonctions désactivées par défaut : chaque activation reste conditionnée à ses prérequis.</p>
        </div>
      </div>

      {!data.readiness.paymentReady && <p className='mt-4 flex gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100'><AlertTriangle className='h-5 w-5 shrink-0' />Paiement bloqué tant que la configuration juridique est incomplète.</p>}

      <div className='mt-5 grid gap-4 lg:grid-cols-2'>
        <div className='rounded-xl border border-white/10 bg-black/15 p-4'>
          <h3 className='font-semibold'>Modules</h3>
          <ul className='mt-3 grid gap-2 text-sm sm:grid-cols-2'>
            {Object.entries(data.flags).map(([name, enabled]) => <li key={name} className='flex items-center justify-between gap-2'><span>{flagLabels[name] || name}</span><span className={enabled ? 'text-emerald-300' : 'text-white/45'}>{enabled ? 'Actif' : 'Inactif'}</span></li>)}
          </ul>
        </div>
        <div className='rounded-xl border border-white/10 bg-black/15 p-4'>
          <h3 className='flex items-center gap-2 font-semibold'><CheckCircle2 className='h-4 w-4' />Prérequis manquants ({missing.length})</h3>
          {missing.length === 0 ? <p className='mt-3 text-sm text-emerald-300'>Configuration déclarative complète.</p> : <ul className='mt-3 grid gap-1 text-xs text-white/60'>{missing.map(field => <li key={field}>{field}</li>)}</ul>}
        </div>
      </div>
    </section>
  )
}
