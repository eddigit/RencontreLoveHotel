'use client'

import type React from 'react'
import { use, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarHeart,
  Check,
  ImageIcon,
  Mic,
  Paperclip,
  Pencil,
  Send,
  Sparkles,
  Square,
  Trash2,
  Video,
  X
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import {
  getConversationMessagesAfter,
  getConversationMessages,
  getUserConversations,
  markConversationMessagesAsRead,
  sendMessage,
  updateOwnMessage,
  deleteOwnMessage
} from '@/actions/conversation-actions'
import { useNotifications } from '@/contexts/notification-context'
import { MemberSafetyControls, type MemberSafetyState } from '@/components/member-safety-controls'
import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'

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
  updated_at?: string
  edited_at?: string | null
  deleted_at?: string | null
  sender_name?: string
  sender_avatar?: string
  attachments?: MessageAttachment[]
}

interface ConversationDetails {
  id: string
  other_user_id: string
  other_user_name: string
  other_user_avatar: string | null
  access_mode: 'match' | 'legacy_import' | 'admin'
  blocked_by_me: boolean
  blocked_me: boolean
  can_interact: boolean
}

function formatBytes (bytes?: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
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
  const { notifications, markAsRead } = useNotifications()
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageContent, setEditingMessageContent] = useState('')
  const [messageActionId, setMessageActionId] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const messagesEndRef = useRef<null | HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)
  const messagesRef = useRef<Message[]>([])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    for (const notification of notifications) {
      if (
        !notification.read &&
        notification.type === 'new_message' &&
        notification.link === `/messages/${id}`
      ) {
        markAsRead(notification.id)
      }
    }
  }, [id, notifications, markAsRead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      audioStreamRef.current?.getTracks().forEach(track => track.stop())
      mediaRecorderRef.current = null
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!session?.user?.id || !id) return

    setLoading(true)
    setError(null)
    try {
      const fetchedMessages = await getConversationMessages(id, session.user.id)
      setMessages(fetchedMessages as Message[])
      await markConversationMessagesAsRead(id, session.user.id)
      setLastSyncedAt(new Date())

      const userConversations = await getUserConversations(session.user.id)
      const currentConv = userConversations.find((conv: any) => conv.id === id)
      if (currentConv) {
        setConversationDetails({
          id: currentConv.id,
          other_user_id: currentConv.other_user_id,
          other_user_name: currentConv.other_user_name,
          other_user_avatar: currentConv.other_user_avatar,
          access_mode: currentConv.access_mode || 'match',
          blocked_by_me: currentConv.blocked_by_me === true,
          blocked_me: currentConv.blocked_me === true,
          can_interact: currentConv.can_interact !== false
        })
      } else {
        setError('Conversation introuvable ou non autorisée.')
      }
    } catch (error) {
      if (recoverFromStaleServerAction(error)) return
      console.error('Failed to fetch conversation data:', error)
      if (error instanceof Error && error.message.includes('Access denied')) {
        setError('Vous n’avez pas accès à cette conversation.')
      } else {
        setError('Une erreur est survenue lors du chargement de la conversation.')
      }
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, id])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!session?.user?.id || !id || loading || error) return

    const authenticatedUserId = session.user.id
    let cancelled = false
    let inFlight = false

    async function syncNewMessages () {
      if (cancelled || inFlight || document.visibilityState === 'hidden') return

      const latestKnownTimestamp = messagesRef.current.reduce((latest, item) => {
        const createdAt = new Date(item.created_at).getTime()
        const updatedAt = item.updated_at ? new Date(item.updated_at).getTime() : createdAt
        return Math.max(latest, createdAt, updatedAt)
      }, 0)
      const afterCursor = new Date(Math.max(0, latestKnownTimestamp - 5000)).toISOString()

      inFlight = true
      setSyncing(true)

      try {
        const freshMessages = await getConversationMessagesAfter(
          id,
          afterCursor,
          authenticatedUserId
        ) as Message[]

        const syncedAt = new Date()

        if (cancelled || freshMessages.length === 0) {
          setLastSyncedAt(syncedAt)
          return
        }

        setMessages(prevMessages => {
          const freshById = new Map(freshMessages.map(item => [item.id, item]))
          const prevIds = new Set(prevMessages.map(item => item.id))
          return [
            ...prevMessages.map(item => freshById.get(item.id) || item),
            ...freshMessages.filter(item => !prevIds.has(item.id))
          ]
        })

        if (freshMessages.some(item => item.sender_id !== authenticatedUserId)) {
          await markConversationMessagesAsRead(id, authenticatedUserId)
        }

        setLastSyncedAt(syncedAt)
      } catch (error) {
        if (recoverFromStaleServerAction(error)) return
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
  }, [session?.user?.id, id, loading, error])

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
      setSendError(
        error instanceof Error && error.message.includes('coordonnées')
          ? 'Pour votre sécurité, les coordonnées et moyens de contact externes ne peuvent pas être partagés.'
          : 'Le média n’a pas pu être ajouté. Réessayez avec un fichier plus léger.'
      )
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
    if (!conversationDetails?.can_interact || (!currentMessage && pendingAttachments.length === 0) || !session?.user?.id || !id || sending || uploading) return

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
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === optimisticMessage.id ? (newMessage as Message) : msg
        )
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prevMessages =>
        prevMessages.filter(msg => msg.id !== optimisticMessage.id)
      )
      setMessage(currentMessage)
      setPendingAttachments(attachmentsToSend)
      if (recoverFromStaleServerAction(error)) return
      setSendError('Le message n’a pas pu être envoyé. Réessayez dans un instant.')
    } finally {
      setSending(false)
    }
  }

  const startEditingMessage = (item: Message) => {
    setEditingMessageId(item.id)
    setEditingMessageContent(item.content)
    setSendError(null)
  }

  const cancelEditingMessage = () => {
    setEditingMessageId(null)
    setEditingMessageContent('')
  }

  const saveEditedMessage = async () => {
    if (!editingMessageId || !editingMessageContent.trim()) return

    setMessageActionId(editingMessageId)
    setSendError(null)
    try {
      const updated = await updateOwnMessage({
        messageId: editingMessageId,
        conversationId: id,
        content: editingMessageContent
      }) as Message
      setMessages(current => current.map(item =>
        item.id === editingMessageId ? { ...item, ...updated } : item
      ))
      cancelEditingMessage()
    } catch (error) {
      if (recoverFromStaleServerAction(error)) return
      setSendError(error instanceof Error ? error.message : 'Modification impossible.')
    } finally {
      setMessageActionId(null)
    }
  }

  const removeMessage = async (messageId: string) => {
    if (!window.confirm('Supprimer ce message ? Cette action ne peut pas être annulée.')) return

    setMessageActionId(messageId)
    setSendError(null)
    try {
      const deleted = await deleteOwnMessage({
        messageId,
        conversationId: id
      }) as Message
      setMessages(current => current.map(item =>
        item.id === messageId ? { ...item, ...deleted, attachments: [] } : item
      ))
      if (editingMessageId === messageId) cancelEditingMessage()
    } catch (error) {
      if (recoverFromStaleServerAction(error)) return
      setSendError(error instanceof Error ? error.message : 'Suppression impossible.')
    } finally {
      setMessageActionId(null)
    }
  }

  const currentUserId = session?.user?.id
  const canSend = Boolean(conversationDetails?.can_interact) && (message.trim().length > 0 || pendingAttachments.length > 0) && !sending && !uploading && !recording

  const handleInteractionChange = (state: MemberSafetyState) => {
    if (state.canInteract) {
      void fetchData()
      return
    }

    setConversationDetails(current => current ? {
      ...current,
      blocked_by_me: state.blockedByMe,
      blocked_me: state.blockedMe,
      can_interact: false
    } : current)
  }

  return (
    <MainLayout user={session?.user}>
      <LhrV2Shell
        user={session?.user}
        eyebrow={conversationDetails?.access_mode === 'admin' ? 'Support Love Hotel' : 'Conversation privée'}
        title={conversationDetails?.other_user_name || 'Messages'}
        subtitle='Un espace privé pour échanger avec clarté, texte, images, vocaux et vidéos.'
        action={
          <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
            <Link href='/messages'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Retour
            </Link>
          </Button>
        }
      >
        <div className='grid min-h-[720px] overflow-hidden rounded-2xl border border-white/10 bg-black/16 lg:grid-cols-[minmax(0,1fr)_330px]'>
          <section className='flex min-h-[680px] flex-col'>
            <div className='flex items-center justify-between gap-3 border-b border-white/10 p-4'>
              {conversationDetails && conversationDetails.access_mode !== 'admin' ? (
                <Link href={`/profile/${conversationDetails.other_user_id}`} className='flex min-w-0 items-center gap-3 rounded-xl p-1 transition hover:bg-white/[0.05]'>
                  <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10'>
                    <Image src={conversationDetails.other_user_avatar || '/purple-haze-chat.png'} alt={conversationDetails.other_user_name || 'Profil'} fill className='object-cover' sizes='48px' />
                  </div>
                  <div className='min-w-0'>
                    <h2 className='truncate font-black hover:text-[#ffb3d7]'>{conversationDetails.other_user_name}</h2>
                    <p className='text-xs text-[#94ffc9]'>Voir le profil</p>
                  </div>
                </Link>
              ) : (
                <div className='flex min-w-0 items-center gap-3'>
                  <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10'>
                    <Image src={conversationDetails?.other_user_avatar || '/purple-haze-chat.png'} alt={conversationDetails?.other_user_name || 'Profil'} fill className='object-cover' sizes='48px' />
                  </div>
                  <div className='min-w-0'>
                    <h2 className='truncate font-black'>{conversationDetails?.other_user_name || 'Conversation'}</h2>
                    <p className='text-xs text-[#94ffc9]'>
                    {loading
                      ? 'Chargement...'
                      : error
                        ? 'Action requise'
                        : syncing
                          ? 'Synchronisation...'
                          : lastSyncedAt
                            ? conversationDetails?.access_mode === 'admin'
                              ? 'Réponse de l’équipe disponible'
                              : 'Synchronisé'
                            : 'Disponible pour échanger'}
                    </p>
                  </div>
                </div>
              )}
              {conversationDetails && conversationDetails.access_mode !== 'admin' && (
                <MemberSafetyControls
                  memberId={conversationDetails.other_user_id}
                  memberName={conversationDetails.other_user_name}
                  initialState={{
                    blockedByMe: conversationDetails.blocked_by_me,
                    blockedMe: conversationDetails.blocked_me,
                    canInteract: conversationDetails.can_interact
                  }}
                  compact
                  onInteractionChange={handleInteractionChange}
                />
              )}
            </div>

            {loading && (
              <div className='flex flex-1 items-center justify-center p-8 text-white/62'>
                Chargement de la conversation...
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
                <div className='flex-1 overflow-y-auto bg-[radial-gradient(circle_at_20%_10%,rgba(255,59,139,0.14),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(148,255,201,0.08),transparent_24%)] p-4 sm:p-6'>
                  {messages.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-center'>
                      <div>
                        <h3 className='text-xl font-black'>Commencer la conversation</h3>
                        <p className='mt-2 max-w-sm text-sm leading-6 text-white/56'>
                          Écrivez un premier mot, partagez une image ou envoyez un vocal court.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className='mx-auto flex max-w-3xl flex-col gap-3'>
                      {messages.map(msg => {
                        const mine = msg.sender_id === currentUserId
                        const attachments = msg.attachments || []
                        return (
                          <div
                            key={msg.id}
                            className={mine ? 'flex justify-end' : 'flex justify-start'}
                          >
                            <div
                              className={[
                                'max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-lg sm:max-w-[70%]',
                                mine
                                  ? 'rounded-br-md bg-[#ff4fa3] text-white shadow-[#ff4fa3]/10'
                                  : 'rounded-bl-md border border-white/10 bg-white/10 text-white shadow-black/10'
                              ].join(' ')}
                            >
                              {!msg.deleted_at && attachments.length > 0 && (
                                <div className='mb-3 space-y-2'>
                                  {attachments.map((attachment, index) => (
                                    <div key={attachment.id || `${attachment.url}-${index}`}>
                                      {renderAttachment(attachment)}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {editingMessageId === msg.id ? (
                                <div className='space-y-2'>
                                  <textarea
                                    value={editingMessageContent}
                                    onChange={event => setEditingMessageContent(event.target.value.slice(0, 1000))}
                                    rows={3}
                                    autoFocus
                                    className='w-full resize-y rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/50'
                                    aria-label='Modifier le message'
                                  />
                                  <div className='flex justify-end gap-2'>
                                    <button type='button' onClick={cancelEditingMessage} className='rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white' aria-label='Annuler la modification'>
                                      <X className='h-4 w-4' />
                                    </button>
                                    <button type='button' onClick={saveEditedMessage} disabled={!editingMessageContent.trim() || messageActionId === msg.id} className='rounded-full p-1.5 text-white hover:bg-white/15 disabled:opacity-40' aria-label='Enregistrer le message'>
                                      <Check className='h-4 w-4' />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                msg.content && (
                                  <div className={msg.deleted_at ? 'break-words italic text-white/62' : 'break-words'}>
                                    {msg.content}
                                  </div>
                                )
                              )}
                              <div className='mt-1 flex items-center justify-end gap-2'>
                                {msg.edited_at && !msg.deleted_at && <span className='text-[11px] text-white/55'>modifié</span>}
                                <span className={mine ? 'text-xs text-white/72' : 'text-xs text-white/42'}>
                                  {new Date(msg.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {mine && !msg.deleted_at && editingMessageId !== msg.id && !msg.id.startsWith('optimistic-') && (
                                  <span className='flex items-center gap-0.5'>
                                    {msg.content && (
                                      <button type='button' onClick={() => startEditingMessage(msg)} className='rounded-full p-1 text-white/65 hover:bg-white/15 hover:text-white' aria-label='Modifier le message'>
                                        <Pencil className='h-3.5 w-3.5' />
                                      </button>
                                    )}
                                    <button type='button' onClick={() => removeMessage(msg.id)} disabled={messageActionId === msg.id} className='rounded-full p-1 text-white/65 hover:bg-white/15 hover:text-white disabled:opacity-40' aria-label='Supprimer le message'>
                                      <Trash2 className='h-3.5 w-3.5' />
                                    </button>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className='border-t border-white/10 bg-black/20 p-4'>
                  {!conversationDetails?.can_interact && (
                    <div className='mb-3 rounded-2xl border border-[#ffd166]/25 bg-[#ffd166]/10 px-4 py-3'>
                      <p className='font-black text-[#ffe09a]'>Conversation en lecture seule</p>
                      <p className='mt-1 text-xs text-white/58'>L’historique reste disponible, mais aucun nouveau message ou média ne peut être envoyé.</p>
                    </div>
                  )}
                  {sendError && (
                    <p className='mb-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100'>
                      {sendError}
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
                  <form onSubmit={handleSendMessage} className='flex items-center gap-2'>
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
                      className='h-12 rounded-2xl border-white/12 bg-white/[0.04] px-4'
                      disabled={!conversationDetails?.can_interact || uploading || sending || recording || pendingAttachments.length >= 4}
                    >
                      <Paperclip className='h-4 w-4' />
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={startAudioRecording}
                      className={[
                        'h-12 rounded-2xl border-white/12 px-4',
                        recording
                          ? 'bg-[#ff3b8b]/24 text-[#ffb4d8]'
                          : 'bg-white/[0.04]'
                      ].join(' ')}
                      disabled={!conversationDetails?.can_interact || uploading || sending || pendingAttachments.length >= 4}
                      aria-label={recording ? 'Arrêter le vocal' : 'Enregistrer un vocal'}
                    >
                      {recording ? <Square className='h-4 w-4' /> : <Mic className='h-4 w-4' />}
                    </Button>
                    <Input
                      value={message}
                      onChange={event => setMessage(event.target.value)}
                      placeholder={recording ? 'Vocal en cours...' : uploading ? 'Ajout du média...' : sending ? 'Envoi en cours...' : 'Écrire un message...'}
                      className='h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/38 focus:border-[#ff62a8]'
                      disabled={!conversationDetails?.can_interact || sending || recording}
                    />
                    <Button
                      type='submit'
                      className='h-12 rounded-2xl bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] px-5 text-white hover:opacity-90'
                      disabled={!canSend}
                    >
                      <Send className='mr-2 h-4 w-4' />
                      Envoyer
                    </Button>
                  </form>
                </div>
              </>
            )}
          </section>

          <aside className='border-t border-white/10 p-5 lg:border-l lg:border-t-0'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='font-black'>Passer au réel</h3>
              <p className='mt-3 text-sm leading-6 text-white/62'>
                La rencontre se prolonge dans les Love Rooms, les apéros jacuzzi et les événements rideaux ouverts.
              </p>
              <div className='mt-4 space-y-3'>
                <Link href='/love-rooms/1' className='block rounded-2xl border border-[#ff8cc8]/20 bg-[#ff3b8b]/12 p-4 transition hover:bg-[#ff3b8b]/18'>
                  <div className='flex items-center gap-2 text-sm font-black'>
                    <Sparkles className='h-4 w-4 text-[#ff8cc8]' />
                    Love Room champagne
                  </div>
                  <p className='mt-2 text-xs leading-5 text-white/58'>
                    Suite intime, bouteille, trois coupes et ambiance tamisée.
                  </p>
                </Link>
                <Link href='/events' className='block rounded-2xl border border-[#94ffc9]/20 bg-[#94ffc9]/10 p-4 transition hover:bg-[#94ffc9]/14'>
                  <div className='flex items-center gap-2 text-sm font-black'>
                    <CalendarHeart className='h-4 w-4 text-[#94ffc9]' />
                    Apero jacuzzi
                  </div>
                  <p className='mt-2 text-xs leading-5 text-white/58'>
                    Un format coquin mais élégant pour couples et affinités confirmées.
                  </p>
                </Link>
              </div>
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
                  <dd className='font-bold'>image/audio/video</dd>
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
