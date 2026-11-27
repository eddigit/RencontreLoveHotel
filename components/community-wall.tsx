'use client'

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import {
  CalendarHeart,
  ChevronDown,
  Clock,
  Flag,
  ImagePlus,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  addWallComment,
  createWallPost,
  getCommunityWallFeed,
  getWallComments,
  getWallEventOptions,
  removeOwnWallPost,
  reportWallComment,
  reportWallPost,
  type CommunityWallComment,
  type CommunityWallPost
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
  currentUserName?: string | null
  currentUserAvatar?: string | null
  betweenComposerAndFeed?: ReactNode
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
    detail: '24 h ou 48 h',
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

function avatarInitial(name?: string | null) {
  return (name || 'M').slice(0, 1).toUpperCase()
}

export function CommunityWall({ currentUserId, currentUserName, currentUserAvatar, betweenComposerAndFeed }: CommunityWallProps) {
  const [posts, setPosts] = useState<CommunityWallPost[]>([])
  const [events, setEvents] = useState<WallEventOption[]>([])
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityWallComment[]>>({})
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set())
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [type, setType] = useState<WallPostType>('profil')
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [eventId, setEventId] = useState('')
  const [durationHours, setDurationHours] = useState<24 | 48>(24)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const remainingChars = useMemo(() => 500 - body.length, [body])
  const canSubmit = Boolean(body.trim() || imageFile)

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
        formData.set('durationHours', String(durationHours))
      }
      if (imageFile) {
        formData.set('image', imageFile)
      }

      await createWallPost(formData)
      setBody('')
      setImageFile(null)
      setEventId('')
      setDurationHours(24)
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

  return (
    <section id='community-wall' className='scroll-mt-24 text-[#ecebe7]'>
      <form id='wall-composer' onSubmit={handleCreatePost} className='rounded-xl bg-[#1a1b21] p-4 shadow-sm'>
        <div className='flex items-start gap-3'>
          <div className='h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#292a2f]'>
            {currentUserAvatar ? (
              <img src={currentUserAvatar} alt={currentUserName || 'Votre profil'} className='h-full w-full object-cover' />
            ) : (
              <span className='flex h-full w-full items-center justify-center text-sm font-semibold text-[#e3e1e9]'>
                {avatarInitial(currentUserName)}
              </span>
            )}
          </div>
          <Textarea
            value={body}
            onChange={event => setBody(event.target.value.slice(0, 500))}
            placeholder='Proposez une sortie ou partagez un mot avec le cercle…'
            aria-label='Votre publication'
            className='min-h-[72px] resize-none rounded-xl border-0 bg-[#292a2f] px-3 py-2.5 text-sm text-[#e3e1e9] placeholder:text-[#ad8887] focus-visible:ring-2 focus-visible:ring-[#ff525d]'
          />
        </div>

        <div className='mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3'>
          <label className='inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#292a2f] px-3 text-xs font-semibold text-[#e6bdbb] transition hover:text-[#e3e1e9]'>
            <ImagePlus className='h-4 w-4 text-[#ff525d]' />
            {imageFile ? 'Photo choisie' : 'Média'}
            <input
              type='file'
              accept='image/jpeg,image/png,image/webp'
              className='sr-only'
              onChange={handleImageChange}
            />
          </label>
          <label className='inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#292a2f] px-2 text-xs font-semibold text-[#e6bdbb]'>
            <CalendarHeart className='h-4 w-4 text-[#ff525d]' />
            <span className='sr-only'>Type de publication</span>
            <select
              value={type}
              onChange={event => setType(event.target.value as WallPostType)}
              className='h-full max-w-[11rem] bg-transparent pr-5 text-xs text-[#e6bdbb] outline-none'
              aria-label='Type de publication'
            >
              {postTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <span className='ml-auto text-xs text-[#ad8887]'>{remainingChars}</span>
          <Button
            type='submit'
            disabled={submitting || !canSubmit}
            className='h-9 bg-[#ff525d] px-3 text-xs font-semibold text-[#5b000f] hover:bg-[#ffb3ac]'
          >
            <Send className='mr-1.5 h-3.5 w-3.5' />
            {submitting ? 'Publication…' : 'Publier'}
          </Button>
        </div>

        {imagePreview && (
          <div className='mt-3 overflow-hidden rounded-xl bg-[#292a2f]'>
            <div className='relative aspect-[4/3] max-h-[360px] w-full'>
              <img
                src={imagePreview}
                alt='Aperçu de la photo'
                className='h-full w-full object-cover'
              />
              <button
                type='button'
                onClick={() => setImageFile(null)}
                className='absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1b21] text-[#e3e1e9] shadow-lg transition hover:bg-[#292a2f]'
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
            className='mt-3 h-10 w-full rounded-lg border-0 bg-[#292a2f] px-3 text-sm text-[#e3e1e9] outline-none focus:ring-2 focus:ring-[#ff525d]'
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
          <div className='mt-3 flex gap-2'>
            {[24, 48].map(value => (
              <button
                key={value}
                type='button'
                aria-pressed={durationHours === value}
                onClick={() => setDurationHours(value as 24 | 48)}
                className={`h-10 flex-1 rounded-xl border text-sm font-bold transition ${
                  durationHours === value
                    ? 'border-[#ff525d] bg-[#292a2f] text-[#e3e1e9]'
                    : 'border-transparent bg-[#292a2f] text-[#e6bdbb]'
                }`}
              >
                {value} h
              </button>
            ))}
          </div>
        )}

      </form>

      {statusMessage && (
        <div className='mt-3 rounded-xl border border-[#41454b] bg-[#0a0f15] px-3 py-2 text-sm text-[#c9c7c2]'>
          {statusMessage}
        </div>
      )}

      {betweenComposerAndFeed && <div className='mt-4'>{betweenComposerAndFeed}</div>}

      <div className='mt-4 space-y-3'>
        {loading && (
          <div className='rounded-2xl border border-[#41454b] bg-[#0a0f15] p-4 text-sm text-[#c9c7c2]'>
            Chargement du mur...
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className='rounded-2xl border border-dashed border-[#41454b] bg-[#0a0f15] p-5 text-center'>
            <p className='font-black'>Le mur est encore calme.</p>
            <p className='mt-2 text-sm text-[#c9c7c2]'>Soyez le premier à publier une annonce.</p>
          </div>
        )}

        {posts.map(post => {
          const expanded = expandedPostIds.has(post.id)
          const comments = commentsByPost[post.id] || []
          const commentCount = Number(post.comment_count || 0)
          const expiration = expirationLabel(post.expires_at)
          return (
            <article key={post.id} className='rounded-xl border border-white/[0.045] bg-[#1a1b21] p-4 sm:p-5'>
              <div className='flex items-start gap-3'>
                <Link href={`/profile/${post.user_id}`} className='relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#0a0f15]'>
                  {post.author_avatar ? (
                    <img src={post.author_avatar} alt={post.author_name || 'Membre'} className='h-full w-full object-cover' />
                  ) : (
                    <span className='flex h-full w-full items-center justify-center bg-[#111821] font-black'>
                      {avatarInitial(post.author_name)}
                    </span>
                  )}
                </Link>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Link href={`/profile/${post.user_id}`} className='font-black hover:text-[#ecebe7]'>
                      {post.author_name || 'Membre'}
                    </Link>
                    <span className='rounded-full border border-[#41454b] bg-[#111821] px-2 py-0.5 text-xs font-bold text-[#ecebe7]'>
                      {typeLabels[post.type]}
                    </span>
                  </div>
                  <div className='mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#c9c7c2]'>
                    <span>{relativeTime(post.created_at)}</span>
                    {expiration && (
                      <span className='inline-flex items-center gap-1 text-[#ecebe7]'>
                        <Clock className='h-3 w-3' />
                        {expiration}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {post.body && (
                <p className='mt-3 whitespace-pre-wrap text-sm leading-6 text-[#c9c7c2]'>{post.body}</p>
              )}

              {post.image_url && (
                <div className='mt-3 overflow-hidden rounded-2xl border border-[#41454b] bg-[#0a0f15]'>
                  <img
                    src={post.image_url}
                    alt={`Photo publiée par ${post.author_name || 'un membre'}`}
                    className='max-h-[520px] w-full object-cover'
                  />
                </div>
              )}

              {post.event_id && post.event_title && (
                <Link
                  href={`/events/${post.event_id}`}
                  className='mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#41454b] bg-[#111821] px-3 py-2 text-sm transition hover:bg-[#111821]'
                >
                  <span className='min-w-0'>
                    <span className='block truncate font-bold text-[#ecebe7]'>{post.event_title}</span>
                    <span className='text-xs text-[#c9c7c2]'>{eventDateLabel(post.event_date)}</span>
                  </span>
                  <CalendarHeart className='h-4 w-4 shrink-0 text-[#ecebe7]' />
                </Link>
              )}

              <div className='mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#41454b] pt-3'>
                <button
                  type='button'
                  onClick={() => toggleComments(post.id)}
                  className='inline-flex items-center gap-2 rounded-full border border-[#41454b] bg-[#0a0f15] px-3 py-1.5 text-sm text-[#c9c7c2] transition hover:border-[#41454b] hover:text-[#ecebe7]'
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
                    className='inline-flex items-center gap-1 rounded-full border border-[#41454b] px-3 py-1.5 text-xs text-[#c9c7c2] transition hover:border-[#41454b] hover:text-[#ecebe7] disabled:opacity-45'
                  >
                    <Flag className='h-3.5 w-3.5' />
                    Signaler
                  </button>
                  {post.user_id === currentUserId && (
                    <button
                      type='button'
                      onClick={() => handleRemovePost(post.id)}
                      className='inline-flex items-center gap-1 rounded-full border border-[#41454b] px-3 py-1.5 text-xs text-[#c9c7c2] transition hover:border-red-300/35 hover:text-red-800'
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              {expanded && (
                <div className='mt-3 space-y-3 rounded-xl border border-[#41454b] bg-[#0a0f15] p-3'>
                  {comments.length === 0 && (
                    <p className='text-sm text-[#c9c7c2]'>Aucun commentaire pour le moment.</p>
                  )}
                  {comments.map(comment => (
                    <div key={comment.id} className='flex gap-2'>
                      <Link href={`/profile/${comment.user_id}`} className='h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#0a0f15]'>
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
                          <Link href={`/profile/${comment.user_id}`} className='font-bold hover:text-[#ecebe7]'>
                            {comment.author_name || 'Membre'}
                          </Link>
                          <span className='text-[#c9c7c2]'>{relativeTime(comment.created_at)}</span>
                        </div>
                        <p className='mt-1 whitespace-pre-wrap text-sm text-[#c9c7c2]'>{comment.body}</p>
                      </div>
                      <button
                        type='button'
                        onClick={() => handleReportComment(post.id, comment.id)}
                        disabled={Boolean(comment.has_reported)}
                        className='h-8 rounded-full px-2 text-[#c9c7c2] transition hover:text-[#ecebe7] disabled:opacity-35'
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
                      className='h-10 min-w-0 flex-1 rounded-full border border-[#41454b] bg-[#0a0f15] px-3 text-sm text-[#ecebe7] outline-none placeholder:text-[#c9c7c2] focus:border-[#ff525d]'
                    />
                    <Button
                      type='button'
                      onClick={() => handleCreateComment(post.id)}
                      disabled={!commentDrafts[post.id]?.trim()}
                      size='sm'
                      className='rounded-full bg-[#c1121f] text-white hover:bg-[#c1121f]'
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
