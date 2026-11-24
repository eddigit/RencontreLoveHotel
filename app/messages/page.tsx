'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, MessageCircle, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { getUserConversations } from '@/actions/conversation-actions'
import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'

interface Conversation {
  id: string
  other_user_name: string
  last_message: string | null
  last_message_date: string | null
  other_user_avatar: string | null
  other_user_online?: boolean
}

function formatMessageDate (date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const timeString = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  if (date >= today) return timeString
  if (date >= yesterday) return `Hier`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function MessagesPage () {
  const { user: authUser, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!authLoading && !authUser?.id) router.replace('/login')
  }, [authLoading, authUser?.id, router])

  useEffect(() => {
    let cancelled = false
    let pollingStopped = false
    let fetching = false

    async function fetchConversations (showLoader = false) {
      if (!authUser?.id || fetching) return
      fetching = true

      try {
        if (showLoader) setLoading(true)
        const fetchedConversations = await getUserConversations(authUser.id)
        if (cancelled) return
        setError(null)
        setConversations(
          fetchedConversations.map((conv: any) => ({
            id: conv.id,
            other_user_name: conv.other_user_name,
            last_message: conv.last_message,
            last_message_date: conv.last_message_date
              ? formatMessageDate(new Date(conv.last_message_date))
              : '',
            other_user_avatar: conv.other_user_avatar,
            other_user_online: Boolean(conv.other_user_online)
          }))
        )
      } catch (error) {
        if (cancelled) return
        pollingStopped = recoverFromStaleServerAction(error)
        if (!pollingStopped && showLoader) {
          setError('Impossible de charger vos conversations pour le moment. Rechargez la page pour réessayer.')
        }
      } finally {
        fetching = false
        if (!cancelled) setLoading(false)
      }
    }

    fetchConversations(true)
    const interval = setInterval(() => {
      if (!pollingStopped && document.visibilityState !== 'hidden') {
        fetchConversations(false)
      }
    }, 8000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [authUser?.id])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter(conversation =>
      conversation.other_user_name?.toLowerCase().includes(query) ||
      conversation.last_message?.toLowerCase().includes(query)
    )
  }, [conversations, search])

  if (authLoading || !authUser?.id) return null

  const activeConversation = filteredConversations[0]

  return (
    <MainLayout user={authUser}>
      <LhrV2Shell
        user={authUser}
        eyebrow='Vos échanges'
        title='Messages'
        subtitle='Vos conversations privées avec les membres avec qui vous avez un match accepté.'
        action={
          <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'>
            <Link href='/members'>
              <Plus className='mr-2 h-4 w-4' />
              Trouver un membre
            </Link>
          </Button>
        }
      >
        <div className='grid min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(0,0,0,0.22))] shadow-2xl shadow-black/20 lg:grid-cols-[380px_minmax(0,1fr)]'>
          <section aria-label='Liste des conversations' className='min-w-0 border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-r'>
            <div className='mb-4 flex items-center justify-between gap-3 px-1'>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#ff8cc8]'>Boîte de réception</p>
                <h2 className='mt-1 text-lg font-black'>Vos conversations</h2>
              </div>
              <span className='rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-black text-white/70'>{conversations.length}</span>
            </div>
            <div className='relative mb-4'>
              <Search className='absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38' />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder='Rechercher une conversation'
                className='h-12 rounded-2xl border-white/10 bg-white/[0.06] pl-11 text-white placeholder:text-white/38'
              />
            </div>

            {loading && (
              <div className='space-y-2' aria-label='Chargement des conversations'>
                {[0, 1, 2, 3].map(item => (
                  <div key={item} className='flex animate-pulse items-center gap-3 rounded-2xl bg-white/[0.04] p-3'>
                    <div className='h-12 w-12 rounded-full bg-white/10' />
                    <div className='flex-1 space-y-2'><div className='h-3 w-2/5 rounded bg-white/10' /><div className='h-3 w-4/5 rounded bg-white/[0.07]' /></div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className='rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100'>
                {error}
              </div>
            )}

            {!loading && !error && filteredConversations.length === 0 && (
              <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center'>
                <MessageCircle className='mx-auto h-8 w-8 text-white/38' />
                <h2 className='mt-3 font-bold'>Aucune conversation</h2>
                <p className='mt-2 text-sm text-white/56'>
                  Vos conversations apparaîtront ici après un match accepté.
                </p>
              </div>
            )}

            <div className='space-y-1.5'>
              {filteredConversations.map((conversation, index) => (
                <Link
                  href={`/messages/${conversation.id}`}
                  key={conversation.id}
                  className={[
                    'group flex items-center gap-3 rounded-2xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-[#94ffc9]',
                    index === 0 ? 'border-[#ff8cc8]/25 bg-[#ff3b8b]/12 hover:bg-[#ff3b8b]/18' : 'border-transparent hover:border-white/10 hover:bg-white/[0.055]'
                  ].join(' ')}
                >
                  <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/10'>
                    <Image
                      src={conversation.other_user_avatar || '/default-member-couple.jpg'}
                      alt={conversation.other_user_name || 'Profil'}
                      fill
                      className='object-cover'
                      sizes='56px'
                    />
                    {conversation.other_user_online && (
                      <span className='absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#170321] bg-[#35e48d]' title='En ligne' aria-label='En ligne' />
                    )}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center justify-between gap-3'>
                      <h3 className='truncate font-black'>
                        {conversation.other_user_name}
                      </h3>
                      <span className='shrink-0 text-xs font-bold text-white/54'>
                        {conversation.last_message_date}
                      </span>
                    </div>
                    <p className='mt-1 truncate text-sm text-white/56'>
                      {conversation.last_message || 'Conversation ouverte'}
                    </p>
                  </div>
                  <ChevronRight className='h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-[#ff8cc8]' />
                </Link>
              ))}
            </div>
          </section>

          <section className='hidden min-h-[620px] flex-col justify-between border-r border-white/10 p-6 lg:flex'>
            {activeConversation ? (
              <>
                <div className='flex items-center justify-between border-b border-white/10 pb-4'>
                  <div className='flex items-center gap-3'>
                    <div className='relative h-12 w-12 overflow-hidden rounded-full bg-white/10'>
                      <Image
                        src={activeConversation.other_user_avatar || '/default-member-couple.jpg'}
                        alt={activeConversation.other_user_name}
                        fill
                        className='object-cover'
                        sizes='48px'
                      />
                      {activeConversation.other_user_online && (
                        <span className='absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#170321] bg-[#35e48d]' title='En ligne' aria-label='En ligne' />
                      )}
                    </div>
                    <div>
                      <h2 className='font-black'>{activeConversation.other_user_name}</h2>
                      <p className='text-xs text-[#94ffc9]'>Conversation disponible</p>
                    </div>
                  </div>
                  <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                    <Link href={`/messages/${activeConversation.id}`}>Ouvrir</Link>
                  </Button>
                </div>

                <div className='mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 py-8'>
                  <p className='mb-2 text-center text-xs font-bold uppercase tracking-[0.16em] text-white/38'>Dernier message</p>
                  <div className='max-w-[78%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.075] p-4 text-sm leading-6'>
                    {activeConversation.last_message ||
                      'Aucun message pour le moment.'}
                  </div>

                </div>
              </>
            ) : (
              <div className='flex h-full flex-col items-center justify-center text-center'>
                <MessageCircle className='h-10 w-10 text-white/32' />
                <h2 className='mt-4 text-xl font-black'>Sélectionnez une conversation</h2>
                <p className='mt-2 max-w-sm text-sm leading-6 text-white/56'>
                   Vos échanges apparaissent ici dès qu’un match est accepté.
                </p>
              </div>
            )}
          </section>


        </div>
      </LhrV2Shell>
    </MainLayout>
  )
}
