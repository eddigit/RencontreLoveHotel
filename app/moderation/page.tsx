'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { getModerationInvestigations } from '@/actions/moderation-investigation-actions'
import MainLayout from '@/components/layout/main-layout'
import { ModerationAvatar } from '@/components/moderation/moderation-avatar'
import { ProtectedRoute } from '@/components/protected-route'
import { investigationCategoryLabels, type InvestigationCategory } from '@/lib/moderation-investigation'
import { useAuth } from '@/contexts/auth-context'

type Investigation = Awaited<ReturnType<typeof getModerationInvestigations>>[number]

export default function ModerationQueuePage () {
  const { user } = useAuth()
  const [items, setItems] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<'all' | InvestigationCategory>('all')

  useEffect(() => {
    getModerationInvestigations().then(setItems).finally(() => setLoading(false))
  }, [])
  const filtered = useMemo(() => category === 'all' ? items : items.filter(item => item.category === category), [items, category])

  return (
    <ProtectedRoute allowedRoles={['admin', 'community_moderator']}>
      <MainLayout user={user}>
        <main className='mx-auto min-h-screen w-full max-w-6xl px-4 py-10 text-white'>
          <div className='rounded-3xl border border-white/10 bg-white/[0.04] p-6'>
            <ShieldCheck className='h-8 w-8 text-[#ff8cc8]' />
            <h1 className='mt-4 text-3xl font-black'>Cockpit prioritaire de modération</h1>
            <p className='mt-3 max-w-4xl text-sm leading-6 text-white/65'>
              Une carte par profil, toutes ses alertes regroupées. Dossiers ciblés uniquement pour les adhérents-modérateurs ;
              l’administrateur peut ouvrir l’identité et les conversations nécessaires, avec consultation nominative journalisée.
            </p>
          </div>

          <div className='mt-5 flex flex-wrap gap-2' aria-label='Filtres de priorité'>
            {([
              ['all', 'Tous les dossiers'], ['paid_solicitation', 'Priorité prostitution'], ['safety', 'Danger / mineur'],
              ['harassment', 'Harcèlement'], ['fraud', 'Fraude'], ['other', 'Autres']
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setCategory(value)} className={`rounded-full border px-4 py-2 text-xs font-bold ${category === value ? 'border-[#ff77b7] bg-[#ff3b8b]/20' : 'border-white/10 bg-black/15 text-white/65'}`}>{label}</button>
            ))}
          </div>

          <div className='mt-6 space-y-3'>
            {loading ? <p>Chargement sécurisé…</p> : filtered.length === 0 ? <p>Aucun dossier ouvert.</p> : filtered.map(item => {
              const adminItem = item as Investigation & { name?: string; avatar?: string | null; email?: string }
              return (
                <Link key={item.id} href={`/moderation/${item.id}`} className='group block rounded-2xl border border-white/10 bg-black/15 p-5 hover:border-[#ff8cc8]/45 hover:bg-white/[0.04]'>
                  <div className='flex items-start gap-4'>
                    <ModerationAvatar name={adminItem.name || item.subject} src={adminItem.avatar} />
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div><strong className='text-lg'>{adminItem.name || item.subject}</strong><p className='text-xs text-white/45'>{adminItem.email || item.subject}</p></div>
                        <span className='rounded-full bg-[#ff3b8b]/15 px-3 py-1 text-xs font-bold'>{item.severity} · {item.status}</span>
                      </div>
                      <div className='mt-3 flex flex-wrap gap-3 text-xs text-white/65'>
                        <span className='inline-flex items-center gap-1 font-bold text-[#ffb2d9]'><AlertTriangle className='h-3.5 w-3.5' />{investigationCategoryLabels[item.category as InvestigationCategory]}</span>
                        <span>{item.openAlerts} alerte(s) ouverte(s)</span>
                        {item.latestAlertAt && <span>Dernière activité {new Date(item.latestAlertAt).toLocaleString('fr-FR')}</span>}
                      </div>
                      <p className='mt-3 text-sm font-bold text-white group-hover:text-[#ffb2d9]'>Voir le dossier complet →</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </main>
      </MainLayout>
    </ProtectedRoute>
  )
}
