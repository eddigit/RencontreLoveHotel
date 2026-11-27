'use client'

import type React from 'react'
import { use, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronUp,
  Clock3,
  Flag,
  ImageIcon,
  Mic,
  Paperclip,
  Send,
  ShieldCheck,
  Square,
  Video,
  X
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import { getConversationThread } from '@/actions/conversation-thread'
import MainLayout from '@/components/layout/main-layout'
import {
  getConversationMessagesAfter,
  getConversationMessagesBefore,
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
  const messagesEndRef = useRef<null | HTMLDivElement>(null)
  const messageScrollRef = useRef<null | HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messageInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)
  const messagesRef = useRef<Message[]>([])
  const preservedScrollRef = useRef<{ height: number; top: number } | null>(null)
  const refocusComposerAfterSendRef = useRef(false)

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        setMessages(fetchedMessages as Message[])
        setHasEarlierMessages(fetchedMessages.length === 80)
        setLastSyncedAt(new Date())
        if (currentConv) {
          setConversationDetails({
            id: currentConv.id,
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
      <LhrV2Shell
        user={session?.user}
        eyebrow='Conversation privée'
        title={conversationDetails?.other_user_name || 'Messages'}
        subtitle='Un espace privé pour échanger à votre rythme.'
        action={
          <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
            <Link href='/messages'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Retour
            </Link>
          </Button>
        }
      >
        <div className='grid min-h-[calc(100dvh-14rem)] overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(0,0,0,0.24))] shadow-2xl shadow-black/20 lg:grid-cols-[minmax(0,1fr)_300px]'>
          <section className='flex min-h-[620px] flex-col'>
            <div className='sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#1c0b2a]/95 p-3 backdrop-blur sm:p-4'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10'>
                  <Image
                    src={conversationDetails?.other_user_avatar || '/default-member-couple.jpg'}
                    alt={conversationDetails?.other_user_name || 'Profil'}
                    fill
                    className='object-cover'
                    sizes='48px'
                  />
                  {conversationDetails?.other_user_online && (
                    <span className='absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#170321] bg-[#35e48d]' title='En ligne' aria-label='En ligne' />
                  )}
                </div>
                <div className='min-w-0'>
                  <h2 className='truncate font-black'>
                    {conversationDetails?.other_user_name || 'Conversation'}
                  </h2>
                  <p className='flex items-center gap-1.5 text-xs text-[#94ffc9]'>
                    <span className={conversationDetails?.other_user_online ? 'h-1.5 w-1.5 rounded-full bg-[#35e48d]' : 'h-1.5 w-1.5 rounded-full bg-white/35'} />
                    {conversationStatus}
                  </p>
                </div>
              </div>
              <div className='hidden items-center gap-2 text-xs font-bold text-white/50 sm:flex'>
                <ImageIcon className='h-4 w-4' />
                <Mic className='h-4 w-4' />
                <Video className='h-4 w-4' />
              </div>
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
                <div ref={messageScrollRef} className='flex-1 overflow-y-auto bg-[radial-gradient(circle_at_20%_10%,rgba(255,59,139,0.14),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(148,255,201,0.08),transparent_24%)] p-4 sm:p-6'>
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
                    <div className='mx-auto flex max-w-3xl flex-col gap-3'>
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
                            <div className={mine ? 'flex justify-end' : 'flex justify-start'}>
                              <div
                                className={[
                                  'max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-lg sm:max-w-[70%]',
                                  mine
                                    ? 'rounded-br-md bg-[#ff4fa3] text-white shadow-[#ff4fa3]/10'
                                    : 'rounded-bl-md border border-white/10 bg-white/10 text-white shadow-black/10'
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
                              <div className={mine ? 'mt-1 flex items-center justify-end gap-1 text-xs text-white/72' : 'mt-1 flex items-center justify-end gap-1 text-xs text-white/42'}>
                                <Clock3 className='h-3 w-3' aria-hidden='true' />
                                <time dateTime={msg.created_at}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                              </div>
                            </div>
                          </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className='border-t border-white/10 bg-[#16051f]/92 p-3 backdrop-blur sm:p-4'>
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
                        <div key={`${attachment.url}-${index}`} className='flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/72'>
                          {attachment.mediaType === 'image' && <ImageIcon className='h-3.5 w-3.5 text-[#ff8cc8]' />}
                          {attachment.mediaType === 'audio' && <Mic className='h-3.5 w-3.5 text-[#94ffc9]' />}
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
                      className='h-12 shrink-0 rounded-2xl border-white/12 bg-white/[0.04] px-4'
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
                        'h-12 shrink-0 rounded-2xl border-white/12 px-4',
                        recording
                          ? 'bg-[#ff3b8b]/24 text-[#ffb4d8]'
                          : 'bg-white/[0.04]'
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
                      className='col-span-3 row-start-1 h-12 w-full min-w-0 flex-1 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/38 focus:border-[#ff62a8]'
                      disabled={sending || recording}
                    />
                    <Button
                      type='submit' aria-label='Envoyer le message'
                      className='h-12 shrink-0 justify-self-end rounded-2xl bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] px-3 text-white hover:opacity-90 sm:px-5'
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

          <aside className='hidden p-5 lg:block'>
            <div className='rounded-2xl border border-[#94ffc9]/20 bg-[#94ffc9]/[0.055] p-5'>
              <ShieldCheck className='h-6 w-6 text-[#94ffc9]' />
              <h3 className='mt-3 font-black'>Échange privé</h3>
              <p className='mt-3 text-sm leading-6 text-white/62'>
                Prenez votre temps. Gardez vos échanges et vos médias dans la messagerie du site.
              </p>
              <Link href='/community-safety' className='mt-4 inline-flex text-sm font-bold text-[#94ffc9] hover:text-white'>Conseils de sécurité</Link>
            </div>

            <div className='mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='font-black'>Messagerie</h3>
              <dl className='mt-4 space-y-3 text-sm'>
                <div className='flex justify-between border-b border-white/8 pb-3'>
                  <dt className='text-white/58'>Messages</dt>
                  <dd className='font-bold'>{messages.length}</dd>
                </div>
                <div className='flex justify-between border-b border-white/8 pb-3'>
                  <dt className='text-white/58'>Médias</dt>
                  <dd className='font-bold'>images · audio · vidéo</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-white/58'>Envoi</dt>
                  <dd className='font-bold'>{uploading ? 'upload' : sending ? 'en cours' : 'prêt'}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </LhrV2Shell>
    </MainLayout>
  )
}
