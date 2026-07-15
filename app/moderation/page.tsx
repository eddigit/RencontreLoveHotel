'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { getModerationCases } from '@/actions/moderation-case-actions'
import MainLayout from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/contexts/auth-context'

type CaseSummary = Awaited<ReturnType<typeof getModerationCases>>[number]

export default function ModerationQueuePage () {
  const { user } = useAuth()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getModerationCases().then(setCases).finally(() => setLoading(false))
  }, [])

  return (
    <ProtectedRoute allowedRoles={['admin', 'community_moderator']}>
      <MainLayout user={user}>
        <main className='mx-auto min-h-screen w-full max-w-5xl px-4 py-10 text-white'>
          <div className='rounded-3xl border border-white/10 bg-white/[0.04] p-6'>
            <ShieldCheck className='h-8 w-8 text-[#ff8cc8]' />
            <h1 className='mt-4 text-3xl font-black'>Modération communautaire</h1>
            <p className='mt-3 text-sm leading-6 text-white/65'>
              Dossiers ciblés uniquement. Chaque consultation est nominative et journalisée. Vous n’avez jamais accès
              à la messagerie complète d’un membre.
            </p>
          </div>
          <div className='mt-6 space-y-3'>
            {loading ? <p>Chargement sécurisé…</p> : cases.length === 0 ? <p>Aucun dossier ouvert.</p> : cases.map(item => (
              <Link key={item.id} href={`/moderation/${item.id}`} className='block rounded-2xl border border-white/10 bg-black/15 p-5 hover:border-[#ff8cc8]/30'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <strong>{item.subject}</strong>
                  <span className='rounded-full bg-[#ff3b8b]/15 px-3 py-1 text-xs'>{item.severity} · {item.status}</span>
                </div>
                <p className='mt-2 line-clamp-2 text-sm text-white/60'>{item.reason}</p>
              </Link>
            ))}
          </div>
        </main>
      </MainLayout>
    </ProtectedRoute>
  )
}
