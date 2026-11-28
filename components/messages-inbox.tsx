'use client'

import { PresenceDot } from '@/components/presence-dot'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, MessageCircle, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { acknowledgeConversationMessageDelivery, getUserConversations } from '@/actions/conversation-actions'
import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'
import { MemberAvatarImage } from '@/components/member-avatar-image'
import { displayMemberName } from '@/lib/display-member-name'

export interface InboxConversation {
  id: string
  last_message_id?: string | null
  last_message_sender_id?: string | null
  other_user_name: string
  last_message: string | null
  last_message_date: string | null
  other_user_avatar: string | null
  other_user_gender?: string | null
  other_user_profile_status?: string | null
  other_user_online?: boolean
  has_unread_messages: boolean
}

type InboxFilter = 'all' | 'unread'

const messageDateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
})

function normalizeConversations (items: InboxConversation[]) {
  return items.map(conversation => ({
    ...conversation,
    last_message_date: formatInboxMessageDate(conversation.last_message_date)
  }))
}

export function formatInboxMessageDate (value: string | null) {
  return value ? messageDateFormat.format(new Date(value)) : ''
}

function ConversationAvatar ({ conversation, size = 'normal' }: { conversation: InboxConversation, size?: 'normal' | 'large' }) {
  const avatarSize = size === 'large' ? 'h-14 w-14' : 'h-11 w-11'

  return (
    <div className={`relative ${avatarSize} shrink-0`}>
      <div className='h-full w-full overflow-hidden rounded-full border border-[#494136] bg-[#191b20]'>
        <MemberAvatarImage
          src={conversation.other_user_avatar}
          gender={conversation.other_user_gender}
          profileStatus={conversation.other_user_profile_status}
          alt={displayMemberName(conversation.other_user_name, 'Profil')}
          className='h-full w-full object-cover'
        />
      </div>
      {conversation.other_user_online && <PresenceDot className='-bottom-0.5 -right-0.5' />}
    </div>
  )
}

export function ConversationList ({ conversations, loading, activeConversationId, showHeading = true }: {
  conversations: InboxConversation[]
  loading: boolean
  activeConversationId?: string
  showHeading?: boolean
}) {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InboxFilter>('all')
  const previewAckedIds = useRef(new Set<string>())
  const previewAckInFlightIds = useRef(new Set<string>())
  const [previewAckRetryTick, setPreviewAckRetryTick] = useState(0)
  const unreadCount = conversations.filter(conversation => conversation.has_unread_messages).length
  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return conversations.filter(conversation => {
      const matchesSearch = !query || conversation.other_user_name?.toLowerCase().includes(query) || conversation.last_message?.toLowerCase().includes(query)
      return matchesSearch && (filter === 'all' || conversation.has_unread_messages)
    })
  }, [conversations, filter, search])

  // A visible preview confirms delivery, but opening the message thread is the
  // only action that creates a read receipt.
  useEffect(() => {
    for (const conversation of visibleConversations) {
      const messageId = conversation.last_message_id
      if (!messageId || !conversation.has_unread_messages || conversation.last_message_sender_id === user?.id) continue
      if (previewAckedIds.current.has(messageId) || previewAckInFlightIds.current.has(messageId)) continue

      previewAckInFlightIds.current.add(messageId)
      void acknowledgeConversationMessageDelivery({
        conversationId: conversation.id,
        messageIds: [messageId]
      }).then(() => {
        previewAckedIds.current.add(messageId)
      }).catch(error => {
        console.error('Failed to acknowledge inbox preview delivery:', error)
        window.setTimeout(() => setPreviewAckRetryTick(value => value + 1), 5000)
      }).finally(() => {
        previewAckInFlightIds.current.delete(messageId)
      })
    }
  }, [previewAckRetryTick, user?.id, visibleConversations])

  return (
    <section aria-label='Liste des conversations' className='flex h-full min-h-0 min-w-0 flex-col bg-[#16181f]'>
      <div className='border-b border-[#494136] px-4 pb-3 pt-4 sm:px-5'>
        <div className='flex items-start justify-between gap-4'>
          <div>{showHeading && <h2 className='font-semibold tracking-tight text-[#f8fafc]'>Messagerie privée</h2>}<p className={showHeading ? 'mt-1 text-xs text-[#94a3b8]' : 'text-xs text-[#94a3b8]'}>Vos conversations les plus récentes.</p></div>
          <span aria-label={`${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`} className='rounded-full border border-[#494136] bg-[#191b20] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#f1eee8]'>{conversations.length}</span>
        </div>
        <div className='relative mt-4'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]' aria-hidden='true' />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder='Rechercher une conversation' aria-label='Rechercher une conversation' className='h-10 rounded-xl border-[#494136] bg-[#0d0e11] pl-9 text-sm text-[#f8fafc] placeholder:text-[#aaa69e] focus-visible:ring-[#d6bc87]' />
        </div>
        <div className='mt-3 flex gap-2 overflow-x-auto pb-0.5' aria-label='Filtres de conversation'>
          <button type='button' aria-pressed={filter === 'all'} onClick={() => setFilter('all')} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === 'all' ? 'bg-[#d6bc87] text-[#191714] shadow-[0_0_14px_rgba(214,188,135,0.2)]' : 'border border-[#494136] bg-[#0d0e11] text-[#aaa69e] hover:text-[#f8fafc]'}`}>Toutes ({conversations.length})</button>
          <button type='button' aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === 'unread' ? 'bg-[#d6bc87] text-[#191714] shadow-[0_0_14px_rgba(214,188,135,0.2)]' : 'border border-[#494136] bg-[#0d0e11] text-[#aaa69e] hover:text-[#f8fafc]'}`}>Non lus{unreadCount > 0 ? ` (${unreadCount})` : ''}</button>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-2'>
        {loading && (
          <div className='space-y-1.5' aria-label='Chargement des conversations'>
            {[0, 1, 2, 3].map(item => (
              <div key={item} className='flex animate-pulse items-center gap-3 rounded-xl p-3'>
                <div className='h-11 w-11 rounded-full bg-[#34363c]' />
                <div className='flex-1 space-y-2'>
                  <div className='h-3 w-2/5 rounded bg-[#34363c]' />
                  <div className='h-3 w-4/5 rounded bg-[#191b20]' />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && visibleConversations.length === 0 && (
          <div className='px-4 py-12 text-center'>
            <MessageCircle className='mx-auto h-9 w-9 text-[#94a3b8]' aria-hidden='true' />
            <h3 className='mt-3 font-semibold text-[#f8fafc]'>Aucune conversation</h3>
            <p className='mt-2 text-sm leading-6 text-[#94a3b8]'>
              {search.trim() || filter === 'unread' ? 'Essayez un autre filtre ou une autre recherche.' : 'Vos conversations apparaîtront ici après un match accepté.'}
            </p>
          </div>
        )}
        <div className='space-y-1'>
          {visibleConversations.map(conversation => (
            <Link
              href={`/messages/${conversation.id}`}
              key={conversation.id}
              aria-current={conversation.id === activeConversationId ? 'page' : undefined}
              className='group flex min-h-[68px] items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-[#3b4257] hover:bg-[#191b20] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d6bc87] active:scale-[0.99]'
              aria-label={`Ouvrir la conversation avec ${displayMemberName(conversation.other_user_name, 'ce membre')}${conversation.has_unread_messages ? ', messages non lus' : ''}${conversation.last_message_date ? `. Dernière activité : ${conversation.last_message_date}` : ''}`}
            >
              <ConversationAvatar conversation={conversation} />
              <div className='min-w-0 flex-1'>
                <div className='flex items-baseline justify-between gap-2'>
                  <div className='flex min-w-0 items-center gap-1.5'>
                    <h3 className='truncate text-sm font-semibold text-[#f8fafc]'>{displayMemberName(conversation.other_user_name)}</h3>
                    {conversation.has_unread_messages && <span className='h-2 w-2 shrink-0 rounded-full bg-[#d6bc87] shadow-[0_0_8px_rgba(214,188,135,0.5)]'><span className='sr-only'>Messages non lus</span></span>}
                  </div>
                  <span className={`shrink-0 text-[11px] tabular-nums ${conversation.has_unread_messages ? 'font-semibold text-[#d6bc87]' : 'text-[#94a3b8]'}`}>{conversation.last_message_date}</span>
                </div>
                <p className={`mt-1 truncate text-xs leading-5 ${conversation.has_unread_messages ? 'font-medium text-[#f1eee8]' : 'text-[#94a3b8]'}`}>{conversation.last_message || 'Conversation ouverte'}</p>
              </div>
              <ChevronRight aria-hidden='true' className='h-4 w-4 shrink-0 text-[#94a3b8] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 sm:opacity-100' />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function MessagesInbox ({ initialConversations, initialError = null, initialUserId }: { initialConversations: InboxConversation[], initialError?: string | null, initialUserId: string }) {
  const { user: authUser, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState(() => normalizeConversations(initialConversations))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
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

  const activeConversation = conversations[0]

  if (!authLoading && authUser?.id !== initialUserId) return null

  return (
    <MainLayout user={authUser}>
      <LhrV2Shell
        title='Messagerie privée'
        action={<Button asChild size='sm' className='h-9 rounded-xl bg-[#d6bc87] px-3 text-[#191714] shadow-[0_0_16px_rgba(214,188,135,0.2)] hover:bg-[#e5d1aa]'><Link href='/members'><Plus className='mr-1.5 h-4 w-4' />Découvrir</Link></Button>}
      >
        <div className='overflow-hidden rounded-2xl border border-[#494136] bg-[#0d0e13] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)] lg:grid lg:h-[620px] lg:grid-cols-[360px_minmax(0,1fr)]'>
          {error ? (
            <div className='p-4 lg:col-span-2'>
              <div className='rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100'>
                <p>{error}</p>
                <Button size='sm' variant='outline' className='mt-3 border-red-200/30 bg-transparent text-red-50 hover:bg-red-500/15 hover:text-white' onClick={() => setRefreshRequest(value => value + 1)}>Réessayer</Button>
              </div>
            </div>
          ) : <ConversationList conversations={conversations} loading={loading} activeConversationId={activeConversation?.id} showHeading={false} />}
          {!error && <aside className='hidden min-h-0 flex-col border-l border-[#494136] bg-[#121318] p-8 lg:flex'>
             {activeConversation ? (
               <div className='m-auto w-full max-w-md text-center'>
                 <div className='mx-auto w-fit'><ConversationAvatar conversation={activeConversation} size='large' /></div>
                 <p className='mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#94a3b8]'>Conversation récente</p>
                 <h2 className='mt-2 text-xl font-semibold text-[#f8fafc]'>{displayMemberName(activeConversation.other_user_name)}</h2>
                 {activeConversation.other_user_online && <p className='mt-1 text-xs font-medium text-[#35e48d]'>En ligne</p>}
                 <p className='mt-3 line-clamp-3 text-sm leading-6 text-[#94a3b8]'>{activeConversation.last_message || 'Aucun message pour le moment.'}</p>
                 <Button asChild className='mt-6 rounded-xl bg-[#d6bc87] text-[#191714] hover:bg-[#e5d1aa]'><Link href={`/messages/${activeConversation.id}`}>Ouvrir la conversation</Link></Button>
               </div>
             ) : (
               <div className='m-auto max-w-sm text-center'>
                 <MessageCircle className='mx-auto h-10 w-10 text-[#94a3b8]' aria-hidden='true' />
                 <h2 className='mt-4 text-xl font-semibold text-[#f8fafc]'>Vos échanges apparaîtront ici</h2>
                 <p className='mt-2 text-sm leading-6 text-[#94a3b8]'>Commencez par découvrir les membres et créez un match pour ouvrir une conversation.</p>
               </div>
             )}
          </aside>}
        </div>
      </LhrV2Shell>
    </MainLayout>
  )
}
