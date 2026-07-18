'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { getMyOfficialModerationMessages } from '@/actions/moderation-investigation-actions'
import MainLayout from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/contexts/auth-context'

type OfficialMessage = Awaited<ReturnType<typeof getMyOfficialModerationMessages>>[number]

export default function AccountModerationPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<OfficialMessage[]>([])
  useEffect(() => { getMyOfficialModerationMessages().then(setMessages) }, [])
  return (
    <ProtectedRoute>
      <MainLayout user={user}>
        <main className='mx-auto min-h-screen w-full max-w-3xl px-4 py-10 text-white'>
          <div className='rounded-3xl border border-white/10 bg-white/[0.04] p-6'><ShieldCheck className='h-8 w-8 text-[#ff8cc8]' /><h1 className='mt-3 text-3xl font-black'>Communications officielles</h1><p className='mt-2 text-sm text-white/60'>Canal confidentiel de l’équipe de modération LHR, distinct de votre messagerie privée.</p></div>
          <div className='mt-5 space-y-3'>{messages.length === 0 ? <p>Aucune communication officielle.</p> : messages.map(message => <article key={message.id} className='rounded-2xl border border-[#ff8cc8]/25 bg-[#ff3b8b]/10 p-5'><p className='whitespace-pre-wrap leading-7'>{message.content}</p><time className='mt-3 block text-xs text-white/45'>{new Date(message.created_at).toLocaleString('fr-FR')}</time></article>)}</div>
        </main>
      </MainLayout>
    </ProtectedRoute>
  )
}
