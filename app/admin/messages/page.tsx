'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquareText, Search } from 'lucide-react'
import { getAdminConversationThread, getAdminConversations, type AdminConversation } from '@/actions/message-actions'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import MainLayout from '@/components/layout/main-layout'
import { ConversationThread, type ThreadMessage } from '@/components/moderation/conversation-thread'
import { ModerationAvatar } from '@/components/moderation/moderation-avatar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export default function AdminMessagesPage () {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<AdminConversation[]>([])
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [keywords, setKeywords] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (search = '') => {
    setLoading(true)
    const result = await getAdminConversations({
      page: 1,
      limit: 100,
      keywords: search.split(',').map(value => value.trim()).filter(Boolean)
    })
    setConversations(result.conversations)
    setTotal(result.total)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function open(conversationId: string) {
    setSelected(conversationId)
    setThread(await getAdminConversationThread(conversationId) as ThreadMessage[])
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <main className='container mx-auto px-4 py-10'>
          <AdminHeader user={user} />
          <AdminTabs />
          <div className='mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-white'>
            <MessageSquareText className='h-7 w-7 text-[#ff8cc8]' />
            <h1 className='mt-3 text-2xl font-black'>Conversations ({total})</h1>
            <p className='mt-2 text-sm text-white/55'>Une conversation par ligne. Ouvrez-la pour lire le fil complet et chronologique avec les avatars.</p>
            <form onSubmit={event => { event.preventDefault(); void load(keywords) }} className='mt-4 flex gap-2'>
              <input value={keywords} onChange={event => setKeywords(event.target.value)} placeholder='tarif, prix, cadeau, prestation…' className='min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2' />
              <Button type='submit'><Search className='mr-2 h-4 w-4' />Rechercher</Button>
            </form>
          </div>

          <div className='mt-5 grid gap-5 text-white lg:grid-cols-[380px_1fr]'>
            <section className='max-h-[760px] space-y-2 overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4'>
              {loading ? <p>Chargement…</p> : conversations.map(conversation => (
                <button key={conversation.id} onClick={() => void open(conversation.id)} className={`w-full rounded-2xl border p-4 text-left ${selected === conversation.id ? 'border-[#ff77b7] bg-[#ff3b8b]/15' : 'border-white/10 bg-black/15 hover:border-white/25'}`}>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex -space-x-2'>{conversation.participants.map(participant => <ModerationAvatar key={participant.userId} name={participant.name} src={participant.avatar} className='h-9 w-9' />)}</div>
                    <span className='text-xs text-white/45'>{conversation.messageCount} msg</span>
                  </div>
                  <p className='mt-3 line-clamp-2 text-sm'>{conversation.lastMessage || 'Conversation vide'}</p>
                  <div className='mt-3 flex flex-wrap gap-2'>{conversation.participants.map(participant => <Link key={participant.userId} href={`/admin/users/${participant.userId}/edit`} onClick={event => event.stopPropagation()} className='text-xs font-bold text-[#ffb2d9] underline'>{participant.name || 'Profil'}</Link>)}</div>
                </button>
              ))}
            </section>
            <section>
              <h2 className='mb-3 text-xl font-black'>{selected ? 'Fil de la conversation' : 'Sélectionnez une conversation'}</h2>
              <ConversationThread messages={thread} />
            </section>
          </div>
        </main>
      </MainLayout>
    </ProtectedRoute>
  )
}
