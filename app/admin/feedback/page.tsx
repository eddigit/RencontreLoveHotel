'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock3, ExternalLink, Inbox, Send, UserRound } from 'lucide-react'
import MainLayout from '@/components/layout/main-layout'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import {
  getCommunityFeedback,
  replyToCommunityFeedback,
  updateCommunityFeedbackStatus,
  type CommunityFeedbackStatus
} from '@/actions/community-feedback-actions'

type FeedbackItem = {
  id: string
  reporter_id: string | null
  reporter_name: string
  reporter_email: string
  reporter_avatar?: string | null
  kind: 'bug' | 'suggestion'
  message: string
  page: string
  status: CommunityFeedbackStatus
  conversation_id: string | null
  request_email_reply: boolean
  email_reply_sent_at?: string | null
  created_at: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const statusLabels: Record<CommunityFeedbackStatus, string> = {
  open: 'À traiter',
  in_progress: 'En cours',
  resolved: 'Résolu'
}

export default function AdminFeedbackPage() {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [activeStatus, setActiveStatus] = useState<CommunityFeedbackStatus>('open')

  async function loadFeedback() {
    setLoading(true)
    try {
      const rows = await getCommunityFeedback()
      setFeedback(rows as FeedbackItem[])
      setSelectedId(current => current && rows.some((item: FeedbackItem) => item.id === current)
        ? current
        : rows[0]?.id || null)
    } catch {
      setStatus('Les retours membres ne sont pas accessibles pour le moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFeedback()
  }, [])

  const selected = feedback.find(item => item.id === selectedId) || null
  const filteredFeedback = feedback.filter(item => item.status === activeStatus)

  useEffect(() => {
    const visibleFeedback = feedback.filter(item => item.status === activeStatus)
    setSelectedId(current => current && visibleFeedback.some(item => item.id === current)
      ? current
      : visibleFeedback[0]?.id || null)
  }, [activeStatus, feedback])

  async function handleReply() {
    if (!selected || !reply.trim()) return
    setSending(true)
    setStatus('')
    try {
      const result = await replyToCommunityFeedback(selected.id, reply)
      setReply('')
      setStatus(result.emailSent
        ? 'Réponse envoyée dans la messagerie et par email.'
        : 'Réponse envoyée dans la messagerie du membre.')
      await loadFeedback()
    } catch {
      setStatus('La réponse n’a pas pu être envoyée.')
    } finally {
      setSending(false)
    }
  }

  async function handleStatus(nextStatus: CommunityFeedbackStatus) {
    if (!selected) return
    try {
      await updateCommunityFeedbackStatus(selected.id, nextStatus)
      setStatus(`Retour marqué : ${statusLabels[nextStatus]}.`)
      await loadFeedback()
    } catch {
      setStatus('Le statut n’a pas pu être mis à jour.')
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container mx-auto px-4 py-10'>
          <AdminHeader user={user} />
          <AdminTabs />

          <div className='mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div>
              <h1 className='text-2xl font-bold'>Support membres</h1>
              <p className='mt-2 max-w-3xl text-sm text-muted-foreground'>
                Bugs et suggestions arrivent ici. Répondez directement dans la messagerie du membre, puis clôturez le suivi.
              </p>
            </div>
            <div className='flex items-center gap-2 rounded-full border border-[#94ffc9]/25 bg-[#94ffc9]/10 px-4 py-2 text-sm text-[#caffdf]'>
              <Inbox className='h-4 w-4' />
              {feedback.filter(item => item.status === 'open').length} à traiter
            </div>
          </div>

          {status && (
            <div className='mb-5 rounded-lg border border-[#ff8cc8]/30 bg-[#ff3b8b]/10 px-4 py-3 text-sm text-white'>
              {status}
            </div>
          )}

          <div className='mb-5 flex gap-2 overflow-x-auto' aria-label='Filtrer le support'>
            <Button variant={activeStatus === 'open' ? 'default' : 'outline'} size='sm' onClick={() => setActiveStatus('open')} className={activeStatus === 'open' ? 'bg-[#ff4fa3] text-white' : 'border-white/15 bg-white/5'}>
              À traiter ({feedback.filter(item => item.status === 'open').length})
            </Button>
            <Button variant={activeStatus === 'in_progress' ? 'default' : 'outline'} size='sm' onClick={() => setActiveStatus('in_progress')} className={activeStatus === 'in_progress' ? 'bg-[#ff4fa3] text-white' : 'border-white/15 bg-white/5'}>
              En cours ({feedback.filter(item => item.status === 'in_progress').length})
            </Button>
            <Button variant={activeStatus === 'resolved' ? 'default' : 'outline'} size='sm' onClick={() => setActiveStatus('resolved')} className={activeStatus === 'resolved' ? 'bg-[#ff4fa3] text-white' : 'border-white/15 bg-white/5'}>
              Résolus ({feedback.filter(item => item.status === 'resolved').length})
            </Button>
          </div>

          {loading ? (
            <Card><CardContent className='p-6 text-sm text-muted-foreground'>Chargement des retours...</CardContent></Card>
          ) : filteredFeedback.length === 0 ? (
            <Card><CardContent className='p-6 text-sm text-muted-foreground'>Aucun retour dans cette catégorie.</CardContent></Card>
          ) : (
            <div className='grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]'>
              <div className='space-y-3'>
                {filteredFeedback.map(item => (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${selectedId === item.id ? 'border-[#ff8cc8]/70 bg-[#ff3b8b]/12' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='font-semibold'>{item.kind === 'bug' ? 'Bug signalé' : 'Suggestion'}</p>
                        <p className='mt-1 text-sm text-white/70'>{item.reporter_name} · {item.page}</p>
                      </div>
                      <span className='shrink-0 text-xs text-[#caffdf]'>{statusLabels[item.status]}</span>
                    </div>
                    <p className='mt-3 line-clamp-2 text-sm text-muted-foreground'>{item.message}</p>
                    <p className='mt-3 text-xs text-muted-foreground'>{formatDate(item.created_at)}</p>
                  </button>
                ))}
              </div>

              {selected && (
                <Card>
                  <CardHeader>
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <CardTitle>{selected.kind === 'bug' ? 'Bug signalé' : 'Suggestion'}</CardTitle>
                        <p className='mt-2 text-sm text-muted-foreground'>{formatDate(selected.created_at)} · {statusLabels[selected.status]}</p>
                      </div>
                      <div className='flex gap-2'>
                        {selected.reporter_id && (
                          <Button variant='outline' size='icon' asChild title='Voir le profil'>
                            <Link href={`/profile/${selected.reporter_id}`}><UserRound className='h-4 w-4' /></Link>
                          </Button>
                        )}
                        {selected.conversation_id && (
                          <Button variant='outline' size='icon' asChild title='Ouvrir la messagerie'>
                            <Link href={`/messages/${selected.conversation_id}`}><ExternalLink className='h-4 w-4' /></Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-5'>
                    <div className='rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm'>
                      <p className='font-semibold'>{selected.reporter_name}</p>
                      <p className='mt-1 text-muted-foreground'>{selected.reporter_email}</p>
                      <p className='mt-3 whitespace-pre-wrap text-white/80'>{selected.message}</p>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                      <Button variant='outline' size='sm' onClick={() => void handleStatus('in_progress')}>
                        <Clock3 className='mr-2 h-4 w-4' /> En cours
                      </Button>
                      <Button variant='outline' size='sm' onClick={() => void handleStatus('resolved')}>
                        <CheckCircle2 className='mr-2 h-4 w-4' /> Résolu
                      </Button>
                    </div>

                    <div className='space-y-3'>
                      <label className='text-sm font-semibold' htmlFor='feedback-reply'>Répondre dans la messagerie</label>
                      <textarea
                        id='feedback-reply'
                        value={reply}
                        onChange={event => setReply(event.target.value)}
                        rows={5}
                        className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                        placeholder='Votre réponse au membre...'
                      />
                      <p className='text-xs text-muted-foreground'>
                        {selected.request_email_reply
                          ? 'Le membre a demandé à recevoir aussi chaque réponse par email.'
                          : 'Le membre recevra la réponse dans sa messagerie uniquement.'}
                      </p>
                      <Button onClick={() => void handleReply()} disabled={sending || !reply.trim()} className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>
                        <Send className='mr-2 h-4 w-4' />
                        {sending ? 'Envoi...' : 'Envoyer la réponse'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
