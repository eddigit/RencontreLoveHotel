'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Headphones, MessageCircle, Search } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { MobileNavigation } from '@/components/mobile-navigation'
import { useAuth } from '@/contexts/auth-context'
import { useNotifications } from '@/contexts/notification-context'
import { getUserConversations } from '@/actions/conversation-actions'

interface Conversation {
  id: string
  other_user_name: string
  last_message: string | null
  last_message_date: string | null
  other_user_avatar: string | null
  unread_count: number
  access_mode: 'match' | 'legacy_import' | 'admin'
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
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { data: session } = useSession()
  const { markAsRead } = useNotifications()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!authUser?.id) router.replace('/login')
  }, [authUser?.id, router])

  useEffect(() => {
    let cancelled = false

    async function fetchConversations (showLoader = false) {
      if (!session?.user?.id) return

      try {
        if (showLoader) setLoading(true)
        setError(null)
        const fetchedConversations = await getUserConversations(session.user.id)
        if (cancelled) return
        setConversations(
          fetchedConversations.map((conv: any) => ({
            id: conv.id,
            other_user_name: conv.other_user_name,
            last_message: conv.last_message,
            last_message_date: conv.last_message_date
              ? formatMessageDate(new Date(conv.last_message_date))
              : '',
            other_user_avatar: conv.other_user_avatar,
            unread_count: Number(conv.unread_count || 0),
            access_mode: conv.access_mode || 'match'
          }))
        )
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
        if (!cancelled) setError('Impossible de charger vos conversations pour le moment.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchConversations(true)
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        fetchConversations(false)
      }
    }, 8000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [session?.user?.id, markAsRead])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter(conversation =>
      conversation.other_user_name?.toLowerCase().includes(query) ||
      conversation.last_message?.toLowerCase().includes(query)
    )
  }, [conversations, search])

  if (!authUser?.id) return null

  const activeConversation = filteredConversations[0]

  return (
    <MainLayout user={authUser}>
      <LhrV2Shell
        user={authUser}
        eyebrow='Messagerie'
        title='Messages'
        subtitle='Retrouvez vos échanges, vos historiques importés et l’équipe Love Hotel au même endroit.'
        action={
          <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'>
            <Link href='/discover'>
              <Search className='mr-2 h-4 w-4' />
              Trouver un membre
            </Link>
          </Button>
        }
      >
        <div className='grid min-h-[680px] overflow-hidden rounded-2xl border border-white/10 bg-black/16 lg:grid-cols-[360px_minmax(0,1fr)_300px]'>
          <section className='border-b border-white/10 p-4 lg:border-b-0 lg:border-r'>
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
              <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/62'>
                Chargement des conversations...
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

            <div className='space-y-2'>
              {filteredConversations.map((conversation, index) => (
                <Link
                  href={`/messages/${conversation.id}`}
                  key={conversation.id}
                  className={[
                    'flex items-center gap-3 rounded-2xl p-3 transition hover:bg-white/8',
                    index === 0 ? 'bg-white/10' : 'bg-transparent'
                  ].join(' ')}
                >
                  <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/10'>
                    <Image
                      src={conversation.other_user_avatar || '/purple-haze-chat.png'}
                      alt={conversation.other_user_name || 'Profil'}
                      fill
                      className='object-cover'
                      sizes='56px'
                    />
                  </div>
                  <div className='min-w-0 flex-1'>
                  <div className='flex items-center justify-between gap-3'>
                      <h3 className='truncate font-black'>
                        {conversation.other_user_name}
                      </h3>
                      <div className='flex shrink-0 items-center gap-2'>
                        <span className='text-xs font-bold text-white/54'>{conversation.last_message_date}</span>
                        {conversation.unread_count > 0 && (
                          <span className='flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3b8b] px-1.5 text-[11px] font-black text-white'>
                            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='mt-1 flex items-center gap-2'>
                      {conversation.access_mode === 'admin' && <Headphones className='h-3.5 w-3.5 shrink-0 text-[#94ffc9]' />}
                      <p className={`truncate text-sm ${conversation.unread_count > 0 ? 'font-bold text-white/86' : 'text-white/56'}`}>
                        {conversation.last_message || 'Conversation ouverte'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className='flex min-h-[520px] flex-col justify-between p-5'>
            {activeConversation ? (
              <>
                <div className='flex items-center justify-between border-b border-white/10 pb-4'>
                  <div className='flex items-center gap-3'>
                    <div className='relative h-12 w-12 overflow-hidden rounded-full bg-white/10'>
                      <Image
                        src={activeConversation.other_user_avatar || '/purple-haze-chat.png'}
                        alt={activeConversation.other_user_name}
                        fill
                        className='object-cover'
                        sizes='48px'
                      />
                    </div>
                    <div>
                      <h2 className='font-black'>{activeConversation.other_user_name}</h2>
                      <p className='flex items-center gap-1 text-xs text-[#94ffc9]'>
                        {activeConversation.access_mode === 'admin' && <Headphones className='h-3.5 w-3.5' />}
                        {activeConversation.access_mode === 'admin' ? 'Équipe Love Hotel' : activeConversation.access_mode === 'legacy_import' ? 'Historique importé' : 'Conversation privée'}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                    <Link href={`/messages/${activeConversation.id}`}>Ouvrir</Link>
                  </Button>
                </div>

                <div className='mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 py-8'>
                  <div className='max-w-[78%] rounded-2xl rounded-bl-md bg-white/10 p-4 text-sm leading-6'>
                    {activeConversation.last_message ||
                      'Ouvrez cette conversation pour reprendre l’échange.'}
                  </div>
                </div>
              </>
            ) : (
              <div className='flex h-full flex-col items-center justify-center text-center'>
                <MessageCircle className='h-10 w-10 text-white/32' />
                <h2 className='mt-4 text-xl font-black'>Sélectionnez une conversation</h2>
                <p className='mt-2 max-w-sm text-sm leading-6 text-white/56'>
                  La messagerie V2 mettra ici les échanges, les états d’envoi et le contexte relationnel.
                </p>
              </div>
            )}
          </section>

          <aside className='border-t border-white/10 p-5 lg:border-l lg:border-t-0'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='font-black'>Votre messagerie</h3>
              <dl className='mt-4 space-y-3 text-sm'>
                <div className='flex justify-between border-b border-white/8 pb-3'>
                  <dt className='text-white/58'>Conversations</dt>
                  <dd className='font-bold'>{conversations.length}</dd>
                </div>
                <div className='flex justify-between border-b border-white/8 pb-3'>
                  <dt className='text-white/58'>Non lus</dt>
                  <dd className='font-bold'>{conversations.reduce((total, item) => total + item.unread_count, 0)}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-white/58'>Support</dt>
                  <dd className='font-bold text-[#94ffc9]'>Disponible</dd>
                </div>
              </dl>
            </div>
            <div className='mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='font-black'>Un besoin ?</h3>
              <p className='mt-3 text-sm leading-6 text-white/62'>
                L’équipe Love Hotel peut répondre dans votre messagerie pour vous accompagner sur un bug, une suggestion ou une question.
              </p>
              <Link href='/discover#feedback' className='mt-4 inline-flex text-sm font-bold text-[#ffb3d8] underline underline-offset-4'>
                Signaler un problème
              </Link>
            </div>
          </aside>
        </div>
        <MobileNavigation />
      </LhrV2Shell>
    </MainLayout>
  )
}
