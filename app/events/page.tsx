'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Check, Clock3, ExternalLink, Plus, Sparkles, UsersRound, X } from 'lucide-react'
import { deleteEvent, getMyEventSubmissions, getUpcomingEvents } from '@/actions/event-actions'
import {
  decideEventParticipation,
  getMyEventParticipations,
  getOwnedEventRequests,
  requestEventParticipation,
  withdrawEventParticipation
} from '@/actions/event-participation-actions'
import { EventCard } from '@/components/event-card'
import MainLayout from '@/components/layout/main-layout'
import { MobileNavigation } from '@/components/mobile-navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

type View = 'upcoming' | 'owned' | 'participating'
type FormatFilter = 'all' | 'jacuzzi' | 'open_curtains'

type EventRow = {
  id: string
  title: string
  location: string
  event_date: string | Date
  event_time?: string | null
  image?: string | null
  venue?: string
  experience_type?: string
  category?: string
  creator_id: string
  creator_name?: string
  participant_count?: number | string
  max_participants?: number
  participation_status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | null
  publication_status?: string
  moderation_note?: string | null
  booking_confirmed?: boolean
  pending_request_count?: number | string
}

type ParticipationRequest = {
  participation_id: string
  event_id: string
  event_title: string
  requester_id: string
  requester_name: string
  requester_avatar?: string | null
  requested_at: string | Date
}

const views: Array<{ value: View; label: string }> = [
  { value: 'upcoming', label: 'À venir' },
  { value: 'owned', label: 'Mes événements' },
  { value: 'participating', label: 'Mes participations' }
]

const formatLabels: Record<string, string> = {
  jacuzzi: 'Apéro jacuzzi',
  open_curtains: 'Rideaux ouverts'
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending_review: { label: 'En attente de validation', className: 'border-[#ffd166]/30 bg-[#ffd166]/10 text-[#ffe7a3]' },
  published: { label: 'Publié', className: 'border-[#94ffc9]/30 bg-[#94ffc9]/10 text-[#94ffc9]' },
  rejected: { label: 'Refusé', className: 'border-red-300/25 bg-red-500/10 text-red-200' }
}

function eventDateLabel (event: EventRow) {
  const datePart = event.event_date instanceof Date
    ? event.event_date.toISOString().slice(0, 10)
    : String(event.event_date).slice(0, 10)
  const timePart = String(event.event_time || '20:00').slice(0, 5)
  const value = new Date(`${datePart}T${timePart}`)
  if (!Number.isFinite(value.getTime())) return `${datePart} à ${timePart}`
  return value.toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function EventsPage () {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<EventRow[]>([])
  const [ownedEvents, setOwnedEvents] = useState<EventRow[]>([])
  const [participations, setParticipations] = useState<EventRow[]>([])
  const [requests, setRequests] = useState<ParticipationRequest[]>([])
  const [view, setView] = useState<View>('upcoming')
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [upcoming, owned, memberParticipations, ownedRequests] = await Promise.all([
        getUpcomingEvents(user.id),
        getMyEventSubmissions(user.id),
        getMyEventParticipations(),
        getOwnedEventRequests()
      ])
      setEvents((upcoming || []) as EventRow[])
      setOwnedEvents((owned || []) as EventRow[])
      setParticipations((memberParticipations || []) as EventRow[])
      setRequests((ownedRequests || []) as ParticipationRequest[])
    } catch {
      setMessage('Les événements ne peuvent pas être chargés pour le moment.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (isLoading) return
    if (!user?.id) {
      router.replace('/login')
      return
    }
    const requestedView = new URLSearchParams(window.location.search).get('view')
    if (requestedView === 'owned' || requestedView === 'participating') setView(requestedView)
    if (new URLSearchParams(window.location.search).get('created') === '1') {
      setMessage('Votre événement a été envoyé. Il apparaîtra ici après validation.')
    }
    void loadData()
  }, [isLoading, loadData, router, user?.id])

  const visibleEvents = useMemo(() => {
    if (formatFilter === 'all') return events
    return events.filter(event => (event.experience_type || event.category) === formatFilter)
  }, [events, formatFilter])

  async function handleRequest (eventId: string) {
    setBusyId(eventId)
    setMessage('')
    const result = await requestEventParticipation(eventId)
    setBusyId(null)
    if (!result.success) {
      setMessage(result.error || 'La demande n’a pas pu être envoyée.')
      return
    }
    setMessage('Demande envoyée à l’organisateur.')
    await loadData()
  }

  async function handleWithdraw (eventId: string) {
    setBusyId(eventId)
    const result = await withdrawEventParticipation(eventId)
    setBusyId(null)
    if (!result.success) {
      setMessage(result.error || 'La participation n’a pas pu être retirée.')
      return
    }
    setMessage('Votre demande a été retirée.')
    await loadData()
  }

  async function handleDecision (participationId: string, decision: 'accept' | 'reject') {
    setBusyId(participationId)
    const result = await decideEventParticipation(participationId, decision)
    setBusyId(null)
    if (!result.success) {
      setMessage(result.error || 'La décision n’a pas pu être enregistrée.')
      return
    }
    setMessage(decision === 'accept' ? 'Participation acceptée.' : 'Demande refusée.')
    await loadData()
  }

  async function handleDelete (eventId: string) {
    if (!window.confirm('Supprimer cet événement ?')) return
    await deleteEvent(eventId)
    setMessage('Événement supprimé.')
    await loadData()
  }

  function renderEventCard (event: EventRow) {
    return (
      <EventCard
        key={event.id}
        id={event.id}
        title={event.title}
        location={event.location}
        date={eventDateLabel(event)}
        image={event.image}
        attendees={Number(event.participant_count || 0)}
        maxParticipants={event.max_participants}
        venue={event.venue}
        experienceType={event.experience_type || event.category}
        creatorName={event.creator_name}
        bookingConfirmed={event.booking_confirmed}
        participationStatus={event.participation_status || null}
        isOwner={event.creator_id === user?.id}
        loading={busyId === event.id}
        onRequest={() => void handleRequest(event.id)}
        onWithdraw={() => void handleWithdraw(event.id)}
      />
    )
  }

  return (
    <MainLayout user={user}>
      <div className='min-h-screen pb-24 md:pb-8'>
        <main className='container py-5 md:py-7'>
          <header className='flex flex-wrap items-end justify-between gap-4'>
            <div>
              <p className='text-xs font-bold uppercase text-[#ff8cc8]'>Communauté</p>
              <h1 className='mt-1 text-2xl font-black md:text-3xl'>Événements</h1>
              <p className='mt-1 text-sm text-white/60'>Proposez un moment, rencontrez les membres, gardez le contrôle des invitations.</p>
            </div>
            <Button asChild className='h-11 bg-[#ff4fa3] font-bold text-white hover:bg-[#ff6cb4]'>
              <Link href='/events/new'><Plus className='mr-2 h-4 w-4' />Proposer un événement</Link>
            </Button>
          </header>

          <nav className='mt-6 grid grid-cols-3 border-b border-white/10' aria-label='Sections événements'>
            {views.map(item => (
              <button key={item.value} type='button' onClick={() => setView(item.value)} className={`min-h-12 border-b-2 px-2 text-sm font-bold ${view === item.value ? 'border-[#ff4fa3] text-white' : 'border-transparent text-white/50 hover:text-white'}`}>
                {item.label}
              </button>
            ))}
          </nav>

          {message && <div role='status' className='mt-4 rounded-md border border-[#ff8cc8]/25 bg-[#ff4fa3]/10 px-4 py-3 text-sm text-white'>{message}</div>}

          {view === 'upcoming' && (
            <section className='mt-5'>
              <h2 className='mb-4 text-xl font-black'>Événements à venir</h2>
              <div className='flex flex-wrap items-center gap-2'>
                {[
                  ['all', 'Tous'],
                  ['jacuzzi', 'Jacuzzi'],
                  ['open_curtains', 'Rideaux ouverts']
                ].map(([value, label]) => (
                  <button key={value} type='button' onClick={() => setFormatFilter(value as FormatFilter)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${formatFilter === value ? 'border-[#ff8cc8] bg-[#ff4fa3]/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
                <a href='https://lovehotelaparis.fr/wp-json/zlhu_api/v3/rideaux_ouverts/' target='_blank' rel='noreferrer' className='ml-auto inline-flex items-center gap-2 text-sm text-[#94ffc9] underline'>
                  Voir l’agenda Rideaux ouverts <ExternalLink className='h-4 w-4' />
                </a>
                <Link href='/love-rooms' className='inline-flex items-center gap-2 text-sm text-[#ffb3d8] underline'>
                  Réserver une chambre
                </Link>
              </div>

              <div className='mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                {loading ? <LoadingEvents /> : visibleEvents.length ? visibleEvents.map(renderEventCard) : <EmptyEvents />}
              </div>
            </section>
          )}

          {view === 'owned' && (
            <section className='mt-5 space-y-5'>
              {loading ? <LoadingEvents /> : ownedEvents.length ? ownedEvents.map(event => {
                const status = statusLabels[event.publication_status || 'pending_review'] || statusLabels.pending_review
                const eventRequests = requests.filter(request => request.event_id === event.id)
                return (
                  <article key={event.id} className='rounded-lg border border-white/10 bg-white/[0.035] p-4 md:p-5'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Link href={`/events/${event.id}`} className='font-black text-white hover:text-[#ff9dce]'>{event.title}</Link>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                        </div>
                        <p className='mt-1 text-sm text-white/55'>{formatLabels[event.experience_type || ''] || 'Événement'} · {eventDateLabel(event)}</p>
                        {event.experience_type === 'open_curtains' && <p className='mt-1 text-xs text-white/55'>{event.booking_confirmed ? 'Chambre réservée' : 'Chambre à confirmer'}</p>}
                      </div>
                      <div className='flex gap-2'>
                        <Button asChild size='sm' variant='outline' className='border-white/15'><Link href={`/events/edit?id=${event.id}`}>Modifier</Link></Button>
                        <Button size='sm' variant='ghost' onClick={() => void handleDelete(event.id)} className='text-red-200'>Supprimer</Button>
                      </div>
                    </div>

                    {event.moderation_note && <p className='mt-3 rounded-md bg-black/20 p-3 text-sm text-white/65'>{event.moderation_note}</p>}

                    {event.publication_status === 'published' && (
                      <div className='mt-4 border-t border-white/10 pt-4'>
                        <h2 className='flex items-center gap-2 text-sm font-black'><UsersRound className='h-4 w-4 text-[#ffd166]' />Demandes reçues ({eventRequests.length})</h2>
                        {eventRequests.length ? (
                          <div className='mt-3 grid gap-2 md:grid-cols-2'>
                            {eventRequests.map(request => (
                              <div key={request.participation_id} className='flex items-center gap-3 rounded-md border border-white/10 bg-black/15 p-3'>
                                <Link href={`/profile/${request.requester_id}`} className='h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10'>
                                  <Image src={request.requester_avatar || '/default-avatar.png'} alt='' width={40} height={40} unoptimized className='h-full w-full object-cover' />
                                </Link>
                                <Link href={`/profile/${request.requester_id}`} className='min-w-0 flex-1 font-semibold text-white hover:text-[#ff9dce]'>{request.requester_name}</Link>
                                <Button size='sm' disabled={busyId === request.participation_id} onClick={() => void handleDecision(request.participation_id, 'accept')} className='bg-[#35c982] text-white'><Check className='h-4 w-4' /><span className='sr-only'>Accepter</span></Button>
                                <Button size='sm' variant='outline' disabled={busyId === request.participation_id} onClick={() => void handleDecision(request.participation_id, 'reject')} className='border-red-300/25 text-red-200'><X className='h-4 w-4' /><span className='sr-only'>Refuser</span></Button>
                              </div>
                            ))}
                          </div>
                        ) : <p className='mt-2 text-sm text-white/45'>Aucune demande en attente.</p>}
                      </div>
                    )}
                  </article>
                )
              }) : (
                <div className='rounded-lg border border-dashed border-white/15 p-8 text-center'>
                  <Sparkles className='mx-auto h-6 w-6 text-[#ff8cc8]' />
                  <h2 className='mt-3 text-xl font-black'>Vous n’avez pas encore proposé d’événement</h2>
                  <Button asChild className='mt-4 bg-[#ff4fa3] text-white'><Link href='/events/new'>Lancer mon premier événement</Link></Button>
                </div>
              )}
            </section>
          )}

          {view === 'participating' && (
            <section className='mt-5'>
              <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                {loading ? <LoadingEvents /> : participations.length ? participations.map(renderEventCard) : (
                  <div className='col-span-full rounded-lg border border-dashed border-white/15 p-8 text-center'>
                    <CalendarDays className='mx-auto h-6 w-6 text-[#94ffc9]' />
                    <h2 className='mt-3 text-xl font-black'>Aucune participation pour le moment</h2>
                    <Button type='button' onClick={() => setView('upcoming')} className='mt-4 bg-[#ff4fa3] text-white'>Découvrir les événements</Button>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
        <MobileNavigation />
      </div>
    </MainLayout>
  )
}

function LoadingEvents () {
  return <div className='col-span-full flex items-center gap-2 py-10 text-sm text-white/55'><Clock3 className='h-4 w-4 animate-spin' />Chargement des événements...</div>
}

function EmptyEvents () {
  return (
    <div className='col-span-full rounded-lg border border-dashed border-[#ff8cc8]/30 bg-white/[0.025] p-8 text-center'>
      <h2 className='text-xl font-black'>Aucun événement publié pour le moment</h2>
      <p className='mt-2 text-sm text-white/55'>La communauté attend peut-être votre idée.</p>
      <Button asChild className='mt-4 bg-[#ff4fa3] text-white'><Link href='/events/new'>Lancer le premier événement</Link></Button>
    </div>
  )
}
