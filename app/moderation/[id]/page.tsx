'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  createModerationDecision,
  getModerationCaseDetail
} from '@/actions/moderation-case-actions'
import MainLayout from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

type CaseDetail = NonNullable<Awaited<ReturnType<typeof getModerationCaseDetail>>>

export default function ModerationCasePage () {
  const { user } = useAuth()
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [reason, setReason] = useState('')
  const [action, setAction] = useState<'no_action' | 'reminder' | 'warning' | 'message_restriction' | 'suspension' | 'permanent_ban' | 'legal_escalation'>('warning')
  const [status, setStatus] = useState('')

  useEffect(() => {
    getModerationCaseDetail(params.id, 'examen du signalement').then(setDetail)
  }, [params.id])

  async function decide () {
    setStatus('')
    await createModerationDecision({ caseId: params.id, action, reason })
    setStatus('Décision humaine enregistrée et traçable.')
    router.refresh()
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'community_moderator']}>
      <MainLayout user={user}>
        <main className='mx-auto min-h-screen w-full max-w-3xl px-4 py-10 text-white'>
          <h1 className='text-3xl font-black'>Dossier de modération ciblé</h1>
          <p className='mt-2 text-sm text-white/55'>Accès confidentiel, nominatif et journalisé.</p>
          {detail && (
            <div className='mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6'>
              <div className='flex justify-between gap-3'><strong>{detail.subject}</strong><span>{detail.severity}</span></div>
              <p className='mt-5 rounded-2xl bg-black/20 p-4 leading-7'>{detail.excerpt}</p>
              <p className='mt-4 text-sm text-white/55'>Signal automatisé uniquement : votre décision doit reposer sur un examen humain.</p>
            </div>
          )}
          <div className='mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6'>
            <label className='block text-sm font-bold'>Décision proposée</label>
            <select value={action} onChange={event => setAction(event.target.value as typeof action)} className='w-full rounded-xl border border-white/10 bg-[#241035] p-3'>
              <option value='no_action'>Classer sans suite</option>
              <option value='reminder'>Rappel pédagogique</option>
              <option value='warning'>Avertissement formel</option>
              <option value='message_restriction'>Restriction de messagerie</option>
              {user?.role === 'admin' && <option value='suspension'>Suspension temporaire</option>}
              {user?.role === 'admin' && <option value='permanent_ban'>Bannissement définitif</option>}
              {user?.role === 'admin' && <option value='legal_escalation'>Escalade juridique</option>}
            </select>
            <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} className='min-h-32 w-full rounded-xl border border-white/10 bg-black/20 p-3' placeholder='Motivation factuelle obligatoire' />
            <Button onClick={decide} disabled={reason.trim().length < 8}>Enregistrer la décision humaine</Button>
            {status && <p role='status' className='text-sm text-[#94ffc9]'>{status}</p>}
          </div>
        </main>
      </MainLayout>
    </ProtectedRoute>
  )
}
