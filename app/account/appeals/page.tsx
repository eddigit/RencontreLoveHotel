'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { submitModerationAppeal } from '@/actions/moderation-case-actions'
import MainLayout from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export default function AppealsPage () {
  const { user } = useAuth()
  const caseId = useSearchParams().get('case') || ''
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState('')

  async function submit () {
    await submitModerationAppeal({ caseId, reason })
    setStatus('Votre recours a été transmis pour un réexamen humain.')
  }

  return (
    <ProtectedRoute>
      <MainLayout user={user}>
        <main className='mx-auto min-h-screen w-full max-w-2xl px-4 py-12 text-white'>
          <h1 className='text-3xl font-black'>Réexamen humain d’une décision</h1>
          <p className='mt-3 leading-7 text-white/65'>Expliquez les faits que vous contestez. Votre recours sera examiné par une personne habilitée.</p>
          <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} className='mt-6 min-h-44 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4' />
          <Button className='mt-4' onClick={submit} disabled={!caseId || reason.trim().length < 8}>Envoyer mon recours</Button>
          {status && <p role='status' className='mt-4 text-[#94ffc9]'>{status}</p>}
        </main>
      </MainLayout>
    </ProtectedRoute>
  )
}
