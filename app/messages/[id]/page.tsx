'use client'

import type React from 'react'
import { use, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronUp,
  Clock3,
  Flag,
  ImageIcon,
  Images,
  LockKeyhole,
  Mic,
  Paperclip,
  Send,
  ShieldCheck,
  Square,
  UserRound,
  Video,
  X
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConversationList, formatInboxMessageDate, type InboxConversation } from '@/components/messages-inbox'
import { getConversationThread } from '@/actions/conversation-thread'
import MainLayout from '@/components/layout/main-layout'
import {
  getConversationMessagesAfter,
  getConversationMessagesBefore,
  getUserConversations,
  markConversationMessagesAsRead,
  sendMessage
} from '@/actions/conversation-actions'
import { reportMember } from '@/actions/member-safety-actions'
import { useNotifications } from '@/contexts/notification-context'

interface MessageAttachment {
  id?: string
  url: string
  media_type: 'image' | 'audio' | 'video'
  file_name?: string | null
  mime_type?: string | null
  size_bytes?: number | null
}

interface PendingAttachment {
  url: string
  mediaType: 'image' | 'audio' | 'video'
  fileName: string
  mimeType: string
  sizeBytes: number
}

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender_name?: string
  sender_avatar?: string
  attachments?: MessageAttachment[]
}

interface ConversationDetails {
  id: string
  other_user_id: string
  other_user_name: string
  other_user_avatar: string | null
  other_user_online?: boolean
}

const CONTACT_SAFETY_EXPLANATION = 'Pour votre sécurité, les coordonnées et moyens de contact externes ne peuvent pas être partagés. Poursuivez votre échange dans LHR.'

function memberFacingError (error: unknown, fallback: string) {
  return error instanceof Error && error.message.toLowerCase().includes('coordonnées')
    ? CONTACT_SAFETY_EXPLANATION
    : fallback
}

function formatBytes (bytes?: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function messageDayLabel (value: string) {
  const date = new Date(value)
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  if (date >= todayStart) return 'Aujourd’hui'
  if (date >= yesterdayStart) return 'Hier'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function renderAttachment (attachment: MessageAttachment) {
  if (attachment.media_type === 'image') {
    return (
      <a href={attachment.url} target='_blank' rel='noreferrer' className='block overflow-hidden rounded-2xl'>
        <img
          src={attachment.url}
          alt={attachment.file_name || 'Image partagee'}
          className='max-h-[320px] w-full object-cover'
        />
      </a>
    )
  }

  if (attachment.media_type === 'audio') {
    return (
      <div className='rounded-2xl border border-white/10 bg-black/20 p-3'>
        <div className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/50'>
          <Mic className='h-3.5 w-3.5' />
          Message vocal
        </div>
        <audio controls className='w-full'>
          <source src={attachment.url} type={attachment.mime_type || undefined} />
        </audio>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-2xl border border-white/10 bg-black/24'>
      <video controls className='max-h-[360px] w-full bg-black'>
        <source src={attachment.url} type={attachment.mime_type || undefined} />
      </video>
      <div className='flex items-center justify-between px-3 py-2 text-xs text-white/56'>
        <span>{attachment.file_name || 'Video partagee'}</span>
        <span>{formatBytes(attachment.size_bytes)}</span>
      </div>
    </div>
  )
}

function toMessageAttachment (attachment: PendingAttachment): MessageAttachment {
  return {
    url: attachment.url,
    media_type: attachment.mediaType,
    file_name: attachment.fileName,
    mime_type: attachment.mimeType,
    size_bytes: attachment.sizeBytes
  }
}

export default function ConversationPage ({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: session } = useSession()
  const { markResourceAsRead } = useNotifications()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)
  const [reportFeedback, setReportFeedback] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [hasEarlierMessages, setHasEarlierMessages] = useState(false)
  const [loadingEarlierMessages, setLoadingEarlierMessages] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const [threadHeight, setThreadHeight] = useState<number | null>(null)
  const [threadConversations, setThreadConversations] = useState<InboxConversation[]>([])
  const [threadListLoading, setThreadListLoading] = useState(true)
  const messageScrollRef = useRef<null | HTMLDivElement>(null)
  const threadPanelRef = useRef<null | HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messageInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)
  const messagesRef = useRef<Message[]>([])
  const preservedScrollRef = useRef<{ height: number; top: number } | null>(null)
  const refocusComposerAfterSendRef = useRef(false)
  const isAtLatestRef = useRef(true)
  const shouldScrollToLatestRef = useRef(true)
  const desktopConversationListLoadedRef = useRef(false)

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const scrollContainer = messageScrollRef.current
    if (!scrollContainer) return
    isAtLatestRef.current = true
    setShowJumpToLatest(false)
    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior })
  }, [])

  const updateThreadHeight = useCallback(() => {
    const panel = threadPanelRef.current
    if (!panel || typeof window === 'undefined') return
    const viewport = window.visualViewport
    const viewportBottom = viewport
      ? viewport.height + viewport.offsetTop
      : window.innerHeight
    const availableHeight = Math.floor(viewportBottom - panel.getBoundingClientRect().top - 12)
    setThreadHeight(availableHeight > 0 ? availableHeight : null)
  }, [])

  const handleMessageScroll = () => {
    const scrollContainer = messageScrollRef.current
    if (!scrollContainer) return
    const distanceFromLatest = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight
    const atLatest = distanceFromLatest < 96
    isAtLatestRef.current = atLatest
    setShowJumpToLatest(!atLatest)
  }

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (sending || !refocusComposerAfterSendRef.current) return
    refocusComposerAfterSendRef.current = false
    requestAnimationFrame(() => messageInputRef.current?.focus())
  }, [sending])

  useEffect(() => {
    const preservedScroll = preservedScrollRef.current
    const scrollContainer = messageScrollRef.current
    if (preservedScroll && scrollContainer) {
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight - preservedScroll.height + preservedScroll.top
        preservedScrollRef.current = null
      })
      return
    }
    if (shouldScrollToLatestRef.current) {
      shouldScrollToLatestRef.current = false
      requestAnimationFrame(() => scrollToLatest('auto'))
      return
    }
    if (isAtLatestRef.current) {
      requestAnimationFrame(() => scrollToLatest('auto'))
    } else {
      setShowJumpToLatest(true)
    }
  }, [messages, scrollToLatest])

  useEffect(() => {
    updateThreadHeight()
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', updateThreadHeight)
    viewport?.addEventListener('scroll', updateThreadHeight)
    window.addEventListener('resize', updateThreadHeight)
    return () => {
      viewport?.removeEventListener('resize', updateThreadHeight)
      viewport?.removeEventListener('scroll', updateThreadHeight)
      window.removeEventListener('resize', updateThreadHeight)
    }
  }, [updateThreadHeight])

  useEffect(() => {
    updateThreadHeight()
  }, [loading, error, updateThreadHeight])

  useEffect(() => {
    return () => {
      audioStreamRef.current?.getTracks().forEach(track => track.stop())
      mediaRecorderRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchData () {
      if (!session?.user?.id || !id) return

      setLoading(true)
      setError(null)
      try {
        const { messages: fetchedMessages, summary: currentConv } = await getConversationThread(id)
        if (cancelled) return
        shouldScrollToLatestRef.current = true
        isAtLatestRef.current = true
        setShowJumpToLatest(false)
        setMessages(fetchedMessages as Message[])
        setHasEarlierMessages(fetchedMessages.length === 80)
        setLastSyncedAt(new Date())
        if (currentConv) {
          setConversationDetails({
            id: currentConv.id,
            other_user_id: currentConv.other_user_id,
            other_user_name: currentConv.other_user_name,
            other_user_avatar: currentConv.other_user_avatar,
            other_user_online: Boolean(currentConv.other_user_online)
          })
        } else {
          setError('Conversation introuvable ou non autorisée.')
        }

        // Les accusés n'empêchent jamais l'ouverture du fil : ils peuvent être rejoués au prochain passage.
        void Promise.allSettled([markConversationMessagesAsRead(id, session.user.id)])
        void markResourceAsRead(`/messages/${id}`)
      } catch (error) {
        console.error('Failed to fetch conversation data:', error)
        if (error instanceof Error && error.message.includes('Access denied')) {
          setError('Vous n’avez pas accès à cette conversation.')
        } else {
          setError('Une erreur est survenue lors du chargement de la conversation.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, id, markResourceAsRead])

  useEffect(() => {
    let cancelled = false
    if (!session?.user?.id) return
    desktopConversationListLoadedRef.current = false
    setThreadConversations([])
    const authenticatedUserId = session.user.id
    const mediaQuery = window.matchMedia('(min-width: 1280px)')
    const loadDesktopConversationList = () => {
      if (!mediaQuery.matches || desktopConversationListLoadedRef.current) return
      desktopConversationListLoadedRef.current = true
      setThreadListLoading(true)
      void getUserConversations(authenticatedUserId)
        .then(items => {
          if (!cancelled) setThreadConversations((items as InboxConversation[]).map(item => ({ ...item, last_message_date: formatInboxMessageDate(item.last_message_date) })))
        })
        .catch(error => console.error('Failed to load conversation list:', error))
        .finally(() => { if (!cancelled) setThreadListLoading(false) })
    }
    loadDesktopConversationList()
    mediaQuery.addEventListener('change', loadDesktopConversationList)
    return () => {
      cancelled = true
      mediaQuery.removeEventListener('change', loadDesktopConversationList)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id || !id || loading || error || loadingEarlierMessages) return

    const authenticatedUserId = session.user.id
    let cancelled = false
    let inFlight = false

    async function syncNewMessages () {
      if (cancelled || inFlight || document.visibilityState === 'hidden') return

      const currentMessages = messagesRef.current
      const lastMessage = currentMessages[currentMessages.length - 1]
      const afterCursor = lastMessage?.created_at || '1970-01-01T00:00:00.000Z'

      inFlight = true
      setSyncing(true)

      try {
        const freshMessages = await getConversationMessagesAfter(
          id,
          afterCursor,
          authenticatedUserId
        ) as Message[]

        if (cancelled || freshMessages.length === 0) {
          setLastSyncedAt(new Date())
          return
        }

        const existingIds = new Set(messagesRef.current.map(item => item.id))
        const unseenMessages = freshMessages.filter(item => !existingIds.has(item.id))

        if (unseenMessages.length > 0) {
          setMessages(prevMessages => {
            const prevIds = new Set(prevMessages.map(item => item.id))
            return [
              ...prevMessages,
              ...unseenMessages.filter(item => !prevIds.has(item.id))
            ]
          })

          if (unseenMessages.some(item => item.sender_id !== authenticatedUserId)) {
            await markConversationMessagesAsRead(id, authenticatedUserId)
            void markResourceAsRead(`/messages/${id}`)
          }
        }

        setLastSyncedAt(new Date())
      } catch (error) {
        console.error('Failed to sync new messages:', error)
      } finally {
        inFlight = false
        if (!cancelled) setSyncing(false)
      }
    }

    const interval = setInterval(syncNewMessages, 2500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [session?.user?.id, id, loading, error, loadingEarlierMessages, markResourceAsRead])

  const loadEarlierMessages = async () => {
    const oldestMessage = messagesRef.current[0]
    const scrollContainer = messageScrollRef.current
    if (!session?.user?.id || !id || !oldestMessage || loadingEarlierMessages) return

    setLoadingEarlierMessages(true)
    setHistoryError(null)
    if (scrollContainer) {
      preservedScrollRef.current = { height: scrollContainer.scrollHeight, top: scrollContainer.scrollTop }
    }

    try {
      const earlierMessages = await getConversationMessagesBefore(id, oldestMessage.id, session.user.id) as Message[]
      if (earlierMessages.length === 0) {
        setHasEarlierMessages(false)
        preservedScrollRef.current = null
        return
      }

      setMessages(previousMessages => {
        const knownIds = new Set(previousMessages.map(item => item.id))
        return [...earlierMessages.filter(item => !knownIds.has(item.id)), ...previousMessages]
      })
      setHasEarlierMessages(earlierMessages.length === 80)
    } catch (loadError) {
      console.error('Failed to load earlier messages:', loadError)
      preservedScrollRef.current = null
      setHistoryError('Impossible de charger les messages précédents. Réessayez dans un instant.')
    } finally {
      setLoadingEarlierMessages(false)
    }
  }

  const uploadFile = async (file: File): Promise<PendingAttachment> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/messages/attachments', {
      method: 'POST',
      body: formData
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Upload impossible')
    }
    return data.attachment
  }

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setSendError(null)
    setUploading(true)

    try {
      const uploaded: PendingAttachment[] = []
      for (const file of Array.from(files).slice(0, 4 - pendingAttachments.length)) {
        uploaded.push(await uploadFile(file))
      }
      setPendingAttachments(prev => [...prev, ...uploaded].slice(0, 4))
    } catch (error) {
      console.error('Failed to upload message attachment:', error)
      setSendError(memberFacingError(error, 'Le média n’a pas pu être ajouté. Réessayez avec un fichier plus léger.'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const stopAudioRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }

  const startAudioRecording = async () => {
    if (recording) {
      stopAudioRecording()
      return
    }

    if (pendingAttachments.length >= 4) {
      setSendError('Vous pouvez ajouter 4 médias maximum par message.')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSendError('L’enregistrement vocal n’est pas disponible sur ce navigateur.')
      return
    }

    setSendError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      audioStreamRef.current = stream
      audioChunksRef.current = []
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        setRecording(false)
        stream.getTracks().forEach(track => track.stop())
        audioStreamRef.current = null

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        audioChunksRef.current = []
        if (!audioBlob.size) return

        const extension = mimeType.includes('webm') ? 'webm' : 'm4a'
        const audioFile = new File(
          [audioBlob],
          `vocal-${Date.now()}.${extension}`,
          { type: mimeType }
        )

        setUploading(true)
        try {
          const uploaded = await uploadFile(audioFile)
          setPendingAttachments(prev => [...prev, uploaded].slice(0, 4))
        } catch (error) {
          console.error('Failed to upload recorded audio:', error)
          setSendError('Le vocal n’a pas pu être ajouté. Réessayez dans un instant.')
        } finally {
          setUploading(false)
        }
      }

      recorder.start()
      setRecording(true)
    } catch (error) {
      console.error('Failed to start audio recording:', error)
      setRecording(false)
      setSendError('Le micro n’a pas pu être activé. Vérifiez l’autorisation du navigateur.')
    }
  }

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault()
    const currentMessage = message.trim()
    if ((!currentMessage && pendingAttachments.length === 0) || !session?.user?.id || !id || sending || uploading) return

    setSendError(null)
    setSending(true)
    shouldScrollToLatestRef.current = true
    isAtLatestRef.current = true
    setShowJumpToLatest(false)
    const attachmentsToSend = pendingAttachments
    const optimisticMessage: Message = {
      id: `optimistic-${Date.now()}`,
      sender_id: session.user.id,
      content: currentMessage,
      created_at: new Date().toISOString(),
      attachments: attachmentsToSend.map(toMessageAttachment)
    }

    setMessages(prevMessages => [...prevMessages, optimisticMessage])
    setMessage('')
    setPendingAttachments([])

    try {
      const newMessage = await sendMessage({
        conversationId: id,
        senderId: session.user.id,
        content: currentMessage,
        attachments: attachmentsToSend
      })
      if (newMessage.delivery_status === 'blocked') {
        setMessages(prevMessages =>
          prevMessages.filter(msg => msg.id !== optimisticMessage.id)
        )
        setMessage(currentMessage)
        setPendingAttachments(attachmentsToSend)
        setSendError(newMessage.reason || CONTACT_SAFETY_EXPLANATION)
        return
      }
      if (newMessage.delivery_status === 'held') {
        setMessages(prevMessages =>
          prevMessages.filter(msg => msg.id !== optimisticMessage.id)
        )
        setMessage(currentMessage)
        setPendingAttachments(attachmentsToSend)
        setSendError('Ce message n’a pas été remis. Il attend un réexamen humain selon la charte de sécurité communautaire.')
        return
      }
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === optimisticMessage.id ? (newMessage as Message) : msg
        )
      )
      refocusComposerAfterSendRef.current = true
      if (newMessage.moderation_outcome === 'warn') {
        setSendError('Rappel : aucune sollicitation sexuelle contre argent, cadeau, service ou avantage n’est autorisée.')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prevMessages =>
        prevMessages.filter(msg => msg.id !== optimisticMessage.id)
      )
      setMessage(currentMessage)
      setPendingAttachments(attachmentsToSend)
      setSendError(memberFacingError(error, 'Le message n’a pas pu être envoyé. Réessayez dans un instant.'))
    } finally {
      setSending(false)
    }
  }

  const reportSelectedMessage = async (selectedMessage: Message) => {
    if (!session?.user?.id || selectedMessage.sender_id === session.user.id) return
    if (!window.confirm("Transmettre un extrait de ce message à la modération pour une possible sollicitation avec contrepartie ?")) return
    setReportingMessageId(selectedMessage.id)
    setReportFeedback(null)
    try {
      await reportMember({
        targetUserId: selectedMessage.sender_id,
        reason: 'paid_sexual_solicitation',
        conversationId: id,
        messageId: selectedMessage.id
      })
      setReportFeedback('Signalement transmis. Le message sélectionné est référencé pour examen humain.')
    } catch (error) {
      setReportFeedback(memberFacingError(error, 'Le signalement n’a pas pu être transmis. Réessayez dans un instant.'))
    } finally {
      setReportingMessageId(null)
    }
  }

  const currentUserId = session?.user?.id
  const sharedAttachments = messages.flatMap(item => item.attachments || []).slice(-3)
  const canSend = (message.trim().length > 0 || pendingAttachments.length > 0) && !sending && !uploading && !recording
  const conversationStatus = loading
    ? 'Chargement…'
    : error
      ? 'Action requise'
      : syncing
        ? 'Synchronisation…'
        : lastSyncedAt
          ? `Synchronisé à ${lastSyncedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
          : 'Disponible pour échanger'

  return (
    <MainLayout user={session?.user}>
      <div className='p-0 sm:p-3 lg:p-4'>
        <div
          ref={threadPanelRef}
          className='lhr-thread-panel grid min-h-0 overflow-hidden rounded-2xl border border-[#5d3f3f]/45 bg-[#121318] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)] xl:grid-cols-[300px_minmax(0,1fr)_320px]'
          style={threadHeight ? { height: `${threadHeight}px` } : undefined}
        >
          {!loading && !error && <aside className='hidden min-h-0 overflow-hidden border-r border-[#5d3f3f]/35 xl:block'><ConversationList conversations={threadConversations} loading={threadListLoading} activeConversationId={id} /></aside>}
          <section className='flex min-h-0 flex-col bg-[#121318] xl:col-start-2'>
            <div className='sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-[#5d3f3f]/35 bg-[#1a1b21]/95 px-3 py-2.5 backdrop-blur sm:px-5'>
              <div className='flex min-w-0 items-center gap-3'>
                <Link
                  href='/messages'
                  aria-label='Retour à la liste des messages'
                  className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#5d3f3f]/50 bg-[#1e1f25] text-[#e3e1e9] transition-colors hover:bg-[#34343a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff525d]'
                >
                  <ArrowLeft className='h-5 w-5' aria-hidden='true' />
                </Link>
                <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#34343a] ring-2 ring-[#ff525d]/35'>
                  <Image
                    src={conversationDetails?.other_user_avatar || '/default-member-couple.jpg'}
                    alt={conversationDetails?.other_user_name || 'Profil'}
                    fill
                    className='object-cover'
                    sizes='48px'
                  />
                  {conversationDetails?.other_user_online && (
                    <span className='absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1a1b21] bg-[#35e48d]' title='En ligne' aria-label='En ligne' />
                  )}
                </div>
                <div className='min-w-0'>
                  <h2 className='truncate text-base font-bold text-[#e3e1e9]'>
                    {conversationDetails?.other_user_name || 'Conversation'}
                  </h2>
                  <p className='flex items-center gap-1.5 text-xs text-[#ffb3ac]'>
                    <span className={conversationDetails?.other_user_online ? 'h-1.5 w-1.5 rounded-full bg-[#35e48d]' : 'h-1.5 w-1.5 rounded-full bg-[#ad8887]'} />
                    {conversationStatus}
                  </p>
                </div>
              </div>
              {conversationDetails?.other_user_id && <Link href={`/profile/${conversationDetails.other_user_id}`} aria-label={`Voir le profil de ${conversationDetails.other_user_name}`} className='rounded-lg p-2 text-[#ad8887] transition-colors hover:bg-[#34343a] hover:text-[#e3e1e9]'><UserRound className='h-5 w-5' /></Link>}
            </div>

            {loading && (
              <div className='flex flex-1 items-center justify-center p-6' aria-label='Chargement de la conversation'>
                <div className='w-full max-w-2xl space-y-4 animate-pulse'>
                  <div className='h-16 w-3/5 rounded-3xl rounded-bl-md bg-white/[0.08]' />
                  <div className='ml-auto h-20 w-2/5 rounded-3xl rounded-br-md bg-[#ff3b8b]/20' />
                  <div className='h-14 w-1/2 rounded-3xl rounded-bl-md bg-white/[0.08]' />
                </div>
              </div>
            )}

            {!loading && error && (
              <div className='flex flex-1 items-center justify-center p-8'>
                <div className='max-w-md rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-center text-red-100'>
                  {error}
                </div>
              </div>
            )}

            {!loading && !error && (
              <>
                <div className='relative min-h-0 flex-1'>
                <div
                  ref={messageScrollRef}
                  onScroll={handleMessageScroll}
                  role='log'
                  aria-live='polite'
                  aria-relevant='additions'
                  aria-label='Historique des messages'
                  className='h-full overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#121318_0%,#0d0e13_100%)] p-3 sm:p-6'
                >
                  {messages.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-center'>
                      <div>
                        <h3 className='text-xl font-black'>Premier message</h3>
                        <p className='mt-2 max-w-sm text-sm leading-6 text-white/56'>
                          Lancez l’échange avec un mot, une photo d’ambiance ou un vocal court.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className='mx-auto flex max-w-3xl flex-col gap-4'>
                      {hasEarlierMessages && (
                        <div className='flex flex-col items-center gap-2 pb-2'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={loadEarlierMessages}
                            disabled={loadingEarlierMessages}
                            className='border-white/12 bg-white/[0.05] text-white hover:bg-white/10'
                          >
                            <ChevronUp className='mr-2 h-4 w-4' />
                            {loadingEarlierMessages ? 'Chargement…' : 'Afficher les messages précédents'}
                          </Button>
                          <p className='text-xs text-white/42'>Les messages déjà lus restent à leur position.</p>
                        </div>
                      )}
                      {historyError && (
                        <p role='status' className='rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-center text-sm text-red-100'>
                          {historyError}
                        </p>
                      )}
                      {messages.map((msg, index) => {
                        const mine = msg.sender_id === currentUserId
                        const attachments = msg.attachments || []
                        const showDay = index === 0 || messageDayLabel(messages[index - 1].created_at) !== messageDayLabel(msg.created_at)
                        return (
                          <div key={msg.id} className='contents'>
                            {showDay && (
                              <div className='my-3 flex items-center gap-3 text-xs font-bold text-white/42'>
                                <span className='h-px flex-1 bg-white/10' />
                                <time dateTime={msg.created_at}>{messageDayLabel(msg.created_at)}</time>
                                <span className='h-px flex-1 bg-white/10' />
                              </div>
                            )}
                            <div className={mine ? 'flex items-start justify-end gap-3' : 'flex items-start justify-start gap-3'}>
                              <div className={mine ? 'hidden sm:block w-8 shrink-0' : 'hidden sm:block relative mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-[#ad8887]/30'}>
                                {!mine && <Image src={msg.sender_avatar || conversationDetails?.other_user_avatar || '/default-member-couple.jpg'} alt='' fill sizes='32px' className='object-cover' />}
                              </div>
                              <div
                                className={[
                                  'max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-6 shadow-md sm:max-w-[70%]',
                                  mine
                                    ? 'rounded-tr-sm border border-[#ff334b]/30 bg-gradient-to-r from-[#cd021b] to-[#ff334b] text-white shadow-[#ff334b]/15'
                                    : 'rounded-tl-sm border border-[#5d3f3f]/35 bg-[#292a2f] text-[#e3e1e9] shadow-black/20'
                                ].join(' ')}
                              >
                              {attachments.length > 0 && (
                                <div className='mb-3 space-y-2'>
                                  {attachments.map((attachment, attachmentIndex) => (
                                    <div key={attachment.id || `${attachment.url}-${attachmentIndex}`}>
                                      {renderAttachment(attachment)}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {msg.content && <div className='break-words'>{msg.content}</div>}
                              {!mine && (
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='sm'
                                  disabled={reportingMessageId === msg.id}
                                  onClick={() => reportSelectedMessage(msg)}
                                  className='mt-2 h-auto px-0 py-0 text-xs text-white/70 hover:bg-transparent hover:text-white'
                                >
                                  <Flag className='mr-1 h-3 w-3' />
                                  {reportingMessageId === msg.id ? 'Signalement…' : 'Signaler une sollicitation'}
                                </Button>
                              )}
                              <div className={mine ? 'mt-1 flex items-center justify-end gap-1 text-xs text-white/75' : 'mt-1 flex items-center justify-end gap-1 text-xs text-[#ad8887]'}>
                                <Clock3 className='h-3 w-3' aria-hidden='true' />
                                <time dateTime={msg.created_at}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                              </div>
                            </div>
                          </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {showJumpToLatest && (
                  <Button
                    type='button'
                    size='sm'
                    onClick={() => scrollToLatest()}
                    className='absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#ff334b] px-4 text-white shadow-lg shadow-black/35 hover:bg-[#cc001a]'
                    aria-label='Aller aux derniers messages'
                  >
                    <ChevronUp className='mr-2 h-4 w-4 rotate-180' aria-hidden='true' />
                    Derniers messages
                  </Button>
                )}
                </div>

                <div className='border-t border-[#5d3f3f]/35 bg-[#1a1b21]/95 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur sm:p-4'>
                  {sendError && (
                    <p className='mb-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100'>
                      {sendError}
                    </p>
                  )}
                  {reportFeedback && (
                    <p role='status' className='mb-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/82'>
                      {reportFeedback}
                    </p>
                  )}
                  {pendingAttachments.length > 0 && (
                    <div className='mb-3 flex flex-wrap gap-2'>
                      {pendingAttachments.map((attachment, index) => (
                        <div key={`${attachment.url}-${index}`} className='flex items-center gap-2 rounded-full border border-[#5d3f3f]/40 bg-[#292a2f] px-3 py-2 text-xs text-[#e3e1e9]'>
                          {attachment.mediaType === 'image' && <ImageIcon className='h-3.5 w-3.5 text-[#ff525d]' />}
                          {attachment.mediaType === 'audio' && <Mic className='h-3.5 w-3.5 text-emerald-400' />}
                          {attachment.mediaType === 'video' && <Video className='h-3.5 w-3.5 text-[#ffd166]' />}
                          <span className='max-w-[160px] truncate'>{attachment.fileName}</span>
                          <button
                            type='button'
                            onClick={() => setPendingAttachments(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
                            className='rounded-full p-0.5 text-white/54 hover:bg-white/10 hover:text-white'
                            aria-label='Retirer le media'
                          >
                            <X className='h-3.5 w-3.5' />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className='grid grid-cols-[auto_auto_1fr] items-center gap-2 sm:flex'>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/*,audio/*,video/*'
                      multiple
                      className='hidden'
                      onChange={event => uploadFiles(event.target.files)}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => fileInputRef.current?.click()}
                      className='h-12 shrink-0 rounded-xl border border-[#5d3f3f]/45 bg-[#1e1f25] px-3 text-[#ad8887] hover:bg-[#34343a] hover:text-[#e3e1e9]'
                      disabled={uploading || sending || recording || pendingAttachments.length >= 4}
                      aria-label='Ajouter une pièce jointe'
                    >
                      <Paperclip className='h-4 w-4' />
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={startAudioRecording}
                      className={[
                        'h-12 shrink-0 rounded-xl border border-[#5d3f3f]/45 px-3',
                        recording
                          ? 'bg-[#ff334b]/20 text-[#ffb3ac]'
                          : 'bg-transparent text-[#ad8887] hover:bg-[#34343a] hover:text-[#e3e1e9]'
                      ].join(' ')}
                      disabled={uploading || sending || pendingAttachments.length >= 4}
                      aria-label={recording ? 'Arrêter le vocal' : 'Enregistrer un vocal'}
                    >
                      {recording ? <Square className='h-4 w-4' /> : <Mic className='h-4 w-4' />}
                    </Button>
                    <Input
                      ref={messageInputRef}
                      value={message}
                      onChange={event => setMessage(event.target.value)}
                      placeholder={recording ? 'Vocal en cours...' : uploading ? 'Ajout du média...' : sending ? 'Envoi en cours...' : 'Écrire un message...'}
                      className='col-span-3 row-start-1 h-12 w-full min-w-0 flex-1 rounded-xl border-[#5d3f3f]/45 bg-[#1e1f25] px-3 text-[#e3e1e9] placeholder:text-[#ad8887] focus:border-[#ff525d]'
                      disabled={sending || recording}
                    />
                    <Button
                      type='submit' aria-label='Envoyer le message'
                      className='h-12 shrink-0 justify-self-end rounded-xl bg-[#ff334b] px-3 text-white shadow-[0_0_16px_rgba(255,51,75,0.35)] hover:bg-[#cc001a] sm:px-4'
                      disabled={!canSend}
                    >
                      <Send className='h-4 w-4 sm:mr-2' />
                      <span className='hidden sm:inline'>Envoyer</span>
                    </Button>
                  </form>
                </div>
              </>
            )}
          </section>

          {!loading && !error && <aside className='hidden min-h-0 overflow-y-auto border-l border-[#5d3f3f]/35 bg-[#1a1b21] xl:col-start-3 xl:block'>
            <div className='border-b border-[#5d3f3f]/35 p-5 text-center'>
              <div className='relative mx-auto h-20 w-20 overflow-hidden rounded-full bg-[#34343a] ring-2 ring-[#ff525d] ring-offset-2 ring-offset-[#1a1b21]'>
                <Image
                  src={conversationDetails?.other_user_avatar || '/default-member-couple.jpg'}
                  alt={conversationDetails?.other_user_name || 'Profil du membre'}
                  fill
                  sizes='80px'
                  className='object-cover'
                />
                {conversationDetails?.other_user_online && <span className='absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#1a1b21] bg-[#35e48d]' />}
              </div>
              <h3 className='mt-4 text-lg font-bold text-[#e3e1e9]'>{conversationDetails?.other_user_name || 'Membre du Cercle'}</h3>
              <p className='mt-1 text-xs text-[#ffb3ac]'>Membre du Cercle privé</p>
              <div className='mt-4 grid grid-cols-2 gap-2'>
                <Link href={`/profile/${conversationDetails?.other_user_id || ''}`} className='flex flex-col items-center gap-1 rounded-xl border border-[#5d3f3f]/35 bg-[#1e1f25] p-2.5 text-[11px] text-[#e3e1e9] transition-colors hover:bg-[#34343a]'>
                  <UserRound className='h-4 w-4 text-[#ff525d]' /> Profil
                </Link>
                <Link href='/community-safety' className='flex flex-col items-center gap-1 rounded-xl border border-[#5d3f3f]/35 bg-[#1e1f25] p-2.5 text-[11px] text-[#e3e1e9] transition-colors hover:bg-[#34343a]'>
                  <ShieldCheck className='h-4 w-4 text-emerald-400' /> Conseils de sécurité
                </Link>
              </div>
            </div>

            <div className='border-b border-[#5d3f3f]/35 p-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold text-[#e3e1e9]'>Médias partagés</h3>
                <span className='text-xs text-[#ad8887]'>Chargés dans ce fil</span>
              </div>
              {sharedAttachments.length > 0 ? <div className='mt-3 grid grid-cols-3 gap-2'>{sharedAttachments.map((attachment, index) => attachment.media_type === 'image' ? <a key={attachment.id || `${attachment.url}-${index}`} href={attachment.url} target='_blank' rel='noreferrer' className='relative aspect-square overflow-hidden rounded-xl border border-[#5d3f3f]/35'><img src={attachment.url} alt={attachment.file_name || 'Média partagé'} className='h-full w-full object-cover' /></a> : <div key={attachment.id || `${attachment.url}-${index}`} className='flex aspect-square items-center justify-center rounded-xl border border-[#5d3f3f]/35 bg-[#292a2f] text-[#ad8887]'>{attachment.media_type === 'audio' ? <Mic className='h-5 w-5' /> : <Video className='h-5 w-5' />}</div>)}</div> : <div className='mt-3 flex items-center gap-2 rounded-xl border border-[#5d3f3f]/35 bg-[#1e1f25] p-3 text-xs text-[#ad8887]'><Images className='h-4 w-4' /> Aucun média chargé</div>}
            </div>

            <div className='p-4'>
              <p className='text-[11px] font-bold uppercase tracking-wider text-[#ad8887]'>Confidentialité & sécurité</p>
              <div className='mt-3 space-y-2'>
                <div className='flex items-center justify-between rounded-xl border border-[#5d3f3f]/35 bg-[#1e1f25] p-3 text-xs'>
                  <span className='flex items-center gap-2 text-[#e3e1e9]'><ShieldCheck className='h-4 w-4 text-emerald-400' /> Échange privé</span>
                  <span className='font-semibold text-emerald-400'>Actif</span>
                </div>
                <div className='flex items-center justify-between rounded-xl border border-[#5d3f3f]/35 bg-[#1e1f25] p-3 text-xs'>
                  <span className='flex items-center gap-2 text-[#e3e1e9]'><LockKeyhole className='h-4 w-4 text-[#ff525d]' /> Messages</span>
                  <span className='text-[#ad8887]'>{messages.length} chargés</span>
                </div>
              </div>
            </div>
          </aside>}
        </div>
      </div>
    </MainLayout>
  )
}
