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

export interface InboxConversation {
  id: string
  other_user_name: string
  last_message: string | null
  last_message_date: string | null
  other_user_avatar: string | null
  other_user_online?: boolean
  has_unread_messages: boolean
}

const messageDateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
})

function normalizeConversations (items: InboxConversation[]) {
  return items.map(conversation => ({
    ...conversation,
    last_message_date: conversation.last_message_date
      ? messageDateFormat.format(new Date(conversation.last_message_date))
      : ''
  }))
}

export function MessagesInbox ({ initialConversations, initialError = null, initialUserId }: { initialConversations: InboxConversation[], initialError?: string | null, initialUserId: string }) {
  const { user: authUser, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState(() => normalizeConversations(initialConversations))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [search, setSearch] = useState('')
  const [refreshRequest, setRefreshRequest] = useState(0)

  useEffect(() => {
    if (authLoading || authUser?.id === initialUserId) return
    if (!authUser?.id) router.replace('/login')
    else router.refresh()
  }, [authLoading, authUser?.id, initialUserId, router])

  useEffect(() => {
    let cancelled = false
    let pollingStopped = false
    let fetching = false
    async function fetchConversations (showLoader = false) {
      if (!authUser?.id || authUser.id !== initialUserId || fetching) return
      fetching = true
      try {
        if (showLoader) setLoading(true)
        const fetchedConversations = await getUserConversations(authUser.id)
        if (cancelled) return
        setConversations(normalizeConversations(fetchedConversations as InboxConversation[]))
        setError(null)
      } catch (fetchError) {
        if (cancelled) return
        pollingStopped = recoverFromStaleServerAction(fetchError)
        if (!pollingStopped && showLoader) setError('Impossible de charger vos conversations pour le moment. Réessayez.')
      } finally {
        fetching = false
        if (!cancelled) setLoading(false)
      }
    }
    // The first list is part of the server response: no post-hydration server action.
    if (refreshRequest > 0) void fetchConversations(true)
    const interval = window.setInterval(() => {
      if (!pollingStopped && document.visibilityState !== 'hidden') void fetchConversations(false)
    }, 8000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [authUser?.id, initialUserId, refreshRequest])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter(conversation => conversation.other_user_name?.toLowerCase().includes(query) || conversation.last_message?.toLowerCase().includes(query))
  }, [conversations, search])

  const activeConversation = filteredConversations[0]

  if (!authLoading && authUser?.id !== initialUserId) return null

  return (
    <MainLayout user={authUser}>
      <LhrV2Shell
        user={authUser}
        title='Messages'
        action={
          <Button asChild size='sm' className='h-9 rounded-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] px-3 text-white hover:opacity-90'>
            <Link href='/members'>
              <Plus className='mr-1.5 h-4 w-4' />
              Découvrir
            </Link>
          </Button>
        }
      >
        <div className='grid min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(0,0,0,0.22))] shadow-2xl shadow-black/20 lg:min-h-[620px] lg:grid-cols-[380px_minmax(0,1fr)] lg:rounded-3xl'>
          <section aria-label='Liste des conversations' className='min-w-0 border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-r'>
            <div className='mb-3 flex items-center justify-between gap-3 px-1'>
              <div>
                <h2 className='text-base font-black'>Boîte de réception</h2>
                <p className='mt-0.5 text-xs text-white/50'>Dernière activité en premier</p>
              </div>
              <span aria-label={`${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`} className='rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-black tabular-nums text-white/70'>{conversations.length}</span>
            </div>
            <div className='relative mb-3'>
              <Search className='absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38' />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder='Rechercher une conversation'
                aria-label='Rechercher une conversation'
                className='h-10 rounded-xl border-white/10 bg-white/[0.06] pl-10 text-sm text-white placeholder:text-white/38'
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
                <p>{error}</p>
                <Button size="sm" variant="outline" onClick={() => setRefreshRequest(value => value + 1)}>Réessayer</Button>
              </div>
            )}

            {!loading && !error && filteredConversations.length === 0 && (
              <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center'>
                <MessageCircle className='mx-auto h-8 w-8 text-white/38' />
                <h2 className='mt-3 font-bold'>Aucune conversation</h2>
                <p className='mt-2 text-sm text-white/56'>
                  {search.trim() ? 'Essayez un autre nom ou un mot du dernier message.' : 'Vos conversations apparaîtront ici après un match accepté.'}
                </p>
              </div>
            )}

            <div className='space-y-1.5'>
              {filteredConversations.map(conversation => (
                <Link
                  href={`/messages/${conversation.id}`}
                  key={conversation.id}
                  className={[
                    'group flex min-h-[72px] items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#94ffc9] sm:px-3',
                    'hover:border-white/10 hover:bg-white/[0.055]'
                  ].join(' ')}
                  aria-label={`Ouvrir la conversation avec ${conversation.other_user_name || 'ce membre'}${conversation.has_unread_messages ? ', messages non lus' : ''}${conversation.last_message_date ? `. Dernière activité : ${conversation.last_message_date}` : ''}`}
                >
                  <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10 sm:h-14 sm:w-14'>
                    <Image
                      src={conversation.other_user_avatar || '/default-member-couple.jpg'}
                      alt={conversation.other_user_name || 'Profil'}
                      fill
                      className='object-cover'
                      sizes='(max-width: 640px) 48px, 56px'
                    />
                    {conversation.other_user_online && (
                      <span className='absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#170321] bg-[#35e48d]' title='En ligne' aria-label='En ligne' />
                    )}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-baseline justify-between gap-2'>
                      <div className='flex min-w-0 items-center gap-1.5'>
                        <h3 className='truncate text-sm font-black sm:text-base'>
                          {conversation.other_user_name}
                        </h3>
                        {conversation.has_unread_messages && (
                          <span className='h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff8cc8] ring-2 ring-[#ff3b8b]/20'>
                            <span className='sr-only'>Messages non lus</span>
                          </span>
                        )}
                      </div>
                      <span className='shrink-0 text-[11px] font-bold tabular-nums text-white/54'>
                        {conversation.last_message_date}
                      </span>
                    </div>
                    <p className='mt-1 truncate text-sm leading-5 text-white/56'>
                      {conversation.last_message || 'Conversation ouverte'}
                    </p>
                  </div>
                  <ChevronRight aria-hidden='true' className='hidden h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-[#ff8cc8] sm:block' />
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
