'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Archive, Ban, Bot, Download, MessageSquareWarning, ShieldAlert, UserRoundSearch } from 'lucide-react'
import {
  applyInvestigationAction,
  freezeInvestigationEvidence,
  getInvestigationConversations,
  getInvestigationThread,
  getModerationInvestigation,
  getOfficialModerationMessages,
  recommendInvestigationAction,
  sendOfficialModerationMessage,
  setInvestigationAutomation
} from '@/actions/moderation-investigation-actions'
import MainLayout from '@/components/layout/main-layout'
import { ConversationThread, type ThreadMessage } from '@/components/moderation/conversation-thread'
import { ModerationAvatar } from '@/components/moderation/moderation-avatar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

type Detail = Awaited<ReturnType<typeof getModerationInvestigation>> & {
  subjectUserId?: string; name?: string; email?: string | null; avatar?: string | null; profile?: Record<string, unknown> | null
  isBanned?: boolean; messagingRestrictedUntil?: Date | string | null
}
type Conversation = Awaited<ReturnType<typeof getInvestigationConversations>>[number]

export default function ModerationInvestigationPage () {
  const { user } = useAuth()
  const params = useParams<{ id: string }>()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [officialMessages, setOfficialMessages] = useState<any[]>([])
  const [officialText, setOfficialText] = useState('')
  const [reason, setReason] = useState('Examen humain du dossier et des éléments contextualisés.')
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState<'overview' | 'profile' | 'conversations' | 'official' | 'evidence'>('overview')

  const load = useCallback(async () => {
    const dossier = await getModerationInvestigation(params.id) as Detail
    setDetail(dossier)
    if (user?.role === 'admin') {
      const [conversationRows, officialRows] = await Promise.all([
        getInvestigationConversations(params.id), getOfficialModerationMessages(params.id)
      ])
      setConversations(conversationRows)
      setOfficialMessages(officialRows)
    }
  }, [params.id, user?.role])

  useEffect(() => { load().catch(error => setStatus(error.message)) }, [load])

  async function openConversation(conversationId: string) {
    setSelectedConversation(conversationId)
    setThread(await getInvestigationThread(params.id, conversationId) as ThreadMessage[])
  }
  async function act(action: Parameters<typeof applyInvestigationAction>[0]['action']) {
    if (!window.confirm(`Confirmer l’action « ${action} » sur ce profil ?`)) return
    await applyInvestigationAction({ investigationId: params.id, action, reason })
    setStatus('Action administrative enregistrée dans l’historique du dossier.')
    await load()
  }
  async function recommend(recommendation: 'warning' | 'message_restriction' | 'suspension' | 'permanent_ban' | 'legal_escalation') {
    await recommendInvestigationAction({ investigationId: params.id, recommendation, reason })
    setStatus('Recommandation de l’adhérent-modérateur enregistrée pour décision administrateur.')
  }
  async function sendOfficial() {
    await sendOfficialModerationMessage(params.id, officialText)
    setOfficialText('')
    setStatus('Message officiel envoyé et notification créée.')
    await load()
  }

  const tabs = [
    ['overview', 'Vue d’ensemble'], ['profile', 'Profil et identité'], ['conversations', 'Conversations'],
    ['official', 'Canal officiel'], ['evidence', 'Preuves et historique']
  ] as const

  return (
    <ProtectedRoute allowedRoles={['admin', 'community_moderator']}>
      <MainLayout user={user}>
        <main className='mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-white'>
          <div className='flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5'>
            <div className='flex items-center gap-4'>
              <ModerationAvatar name={detail?.name || detail?.subject} src={detail?.avatar} className='h-16 w-16' />
              <div><p className='text-xs font-bold uppercase tracking-[.16em] text-[#ff8cc8]'>Enquête prioritaire</p><h1 className='text-2xl font-black'>{detail?.name || detail?.subject || 'Chargement…'}</h1><p className='text-sm text-white/55'>{detail?.email || 'Identité pseudonymisée'}</p></div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {detail?.subjectUserId && <Button asChild variant='outline'><Link href={`/admin/users/${detail.subjectUserId}/edit`}><UserRoundSearch className='mr-2 h-4 w-4' />Voir le profil</Link></Button>}
              {user?.role === 'admin' && <Button variant='destructive' onClick={() => act('permanent_ban')}><Ban className='mr-2 h-4 w-4' />Bannir définitivement</Button>}
            </div>
          </div>

          <div className='mt-4 flex gap-2 overflow-x-auto pb-2'>{tabs.map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)} disabled={user?.role !== 'admin' && value !== 'overview'} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold ${tab === value ? 'border-[#ff77b7] bg-[#ff3b8b]/20' : 'border-white/10 bg-black/15 text-white/60'} disabled:opacity-35`}>{label}</button>
          ))}</div>
          {status && <p role='status' className='mt-4 rounded-xl border border-[#94ffc9]/25 bg-[#94ffc9]/10 p-3 text-sm text-[#baffe0]'>{status}</p>}

          {detail && tab === 'overview' && <div className='mt-5 grid gap-5 lg:grid-cols-[1.4fr_.8fr]'>
            <section className='rounded-3xl border border-white/10 bg-white/[0.04] p-5'><h2 className='text-xl font-black'>Alertes regroupées ({detail.alerts.length})</h2><div className='mt-4 space-y-3'>{detail.alerts.map((alert: any) => <div key={alert.id} className='rounded-2xl border border-red-300/20 bg-red-500/[0.07] p-4'><div className='flex justify-between gap-3'><strong>{alert.reason}</strong><span className='text-xs'>{alert.severity}</span></div><p className='mt-2 whitespace-pre-wrap text-sm text-white/70'>{alert.excerpt || 'Aucun extrait disponible.'}</p><p className='mt-2 text-xs text-white/40'>{new Date(alert.createdAt).toLocaleString('fr-FR')}</p></div>)}</div></section>
            <aside className='space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5'><h2 className='text-xl font-black'>{user?.role === 'admin' ? 'Actions immédiates' : 'Recommandation à l’administrateur'}</h2><textarea value={reason} onChange={event => setReason(event.target.value)} className='min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm' /><Button className='w-full' onClick={() => user?.role === 'admin' ? act('warning') : recommend('warning')}><MessageSquareWarning className='mr-2 h-4 w-4' />{user?.role === 'admin' ? 'Avertissement' : 'Recommander un avertissement'}</Button>{user?.role === 'admin' && <><Button className='w-full' variant='outline' onClick={() => act('message_restriction')}>Restreindre la messagerie 30 jours</Button><Button className='w-full' variant='outline' onClick={() => act('suspension')}>Suspendre le compte</Button><Button className='w-full' variant='outline' onClick={() => act('restore_messaging')}>Rétablir la messagerie</Button></>}</aside>
          </div>}

          {detail && tab === 'profile' && <section className='mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6'><h2 className='text-xl font-black'>Profil et identité</h2><div className='mt-4 grid gap-4 sm:grid-cols-2'><p><span className='text-white/45'>Nom</span><br />{detail.name}</p><p><span className='text-white/45'>Email</span><br />{detail.email}</p><p><span className='text-white/45'>Identifiant</span><br />{detail.subjectUserId}</p><p><span className='text-white/45'>Restriction actuelle</span><br />{detail.messagingRestrictedUntil ? new Date(detail.messagingRestrictedUntil).toLocaleString('fr-FR') : 'Aucune'}</p></div><pre className='mt-5 overflow-auto rounded-2xl bg-black/25 p-4 text-xs text-white/70'>{JSON.stringify(detail.profile || {}, null, 2)}</pre></section>}

          {tab === 'conversations' && user?.role === 'admin' && <section className='mt-5 grid gap-5 lg:grid-cols-[340px_1fr]'><div className='space-y-2 rounded-3xl border border-white/10 bg-white/[0.04] p-4'><h2 className='mb-3 font-black'>Toutes les conversations ({conversations.length})</h2>{conversations.map(conversation => <button key={conversation.id} onClick={() => openConversation(conversation.id)} className={`w-full rounded-xl border p-3 text-left ${selectedConversation === conversation.id ? 'border-[#ff77b7] bg-[#ff3b8b]/15' : 'border-white/10 bg-black/15'}`}><div className='flex -space-x-2'>{conversation.participants.map((participant: any) => <ModerationAvatar key={participant.userId} name={participant.name} src={participant.avatar} className='h-8 w-8' />)}</div><p className='mt-2 line-clamp-2 text-sm'>{conversation.lastMessage}</p><p className='mt-1 text-xs text-white/45'>{conversation.messageCount} messages · {conversation.alertCount} alertes</p></button>)}</div><div><h2 className='mb-3 text-xl font-black'>Fil complet et chronologique</h2><ConversationThread messages={thread} subjectUserId={detail?.subjectUserId} /></div></section>}

          {tab === 'official' && user?.role === 'admin' && <section className='mt-5 grid gap-5 lg:grid-cols-[1fr_420px]'><div><h2 className='mb-3 text-xl font-black'>Canal officiel</h2><ConversationThread messages={officialMessages.map(message => ({ id: message.id, senderId: message.sender_id, senderName: message.sender_name || 'Équipe de modération LHR', senderAvatar: message.sender_avatar, content: message.content, createdAt: message.created_at }))} subjectUserId={detail?.subjectUserId} /></div><div className='rounded-3xl border border-white/10 bg-white/[0.04] p-5'><h3 className='font-black'>Écrire au membre en direct</h3><p className='mt-2 text-xs text-white/55'>Ce canal officiel reste séparé de ses conversations privées et conserve l’accusé de lecture.</p><textarea value={officialText} onChange={event => setOfficialText(event.target.value)} placeholder='Message officiel factuel…' className='mt-4 min-h-40 w-full rounded-xl border border-white/10 bg-black/20 p-3' /><Button className='mt-3 w-full' disabled={officialText.trim().length < 8} onClick={sendOfficial}>Envoyer officiellement</Button></div></section>}

          {tab === 'evidence' && user?.role === 'admin' && <section className='mt-5 grid gap-5 md:grid-cols-2'><div className='rounded-3xl border border-white/10 bg-white/[0.04] p-6'><Archive className='h-7 w-7 text-[#ff8cc8]' /><h2 className='mt-3 text-xl font-black'>Conservation probatoire</h2><p className='mt-2 text-sm text-white/60'>Le gel fige un instantané, active la conservation juridique et calcule son empreinte SHA‑256.</p><Button className='mt-5' onClick={async () => { const result = await freezeInvestigationEvidence(params.id, reason); setStatus(`Preuves gelées — SHA-256 ${result.sha256}`); await load() }}><ShieldAlert className='mr-2 h-4 w-4' />Geler les preuves</Button></div><div className='rounded-3xl border border-white/10 bg-white/[0.04] p-6'><Download className='h-7 w-7 text-[#ff8cc8]' /><h2 className='mt-3 text-xl font-black'>Exporter le dossier</h2><p className='mt-2 text-sm text-white/60'>Archive ZIP lisible : rapport HTML, profil, messages, pièces jointes référencées, décisions, canal officiel, audit et manifeste signé. Aucune transmission automatique.</p><Button className='mt-5' asChild><a href={`/api/admin/moderation/investigations/${params.id}/export`}><Download className='mr-2 h-4 w-4' />Exporter le dossier</a></Button><Button className='mt-3 ml-2' variant='outline' onClick={async () => { await setInvestigationAutomation(params.id, !(detail?.automationEnabled ?? true), reason); setStatus('Automatismes du dossier mis à jour.'); await load() }}><Bot className='mr-2 h-4 w-4' />{detail?.automationEnabled ? 'Suspendre' : 'Réactiver'} les automatismes</Button></div></section>}
        </main>
      </MainLayout>
    </ProtectedRoute>
  )
}
