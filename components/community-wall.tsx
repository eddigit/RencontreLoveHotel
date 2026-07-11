'use client'

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import {
  CalendarHeart,
  Check,
  ChevronDown,
  Clock,
  Flag,
  Hotel,
  ImagePlus,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  addWallComment,
  createWallPost,
  decideWallParticipationRequest,
  getCommunityWallFeed,
  getWallComments,
  getWallEventOptions,
  getWallParticipationRequests,
  removeOwnWallPost,
  reportWallComment,
  reportWallPost,
  requestWallParticipation,
  type CommunityWallComment,
  type CommunityWallPost,
  type WallParticipationRequest
} from '@/actions/community-wall-actions'

type WallPostType = 'profil' | 'evenement' | 'dispo_rideaux_ouverts'

type WallEventOption = {
  id: string
  title: string
  event_date?: string | Date
  event_time?: string
}

type CommunityWallProps = {
  currentUserId: string
}

const postTypeOptions: Array<{
  value: WallPostType
  label: string
  detail: string
  icon: typeof UserRound
}> = [
  {
    value: 'profil',
    label: 'Profil',
    detail: 'Me présenter',
    icon: UserRound
  },
  {
    value: 'evenement',
    label: 'Événement',
    detail: 'Proposer une sortie',
    icon: CalendarHeart
  },
  {
    value: 'dispo_rideaux_ouverts',
    label: 'Rideaux ouverts',
    detail: 'Chambre réservée',
    icon: Sparkles
  }
]

const typeLabels: Record<WallPostType, string> = {
  profil: 'Profil',
  evenement: 'Événement',
  dispo_rideaux_ouverts: 'Rideaux ouverts'
}

function toDate(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function relativeTime(value?: string | Date | null) {
  const date = toDate(value)
  if (!date) return 'maintenant'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000))
  if (diffMinutes < 1) return 'à l’instant'
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `il y a ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  return `il y a ${diffDays} j`
}

function expirationLabel(value?: string | Date | null) {
  const date = toDate(value)
  if (!date) return null

  const remainingMinutes = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 60_000))
  if (remainingMinutes <= 0) return 'expire maintenant'
  if (remainingMinutes < 60) return `expire dans ${remainingMinutes} min`

  const remainingHours = Math.ceil(remainingMinutes / 60)
  return `expire dans ${remainingHours} h`
}

function eventDateLabel(value?: string | Date | null) {
  const date = toDate(value)
  if (!date) return 'Prochainement'

  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  })
}

function invitationDateLabel(value?: string | Date | null) {
  const date = toDate(value)
  if (!date) return 'Horaire à confirmer'
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function avatarInitial(name?: string | null) {
  return (name || 'M').slice(0, 1).toUpperCase()
}

function typeBadgeClass(type: WallPostType) {
  if (type === 'dispo_rideaux_ouverts') {
    return 'border-[#94ffc9]/35 bg-[#94ffc9]/12 text-[#94ffc9]'
  }

  if (type === 'evenement') {
    return 'border-[#ffd166]/35 bg-[#ffd166]/12 text-[#ffe09a]'
  }

  return 'border-[#ff8cc8]/35 bg-[#ff3b8b]/12 text-[#ffb3d7]'
}

export function CommunityWall({ currentUserId }: CommunityWallProps) {
  const [posts, setPosts] = useState<CommunityWallPost[]>([])
  const [events, setEvents] = useState<WallEventOption[]>([])
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityWallComment[]>>({})
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set())
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [requestsByPost, setRequestsByPost] = useState<Record<string, WallParticipationRequest[]>>({})
  const [expandedRequestPostIds, setExpandedRequestPostIds] = useState<Set<string>>(new Set())
  const [type, setType] = useState<WallPostType>('profil')
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [eventId, setEventId] = useState('')
  const [venue, setVenue] = useState<'chatelet' | 'pigalle'>('chatelet')
  const [roomName, setRoomName] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [guestCapacity, setGuestCapacity] = useState(1)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingReference, setBookingReference] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const remainingChars = useMemo(() => 500 - body.length, [body])
  const hasContent = Boolean(body.trim() || imageFile)
  const hasBookedRoom = Boolean(
    venue && startsAt && guestCapacity > 0 &&
    (!bookingConfirmed || (roomName.trim() && bookingReference.trim()))
  )
  const canSubmit = hasContent && (type !== 'dispo_rideaux_ouverts' || hasBookedRoom)

  const loadWall = useCallback(async () => {
    setLoading(true)
    try {
      const [feedRows, eventRows] = await Promise.all([
        getCommunityWallFeed(),
        getWallEventOptions()
      ])
      setPosts(feedRows)
      setEvents(eventRows)
    } catch (error) {
      setStatusMessage('Impossible de charger le mur pour le moment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWall()
  }, [loadWall])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }

    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [imageFile])

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setStatusMessage('')
    try {
      const formData = new FormData()
      formData.set('type', type)
      formData.set('body', body)
      if (type === 'evenement' && eventId) {
        formData.set('eventId', eventId)
      }
      if (type === 'dispo_rideaux_ouverts') {
        formData.set('venue', venue)
        formData.set('roomName', roomName)
        formData.set('startsAt', new Date(startsAt).toISOString())
        formData.set('guestCapacity', String(guestCapacity))
        formData.set('bookingConfirmed', String(bookingConfirmed))
        formData.set('bookingReference', bookingReference)
      }
      if (imageFile) {
        formData.set('image', imageFile)
      }

      await createWallPost(formData)
      setBody('')
      setImageFile(null)
      setEventId('')
      setVenue('chatelet')
      setRoomName('')
      setStartsAt('')
      setGuestCapacity(1)
      setBookingConfirmed(false)
      setBookingReference('')
      setType('profil')
      setStatusMessage('Annonce publiée.')
      await loadWall()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Publication impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null
    setImageFile(file)
    event.target.value = ''
  }

  async function toggleComments(postId: string) {
    const next = new Set(expandedPostIds)
    if (next.has(postId)) {
      next.delete(postId)
      setExpandedPostIds(next)
      return
    }

    next.add(postId)
    setExpandedPostIds(next)
    if (!commentsByPost[postId]) {
      const rows = await getWallComments({ postId })
      setCommentsByPost(current => ({ ...current, [postId]: rows }))
    }
  }

  async function handleCreateComment(postId: string) {
    const draft = (commentDrafts[postId] || '').trim()
    if (!draft) return

    setStatusMessage('')
    try {
      await addWallComment({ postId, body: draft })
      setCommentDrafts(current => ({ ...current, [postId]: '' }))
      const rows = await getWallComments({ postId })
      setCommentsByPost(current => ({ ...current, [postId]: rows }))
      await loadWall()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Commentaire impossible.')
    }
  }

  async function handleReportPost(postId: string) {
    setStatusMessage('')
    try {
      await reportWallPost({ postId, reason: 'Signalement membre depuis le mur' })
      setStatusMessage('Signalement transmis à la modération.')
      await loadWall()
    } catch (error) {
      setStatusMessage('Signalement impossible pour le moment.')
    }
  }

  async function handleReportComment(postId: string, commentId: string) {
    setStatusMessage('')
    try {
      await reportWallComment({ commentId, reason: 'Signalement commentaire mur' })
      setStatusMessage('Commentaire signalé à la modération.')
      const rows = await getWallComments({ postId })
      setCommentsByPost(current => ({ ...current, [postId]: rows }))
    } catch (error) {
      setStatusMessage('Signalement impossible pour le moment.')
    }
  }

  async function handleRemovePost(postId: string) {
    setStatusMessage('')
    try {
      await removeOwnWallPost({ postId })
      setStatusMessage('Annonce supprimée.')
      await loadWall()
    } catch (error) {
      setStatusMessage('Suppression impossible pour le moment.')
    }
  }

  async function handleRequestParticipation(postId: string) {
    setStatusMessage('')
    try {
      await requestWallParticipation({ postId })
      setStatusMessage('Demande envoyée à l’organisateur.')
      await loadWall()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Demande impossible.')
    }
  }

  async function toggleParticipationRequests(postId: string) {
    const next = new Set(expandedRequestPostIds)
    if (next.has(postId)) {
      next.delete(postId)
      setExpandedRequestPostIds(next)
      return
    }

    next.add(postId)
    setExpandedRequestPostIds(next)
    const rows = await getWallParticipationRequests({ postId })
    setRequestsByPost(current => ({ ...current, [postId]: rows }))
  }

  async function handleParticipationDecision(
    postId: string,
    requestId: string,
    decision: 'accepted' | 'rejected'
  ) {
    setStatusMessage('')
    try {
      await decideWallParticipationRequest({ requestId, decision })
      const rows = await getWallParticipationRequests({ postId })
      setRequestsByPost(current => ({ ...current, [postId]: rows }))
      setStatusMessage(decision === 'accepted' ? 'Participation acceptée.' : 'Demande refusée.')
      await loadWall()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Décision impossible.')
    }
  }

  return (
    <section id='community-wall' className='scroll-mt-24 rounded-2xl border border-[#ff8cc8]/24 bg-[linear-gradient(135deg,rgba(23,3,33,0.98),rgba(43,13,64,0.92),rgba(10,3,18,0.98))] p-4 shadow-xl shadow-black/25'>
      <div className='mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#94ffc9]'>
            Mur de la communauté
          </p>
          <h2 className='mt-1 text-xl font-black'>Annonces des membres</h2>
        </div>
        <Link href='/messages' className='text-sm font-semibold text-[#ffb3d7] hover:text-white'>
          Messagerie
        </Link>
      </div>

      <form onSubmit={handleCreatePost} className='rounded-2xl border border-white/10 bg-white/[0.055] p-3'>
        <div className='grid gap-2 sm:grid-cols-3'>
          {postTypeOptions.map(option => {
            const Icon = option.icon
            const selected = type === option.value
            return (
              <button
                key={option.value}
                type='button'
                onClick={() => setType(option.value)}
                className={`flex min-h-[58px] items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                  selected
                    ? 'border-[#ff8cc8]/65 bg-[#ff3b8b]/18 text-white'
                    : 'border-[#ff8cc8]/14 bg-[#21082f]/72 text-white/72 hover:border-[#ff8cc8]/30'
                }`}
              >
                <Icon className='h-4 w-4 shrink-0' />
                <span className='min-w-0'>
                  <span className='block text-sm font-black leading-5'>{option.label}</span>
                  <span className='block truncate text-xs text-white/54'>{option.detail}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className='mt-3'>
          <Textarea
            value={body}
            onChange={event => setBody(event.target.value.slice(0, 500))}
            placeholder='Votre annonce pour la communauté...'
            className='min-h-[84px] resize-none rounded-xl border-[#ff8cc8]/22 bg-[#170321]/95 text-white placeholder:text-[#d8c6e8]/48 shadow-inner shadow-black/20 focus:border-[#ff8cc8]'
          />
          <div className='mt-1 text-right text-xs text-white/45'>{remainingChars} caractères</div>
        </div>

        <div className='mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start'>
          <label className='inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#ff8cc8]/22 bg-[#21082f]/72 px-3 text-sm font-bold text-white/78 transition hover:border-[#ff8cc8]/40 hover:text-white'>
            <ImagePlus className='h-4 w-4' />
            {imageFile ? 'Changer la photo' : 'Ajouter une photo'}
            <input
              type='file'
              accept='image/jpeg,image/png,image/webp'
              className='sr-only'
              onChange={handleImageChange}
            />
          </label>
          <p className='text-xs leading-5 text-white/45 sm:text-right'>
            JPG, PNG ou WebP. 8 Mo max.
          </p>
        </div>

        {imagePreview && (
          <div className='mt-3 overflow-hidden rounded-2xl border border-[#ff8cc8]/20 bg-[#170321]/70'>
            <div className='relative aspect-[4/3] max-h-[360px] w-full'>
              <img
                src={imagePreview}
                alt='Aperçu de la photo'
                className='h-full w-full object-cover'
              />
              <button
                type='button'
                onClick={() => setImageFile(null)}
                className='absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#170321]/85 text-white shadow-lg transition hover:bg-[#ff3b8b]'
                aria-label='Retirer la photo'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
          </div>
        )}

        {type === 'evenement' && (
          <select
            value={eventId}
            onChange={event => setEventId(event.target.value)}
            className='mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#241035] px-3 text-sm text-white outline-none focus:border-[#ffd166]'
          >
            <option value=''>Associer un événement existant (optionnel)</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} - {eventDateLabel(event.event_date)}
              </option>
            ))}
          </select>
        )}

        {type === 'dispo_rideaux_ouverts' && (
          <div className='mt-3 rounded-xl border border-[#94ffc9]/20 bg-[#94ffc9]/[0.06] p-3'>
            <div className='flex items-start gap-2'>
              <Hotel className='mt-0.5 h-4 w-4 shrink-0 text-[#94ffc9]' />
              <div>
                <p className='text-sm font-black text-[#b8ffda]'>Une réservation confirmée rassure les participants</p>
                <p className='mt-1 text-xs leading-5 text-white/52'>Vous pouvez publier sans réservation, mais l’annonce indiquera clairement que la disponibilité n’est pas garantie.</p>
              </div>
            </div>

            <div className='mt-3 grid gap-2 sm:grid-cols-2'>
              <label className='text-xs font-bold text-white/66'>
                Établissement
                <select value={venue} onChange={event => setVenue(event.target.value as 'chatelet' | 'pigalle')} className='mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#170321] px-3 text-sm text-white'>
                  <option value='chatelet'>Châtelet</option>
                  <option value='pigalle'>Pigalle</option>
                </select>
              </label>
              <label className='text-xs font-bold text-white/66'>
                Chambre {bookingConfirmed ? 'réservée' : 'souhaitée (optionnel)'}
                <input value={roomName} onChange={event => setRoomName(event.target.value)} placeholder='Ex. Secrets' className='mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#170321] px-3 text-sm text-white placeholder:text-white/35' />
              </label>
              <label className='text-xs font-bold text-white/66'>
                Date et heure
                <input type='datetime-local' value={startsAt} onChange={event => setStartsAt(event.target.value)} className='mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#170321] px-3 text-sm text-white' />
              </label>
              <label className='text-xs font-bold text-white/66'>
                Places recherchées
                <input type='number' min={1} max={8} value={guestCapacity} onChange={event => setGuestCapacity(Number(event.target.value))} className='mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#170321] px-3 text-sm text-white' />
              </label>
              {bookingConfirmed && (
                <label className='text-xs font-bold text-white/66 sm:col-span-2'>
                  Référence de réservation (privée)
                  <input value={bookingReference} onChange={event => setBookingReference(event.target.value)} placeholder='Numéro ou référence de confirmation' className='mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#170321] px-3 text-sm text-white placeholder:text-white/35' />
                </label>
              )}
            </div>

            <label className='mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-[#170321]/75 p-3 text-sm'>
              <input type='checkbox' checked={bookingConfirmed} onChange={event => setBookingConfirmed(event.target.checked)} className='mt-0.5 h-4 w-4 accent-[#35e48d]' />
              <span>
                <span className='block font-black text-white'>Chambre déjà réservée</span>
                <span className='mt-0.5 block text-xs leading-5 text-white/50'>Je confirme disposer d’une réservation valide pour ce créneau.</span>
              </span>
            </label>
          </div>
        )}

        <div className='mt-3 flex items-center justify-between gap-3'>
          <p className='text-xs text-white/50'>
            Texte et photo optionnelle. Les annonces filtrées partent en modération.
          </p>
          <Button
            type='submit'
            disabled={submitting || !canSubmit}
            className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'
          >
            <Send className='mr-2 h-4 w-4' />
            {submitting ? 'Publication...' : 'Publier'}
          </Button>
        </div>
      </form>

      {statusMessage && (
        <div className='mt-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/78'>
          {statusMessage}
        </div>
      )}

      <div className='mt-4 space-y-3'>
        {loading && (
          <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm text-white/58'>
            Chargement du mur...
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className='rounded-2xl border border-dashed border-white/16 bg-white/[0.04] p-5 text-center'>
            <p className='font-black'>Le mur est encore calme.</p>
            <p className='mt-2 text-sm text-white/58'>Soyez le premier à publier une annonce.</p>
          </div>
        )}

        {posts.map(post => {
          const expanded = expandedPostIds.has(post.id)
          const requestsExpanded = expandedRequestPostIds.has(post.id)
          const comments = commentsByPost[post.id] || []
          const participationRequests = requestsByPost[post.id] || []
          const commentCount = Number(post.comment_count || 0)
          const requestCount = Number(post.participation_request_count || 0)
          const acceptedCount = Number(post.accepted_participant_count || 0)
          const capacity = Number(post.guest_capacity || 0)
          const expiration = post.type === 'dispo_rideaux_ouverts'
            ? null
            : expirationLabel(post.expires_at)
          return (
            <article key={post.id} className='rounded-2xl border border-white/10 bg-white/[0.045] p-4'>
              <div className='flex items-start gap-3'>
                <Link href={`/profile/${post.user_id}`} className='relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10'>
                  {post.author_avatar ? (
                    <img src={post.author_avatar} alt={post.author_name || 'Membre'} className='h-full w-full object-cover' />
                  ) : (
                    <span className='flex h-full w-full items-center justify-center bg-[#ff3b8b]/18 font-black'>
                      {avatarInitial(post.author_name)}
                    </span>
                  )}
                </Link>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Link href={`/profile/${post.user_id}`} className='font-black hover:text-[#ffb3d7]'>
                      {post.author_name || 'Membre'}
                    </Link>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${typeBadgeClass(post.type)}`}>
                      {typeLabels[post.type]}
                    </span>
                  </div>
                  <div className='mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/48'>
                    <span>{relativeTime(post.created_at)}</span>
                    {expiration && (
                      <span className='inline-flex items-center gap-1 text-[#94ffc9]'>
                        <Clock className='h-3 w-3' />
                        {expiration}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {post.body && (
                <p className='mt-3 whitespace-pre-wrap text-sm leading-6 text-white/78'>{post.body}</p>
              )}

              {post.type === 'dispo_rideaux_ouverts' && (
                <div className='mt-3 rounded-xl border border-[#94ffc9]/25 bg-[#94ffc9]/[0.07] p-3'>
                  <div className='flex flex-wrap items-center gap-2 text-xs font-bold'>
                    {post.booking_confirmed ? (
                      <span className='inline-flex items-center gap-1 rounded-full bg-[#35e48d]/15 px-2 py-1 text-[#b8ffda]'>
                        <Check className='h-3.5 w-3.5' />
                        Réservation confirmée
                      </span>
                    ) : (
                      <span className='inline-flex items-center gap-1 rounded-full bg-[#ffd166]/15 px-2 py-1 text-[#ffe09a]'>
                        <Clock className='h-3.5 w-3.5' />
                        Disponibilité non garantie
                      </span>
                    )}
                    <span className='inline-flex items-center gap-1 text-white/70'>
                      <MapPin className='h-3.5 w-3.5 text-[#ff8cc8]' />
                      {post.venue === 'pigalle' ? 'Pigalle' : 'Châtelet'}{post.room_name ? ` · ${post.room_name}` : ''}
                    </span>
                  </div>
                  <div className='mt-3 grid gap-2 text-sm sm:grid-cols-2'>
                    <div className='rounded-lg bg-black/15 px-3 py-2 text-white/72'>
                      <Clock className='mr-1.5 inline h-4 w-4 text-[#94ffc9]' />
                      {invitationDateLabel(post.starts_at)}
                    </div>
                    <div className='rounded-lg bg-black/15 px-3 py-2 text-white/72'>
                      <Users className='mr-1.5 inline h-4 w-4 text-[#94ffc9]' />
                      Places confirmées : {acceptedCount}/{capacity}
                    </div>
                  </div>
                </div>
              )}

              {post.image_url && (
                <div className='mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#170321]/60'>
                  <img
                    src={post.image_url}
                    alt={`Photo publiée par ${post.author_name || 'un membre'}`}
                    className='max-h-[520px] w-full object-cover'
                  />
                </div>
              )}

              {post.type === 'dispo_rideaux_ouverts' && !post.image_url && (
                <div className='mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#170321]/60'>
                  <img
                    src='/rideaux-ouverts-rencontre.jpg'
                    alt='Couple dans une expérience rideaux ouverts'
                    className='max-h-[420px] w-full object-cover'
                  />
                </div>
              )}

              {post.event_id && post.event_title && (
                <Link
                  href={`/events/${post.event_id}`}
                  className='mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#ffd166]/25 bg-[#ffd166]/10 px-3 py-2 text-sm transition hover:bg-[#ffd166]/16'
                >
                  <span className='min-w-0'>
                    <span className='block truncate font-bold text-[#ffe09a]'>{post.event_title}</span>
                    <span className='text-xs text-white/52'>{eventDateLabel(post.event_date)}</span>
                  </span>
                  <CalendarHeart className='h-4 w-4 shrink-0 text-[#ffd166]' />
                </Link>
              )}

              {post.type === 'dispo_rideaux_ouverts' && post.user_id !== currentUserId && (
                <div className='mt-3'>
                  {!post.current_user_request_status || post.current_user_request_status === 'rejected' ? (
                    <Button
                      type='button'
                      onClick={() => handleRequestParticipation(post.id)}
                      disabled={acceptedCount >= capacity}
                      className='w-full bg-gradient-to-r from-[#21b56f] to-[#35e48d] font-black text-[#071c11] hover:opacity-90'
                    >
                      <Users className='mr-2 h-4 w-4' />
                      {acceptedCount >= capacity ? 'Invitation complète' : 'Demander à participer'}
                    </Button>
                  ) : post.current_user_request_status === 'pending' ? (
                    <Button type='button' disabled className='w-full bg-white/10 text-white/60'>Demande envoyée</Button>
                  ) : (
                    <Button asChild className='w-full bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                      <Link href={post.current_user_conversation_id ? `/messages/${post.current_user_conversation_id}` : '/messages'}>
                        <MessageCircle className='mr-2 h-4 w-4' />
                        Participation acceptée · Écrire
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {post.type === 'dispo_rideaux_ouverts' && post.user_id === currentUserId && (
                <div className='mt-3'>
                  <Button type='button' variant='outline' onClick={() => toggleParticipationRequests(post.id)} className='w-full border-[#94ffc9]/25 bg-[#94ffc9]/[0.06] text-white'>
                    <Users className='mr-2 h-4 w-4 text-[#94ffc9]' />
                    Voir les demandes ({requestCount})
                    <ChevronDown className={`ml-2 h-4 w-4 transition ${requestsExpanded ? 'rotate-180' : ''}`} />
                  </Button>

                  {requestsExpanded && (
                    <div className='mt-2 space-y-2 rounded-xl border border-white/10 bg-black/15 p-3'>
                      {participationRequests.length === 0 && <p className='text-sm text-white/52'>Aucune demande pour le moment.</p>}
                      {participationRequests.map(request => (
                        <div key={request.id} className='flex flex-col gap-3 rounded-lg border border-white/8 bg-white/[0.04] p-3 sm:flex-row sm:items-center'>
                          <Link href={`/profile/${request.user_id}`} className='flex min-w-0 flex-1 items-center gap-3'>
                            <div className='h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10'>
                              {request.member_avatar ? <img src={request.member_avatar} alt='' className='h-full w-full object-cover' /> : <span className='flex h-full items-center justify-center font-black'>{avatarInitial(request.member_name)}</span>}
                            </div>
                            <div className='min-w-0'>
                              <div className='truncate font-black'>{request.member_name || 'Membre'}</div>
                              <div className='truncate text-xs text-white/48'>{request.member_location || 'Localisation non renseignée'}</div>
                            </div>
                          </Link>
                          {request.status === 'pending' ? (
                            <div className='flex gap-2'>
                              <Button type='button' size='sm' onClick={() => handleParticipationDecision(post.id, request.id, 'accepted')} className='bg-[#21b56f] text-white hover:bg-[#27c87c]'>
                                <Check className='mr-1 h-4 w-4' />Accepter
                              </Button>
                              <Button type='button' size='sm' variant='outline' onClick={() => handleParticipationDecision(post.id, request.id, 'rejected')} className='border-white/12'>
                                <X className='mr-1 h-4 w-4' />Refuser
                              </Button>
                            </div>
                          ) : (
                            <span className='text-xs font-bold text-white/55'>{request.status === 'accepted' ? 'Acceptée' : 'Refusée'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className='mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3'>
                <button
                  type='button'
                  onClick={() => toggleComments(post.id)}
                  className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/16 px-3 py-1.5 text-sm text-white/72 transition hover:border-[#ff8cc8]/35 hover:text-white'
                >
                  <MessageCircle className='h-4 w-4' />
                  {commentCount} commentaire{commentCount > 1 ? 's' : ''}
                  <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
                </button>
                <div className='flex gap-2'>
                  <button
                    type='button'
                    onClick={() => handleReportPost(post.id)}
                    disabled={Boolean(post.has_reported)}
                    className='inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/58 transition hover:border-[#ffd166]/35 hover:text-white disabled:opacity-45'
                  >
                    <Flag className='h-3.5 w-3.5' />
                    Signaler
                  </button>
                  {post.user_id === currentUserId && (
                    <button
                      type='button'
                      onClick={() => handleRemovePost(post.id)}
                      className='inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/58 transition hover:border-red-300/35 hover:text-red-100'
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              {expanded && (
                <div className='mt-3 space-y-3 rounded-xl border border-white/8 bg-black/12 p-3'>
                  {comments.length === 0 && (
                    <p className='text-sm text-white/52'>Aucun commentaire pour le moment.</p>
                  )}
                  {comments.map(comment => (
                    <div key={comment.id} className='flex gap-2'>
                      <Link href={`/profile/${comment.user_id}`} className='h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/10'>
                        {comment.author_avatar ? (
                          <img src={comment.author_avatar} alt={comment.author_name || 'Membre'} className='h-full w-full object-cover' />
                        ) : (
                          <span className='flex h-full w-full items-center justify-center text-xs font-black'>
                            {avatarInitial(comment.author_name)}
                          </span>
                        )}
                      </Link>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2 text-xs'>
                          <Link href={`/profile/${comment.user_id}`} className='font-bold hover:text-[#ffb3d7]'>
                            {comment.author_name || 'Membre'}
                          </Link>
                          <span className='text-white/42'>{relativeTime(comment.created_at)}</span>
                        </div>
                        <p className='mt-1 whitespace-pre-wrap text-sm text-white/72'>{comment.body}</p>
                      </div>
                      <button
                        type='button'
                        onClick={() => handleReportComment(post.id, comment.id)}
                        disabled={Boolean(comment.has_reported)}
                        className='h-8 rounded-full px-2 text-white/42 transition hover:text-[#ffd166] disabled:opacity-35'
                        aria-label='Signaler le commentaire'
                      >
                        <Flag className='h-3.5 w-3.5' />
                      </button>
                    </div>
                  ))}
                  <div className='flex gap-2'>
                    <input
                      value={commentDrafts[post.id] || ''}
                      onChange={event => {
                        const value = event.target.value.slice(0, 300)
                        setCommentDrafts(current => ({ ...current, [post.id]: value }))
                      }}
                      placeholder='Écrire un commentaire...'
                      className='h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.055] px-3 text-sm text-white outline-none placeholder:text-white/34 focus:border-[#ff8cc8]'
                    />
                    <Button
                      type='button'
                      onClick={() => handleCreateComment(post.id)}
                      disabled={!commentDrafts[post.id]?.trim()}
                      size='sm'
                      className='rounded-full bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'
                    >
                      <Send className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
