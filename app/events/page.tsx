'use client'

import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { EventCard } from '@/components/event-card'
import MainLayout from '@/components/layout/main-layout'
import {
  deleteEvent,
  getPublishedEventsForMember,
  getUpcomingEvents,
  subscribeToEvent,
  unsubscribeFromEvent
} from '@/actions/event-actions'
import { getOption } from '@/actions/user-actions'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import {
  EMPTY_EVENTS_STATE,
  CIRCLE_EVENT_PHOTOS,
  EVENT_TIME_ZONE,
  formatEventDateTime,
  isEventInCurrentOrNextWeekend,
  isPastEvent,
  sortEventsChronologically
} from '@/lib/event-presentation'

const activeEventCategoriesFallback =
  'jacuzzi|Apéro jacuzzi 2 à 4 couples\nopen_curtains|Rideaux ouverts 2 ou 3 chambres'
const activeEventCategoryValues = new Set(['jacuzzi', 'open_curtains'])

const circleEventCategory = { value: 'libertine', label: 'Sortie du cercle' }

const venueLabels: Record<string, string> = {
  pigalle: 'Pigalle',
  chatelet: 'Châtelet'
}

const emptyEventsTitle = 'Aucun événement programmé pour le moment'

function parseActiveEventCategories(rawCategories?: string | null) {
  return (rawCategories || activeEventCategoriesFallback)
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean)
    .map((line: string) => {
      const [value, label] = line.split('|')
      return value && label
        ? { value: value.trim(), label: label.trim() }
        : null
    })
    .filter(
      (category): category is { value: string; label: string } =>
        category !== null && activeEventCategoryValues.has(category.value)
    ).concat(circleEventCategory)
}

function getEventType(event: any) {
  return event.experience_type || event.category || ''
}

function getEventDatePart(event: any) {
  if (!event.event_date) return ''
  if (event.event_date instanceof Date) {
    return event.event_date.toISOString().slice(0, 10)
  }
  return String(event.event_date).slice(0, 10)
}

function filterEvents(
  events: any[],
  filters: { period: string; type: string; venue: string }
) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

  return events.filter(event => {
    if (filters.type !== 'all' && getEventType(event) !== filters.type) {
      return false
    }

    if (filters.venue !== 'all' && event.venue !== filters.venue) {
      return false
    }

    if (filters.period === 'today') {
      return getEventDatePart(event) === today
    }

    if (filters.period === 'weekend') {
      return isEventInCurrentOrNextWeekend(event)
    }

    return true
  })
}

export default function EventsPage () {
  const { user: authUser } = useAuth()
  const memberId = authUser?.id
  const router = useRouter()

  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [categories, setCategories] = useState<
    { value: string; label: string }[]
  >([])
  const [periodFilter, setPeriodFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [venueFilter, setVenueFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    async function fetchEventsAndCategories () {
      setLoading(true)
      setActionError('')

      try {
        const [result, rawCategories] = await Promise.all([
          memberId
            ? getPublishedEventsForMember(memberId)
            : getUpcomingEvents(),
          memberId ? getOption('event_categories') : Promise.resolve(null)
        ])
        if (cancelled) return
        setEvents(sortEventsChronologically(result))
        setCategories(parseActiveEventCategories(rawCategories))
      } catch (error) {
        if (cancelled) return
        setEvents([])
        setActionError("Les événements n'ont pas pu être chargés.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchEventsAndCategories()

    return () => { cancelled = true }
  }, [memberId])

  const sortedEvents = useMemo(
    () => sortEventsChronologically(events),
    [events]
  )
  const upcomingEvents = sortedEvents.filter(event => !isPastEvent(event))
  const pastEvents = sortedEvents.filter(event => isPastEvent(event)).reverse()
  const filters = {
    period: periodFilter,
    type: typeFilter,
    venue: venueFilter
  }
  const filteredUpcomingEvents = filterEvents(upcomingEvents, filters)
  const filteredPastEvents = filterEvents(pastEvents, filters)
  const featuredEvent = filteredUpcomingEvents[0]
  const featuredAttendees = Number(
    featuredEvent?.attendees || featuredEvent?.participant_count || 0
  )
  const featuredIsFull = Boolean(
    featuredEvent?.max_participants && featuredAttendees >= Number(featuredEvent.max_participants)
  )
  const remainingUpcomingEvents = filteredUpcomingEvents.filter(
    event => event.id !== featuredEvent?.id
  )

  const handleSubscribeToggle = async (event: any) => {
    if (!authUser?.id) return
    setActionError('')

    if (event.is_participating) {
      const result = await unsubscribeFromEvent(event.id, authUser.id)
      if (!result.success) {
        setActionError("La désinscription n'a pas pu être enregistrée.")
        return
      }
      updateLocalParticipation(event.id, false)
      return
    }

    const result = await subscribeToEvent(event.id, authUser.id)
    if (!result.success) {
      setActionError(result.error || "La participation n'a pas pu être enregistrée.")
      return
    }
    updateLocalParticipation(event.id, true)
  }

  const updateLocalParticipation = (eventId: string, isJoining: boolean) => {
    setEvents(currentEvents =>
      currentEvents.map(event => {
        if (event.id !== eventId) return event

        const currentCount = Number(
          event.participant_count || event.attendees || 0
        )
        const nextCount = Math.max(0, currentCount + (isJoining ? 1 : -1))
        return {
          ...event,
          is_participating: isJoining,
          attendees: nextCount,
          participant_count: nextCount
        }
      })
    )
  }

  const handleEdit = (eventId: string) => {
    router.push(`/events/edit?id=${eventId}`)
  }

  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Supprimer cet événement ?')) return
    await deleteEvent(eventId)
    setEvents(currentEvents => currentEvents.filter(event => event.id !== eventId))
  }

  const renderEventCard = (event: any, options: { isPast?: boolean } = {}) => (
    <EventCard
      key={event.id}
      id={event.id}
      title={event.title}
      location={event.location}
      date={formatEventDateTime(event)}
      image={options.isPast ? event.image : event.image || CIRCLE_EVENT_PHOTOS.gathering}
      attendees={event.attendees || event.participant_count || 0}
      prix_personne_seule={event.prix_personne_seule ?? 0}
      prix_couple={event.prix_couple ?? 0}
      price={event.price ?? 0}
      venue={event.venue}
      experienceType={event.experience_type || event.category}
      maxParticipants={event.max_participants}
      createdByRole={event.created_by_role}
      isParticipating={!!event.is_participating}
      isPast={options.isPast}
      onSubscribeToggle={
        options.isPast || !authUser?.id ? undefined : () => handleSubscribeToggle(event)
      }
      creatorId={event.creator_id}
      currentUserId={authUser?.id}
      isAdmin={authUser?.role === 'admin'}
      onEdit={() => handleEdit(event.id)}
      onDelete={
        authUser?.role === 'admin' || event.creator_id === authUser?.id
          ? () => handleDelete(event.id)
          : undefined
      }
    />
  )

  return (
    <MainLayout user={authUser}>
      <div className='min-h-screen flex flex-col bg-[#191714] text-[#f4efe5]'>
        <div className='container py-4 md:py-6 flex-1'>
          <header className='mb-5 flex flex-col gap-4 border-b border-[#494136] pb-5 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-[#d6bc87]'>Agenda du cercle</p>
              <h1 className='mt-2 text-3xl font-semibold tracking-tight text-[#f4efe5] md:text-4xl'>Événements à venir</h1>
              <p className='mt-2 max-w-2xl text-sm leading-6 text-[#94a3b8]'>Les dates publiques et privées proposées par la communauté.</p>
            </div>
            <Button asChild className='shrink-0 bg-[#d6bc87] text-[#191714] shadow-[0_0_16px_rgba(214,188,135,0.18)] hover:bg-[#e5d1aa]'>
              <Link href={authUser?.id ? '/events/new' : '/login'}>{authUser?.id ? 'Proposer un événement' : 'Se connecter pour participer'}</Link>
            </Button>
          </header>

          <section className='mb-6 overflow-hidden rounded-2xl border border-[#d6bc87]/30 bg-[linear-gradient(135deg,rgba(214,188,135,0.12),rgba(22,24,31,1))] p-5 sm:p-6'>
            <div className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
              <div className='max-w-3xl'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-[#d6bc87]'>Offre partenaire actuelle</p>
                <h2 className='mt-2 text-2xl font-semibold text-[#f8fafc]'>Réserver au Love Hôtel</h2>
                <p className='mt-3 text-sm leading-6 text-[#c9c7c2]'>
                  Love Room, jacuzzi privatif et rideaux ouverts sont disponibles auprès de notre partenaire. Dans le cercle, vous pouvez proposer votre propre événement ou vous inscrire à une date organisée par Joug.
                </p>
              </div>
              <div className='shrink-0'>
                <Button asChild className='bg-[#d6bc87] text-[#191714] hover:bg-[#e5d1aa]'>
                  <Link href='/love-rooms?tab=reserve'>Réserver au Love Hôtel</Link>
                </Button>
              </div>
            </div>
            <div className='mt-5 border-t border-white/10 pt-5'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-[#ffb3b2]'>Objectif janvier 2027</p>
              <p className='mt-2 max-w-3xl text-sm leading-6 text-[#c9c7c2]'>
                Nous préparons des rencontres dans des restaurants, clubs, théâtres et lieux privés. Les adresses, les dates et les codes promotionnels réservés aux membres seront annoncés ici à mesure de leur confirmation.
              </p>
            </div>
          </section>

          {actionError && (
            <div className='mb-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100'>
              {actionError}
            </div>
          )}

          <section className='mb-6 space-y-6'>
            {!loading && featuredEvent && (
              <article className='grid overflow-hidden rounded-2xl border border-[#494136] bg-[#191714] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.55)] lg:grid-cols-[minmax(0,1.1fr),minmax(360px,0.9fr)]'>
                <div className='relative min-h-64 lg:min-h-[360px]'>
                  <Image src={featuredEvent.image || CIRCLE_EVENT_PHOTOS.gathering} alt={featuredEvent.title} fill priority sizes='(min-width: 1024px) 52vw, 100vw' className='object-cover' />
                  <div className='absolute inset-0 bg-gradient-to-t from-[#0d0e13] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#16181f]' />
                  <p className='absolute left-4 top-4 rounded-md border border-[#494136] bg-[#191714]/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#d6bc87] backdrop-blur'>Date la plus proche</p>
                </div>
                <div className='flex flex-col justify-center p-6 sm:p-8'>
                  <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#d6bc87]'>{getEventType(featuredEvent) ? categories.find(category => category.value === getEventType(featuredEvent))?.label || getEventType(featuredEvent) : 'Événement'}</p>
                  <h2 className='mt-3 text-2xl font-semibold leading-tight text-[#f4efe5]'>{featuredEvent.title}</h2>
                  <div className='mt-5 space-y-2 text-sm text-[#94a3b8]'>
                    <p className='flex items-center gap-2'><CalendarDays className='h-4 w-4 text-[#d6bc87]' />{formatEventDateTime(featuredEvent)}</p>
                    {featuredEvent.location && <p className='flex items-center gap-2'><MapPin className='h-4 w-4 text-[#d6bc87]' />{featuredEvent.location}</p>}
                    <p className='flex items-center gap-2'><Users className='h-4 w-4 text-[#d6bc87]' />{featuredAttendees} participant{featuredAttendees > 1 ? 's' : ''}</p>
                  </div>
                  <div className='mt-6 flex flex-wrap gap-3'>
                    <Button asChild className='bg-[#d6bc87] text-[#191714] hover:bg-[#e5d1aa]'><Link href={`/events/${featuredEvent.id}`}>Voir l’événement</Link></Button>
                    {authUser?.id && <Button variant='outline' className='border-[#3b4257] bg-[#1e222d] text-[#f8fafc] hover:bg-[#34343a] hover:text-white' onClick={() => handleSubscribeToggle(featuredEvent)} disabled={featuredIsFull && !featuredEvent.is_participating}>{featuredEvent.is_participating ? 'Se désinscrire' : featuredIsFull ? 'Complet' : 'Participer'}</Button>}
                    {(authUser?.role === 'admin' || (memberId && featuredEvent.creator_id === memberId)) && <>
                      <Button variant='outline' onClick={() => handleEdit(featuredEvent.id)}>Modifier</Button>
                      <Button variant='destructive' onClick={() => handleDelete(featuredEvent.id)}>Supprimer</Button>
                    </>}
                  </div>
                </div>
              </article>
            )}

            {!loading && !actionError && upcomingEvents.length === 0 && <EmptyEventsState />}

            <div className='flex flex-col gap-3 rounded-xl border border-[#2b3040] bg-[#16181f] p-3 md:flex-row'>
              <select
                className='w-full rounded-lg border border-[#2b3040] bg-[#1e222d] p-2 text-sm text-[#f8fafc]'
                value={periodFilter}
                onChange={event => setPeriodFilter(event.target.value)}
                aria-label='Filtrer par date'
              >
                <option value='all'>Toutes les dates</option>
                <option value='today'>Aujourd’hui</option>
                <option value='weekend'>Ce week-end</option>
              </select>

              <select
                className='w-full rounded-lg border border-[#2b3040] bg-[#1e222d] p-2 text-sm text-[#f8fafc]'
                value={typeFilter}
                onChange={event => setTypeFilter(event.target.value)}
                aria-label="Filtrer par type d'expérience"
              >
                <option value='all'>Tous les formats</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>

              <select
                className='w-full rounded-lg border border-[#2b3040] bg-[#1e222d] p-2 text-sm text-[#f8fafc]'
                value={venueFilter}
                onChange={event => setVenueFilter(event.target.value)}
                aria-label='Filtrer par lieu'
              >
                <option value='all'>Tous les lieux</option>
                {Object.entries(venueLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className='mb-3 flex items-end justify-between gap-3'>
                <div>
                  <h2 className='text-xl font-semibold text-[#f8fafc]'>Les prochaines dates</h2>
                  <p className='text-sm text-[#94a3b8]'>
                    {filteredUpcomingEvents.length} date{filteredUpcomingEvents.length > 1 ? 's' : ''} disponible{filteredUpcomingEvents.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
                {loading ? (
                  <LoadingEventCards />
                ) : !upcomingEvents.length ? null : remainingUpcomingEvents.length === 0 ? (
                  <div className='col-span-full rounded-xl border border-dashed border-[#3b4257] p-6 text-sm text-[#94a3b8]'>
                    {featuredEvent ? 'La prochaine date est mise à l’honneur ci-dessus.' : 'Aucune date ne correspond aux filtres.'}
                  </div>
                ) : (
                  remainingUpcomingEvents.map(event => renderEventCard(event))
                )}
              </div>
            </div>

            {!loading && pastEvents.length > 0 && (
              <details className='rounded-xl border border-white/10 bg-white/[0.035] p-4'>
                <summary className='cursor-pointer text-lg font-black'>
                  Événements passés
                </summary>
                <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                  {filteredPastEvents.length === 0 ? (
                    <div className='col-span-full text-sm text-white/58'>
                      Aucun ancien événement ne correspond aux filtres.
                    </div>
                  ) : (
                    filteredPastEvents.map(event =>
                      renderEventCard(event, { isPast: true })
                    )
                  )}
                </div>
              </details>
            )}
          </section>

          {!loading && (
            <section className='mb-6 grid gap-3 md:grid-cols-4'>
              <StatCard
                label='Apéros jacuzzi'
                value={upcomingEvents.filter(event => getEventType(event) === 'jacuzzi').length}
              />
              <StatCard
                label='Rideaux ouverts'
                value={upcomingEvents.filter(event => getEventType(event) === 'open_curtains').length}
              />
              <StatCard
                label='Créées par la communauté'
                value={upcomingEvents.filter(event => event.created_by_role === 'member' || !event.created_by_role).length}
              />
              <StatCard label='Passés archivés' value={pastEvents.length} />
            </section>
          )}

          <section className='mb-6 rounded-2xl border border-[#2b3040] bg-[#16181f] p-5 sm:p-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-[#ffb3b2]'>Initiative des membres</p>
                <h2 className='mt-2 text-2xl font-semibold text-[#f8fafc]'>De la rencontre douce à l’expérience assumée.</h2>
                <p className='mt-2 max-w-3xl text-sm leading-6 text-[#94a3b8]'>Créer une rencontre autour d’un lieu réel : Love Room à l’heure, Jacuzzi privatif et Chambres rideaux ouverts. Le formulaire existant permet de préciser le format, le lieu et les conditions de participation avant publication.</p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button asChild className='bg-[#d6bc87] text-[#191714] hover:bg-[#e5d1aa]'><Link href={authUser?.id ? '/events/new' : '/login'}>Créer un événement</Link></Button>
                <Button asChild variant='outline' className='border-[#3b4257] bg-[#1e222d] text-[#f8fafc] hover:bg-[#34343a] hover:text-white'><Link href='/love-rooms'>Réserver une Love Room</Link></Button>
              </div>
            </div>
          </section>

          <section className='mb-6'>
            <div className='mb-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-[#ffb3b2]'>Lieux & séjours</p>
              <h2 className='mt-2 text-2xl font-semibold text-[#f8fafc]'>Préparer votre prochaine sortie</h2>
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <Link href='/lieux' className='group rounded-2xl border border-[#2b3040] bg-[#16181f] p-5 transition hover:border-[#d6bc87]/60 hover:bg-[#1e222d]'>
                <p className='text-sm font-semibold text-[#f8fafc]'>Découvrir les lieux</p>
                <p className='mt-2 text-sm leading-6 text-[#94a3b8]'>Retrouvez les lieux référencés avant de proposer ou rejoindre une rencontre.</p>
                <span className='mt-4 inline-block text-sm font-semibold text-[#ffb3b2] group-hover:text-white'>Voir les lieux →</span>
              </Link>
              <Link href='/love-rooms' className='group rounded-2xl border border-[#2b3040] bg-[#16181f] p-5 transition hover:border-[#d6bc87]/60 hover:bg-[#1e222d]'>
                <p className='text-sm font-semibold text-[#f8fafc]'>Explorer les Love Rooms</p>
                <p className='mt-2 text-sm leading-6 text-[#94a3b8]'>Consultez les disponibilités et les détails des Love Rooms proposées sur LHR.</p>
                <span className='mt-4 inline-block text-sm font-semibold text-[#ffb3b2] group-hover:text-white'>Voir les Love Rooms →</span>
              </Link>
            </div>
          </section>

          <section className='mb-6 rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(214,188,135,0.07),rgba(22,24,31,1))] p-5'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ffb3b2]'>
                  Formats disponibles
                </p>
                <h2 className='mt-2 text-2xl font-black'>
                  Des expériences lisibles avant de rejoindre.
                </h2>
                <p className='mt-2 max-w-3xl text-sm leading-6 text-white/62'>
                  Le format, le lieu, l’heure, le prix et les places restantes
                  sont visibles directement sur chaque carte.
                </p>
              </div>
              <Button asChild className='bg-[#d6bc87] text-[#191714] hover:bg-[#e5d1aa]'>
                <Link href={authUser?.id ? '/events/new' : '/login'}>Créer un format</Link>
              </Button>
            </div>
            <div className='mt-5 grid gap-3 md:grid-cols-3'>
              {[
                ['Apéro jacuzzi 2 à 4 couples', 'Petit comité, spa et rencontre progressive.'],
                ['Initiation rideaux modulables', '2 chambres minimum : chacun choisit son niveau d’ouverture.'],
                ['Soirée rideaux ouverts', '2 ou 3 chambres pour profils déjà alignés.']
              ].map(([title, detail]) => (
                <div key={title} className='rounded-xl border border-white/10 bg-white/[0.045] p-4'>
                  <div className='font-black'>{title}</div>
                  <div className='mt-2 text-sm leading-5 text-white/58'>{detail}</div>
                </div>
              ))}
            </div>
          </section>

          <details className='rounded-xl border border-white/10 bg-white/[0.035] p-4'>
            <summary className='cursor-pointer font-black'>Agenda Rideaux ouverts</summary>
            <iframe
              src='https://lovehotelaparis.fr/wp-json/zlhu_api/v3/rideaux_ouverts/'
              title='Rideaux Ouverts'
              className='mt-4 h-[1200px] w-full border-0'
            />
          </details>
        </div>

      </div>
    </MainLayout>
  )
}

function LoadingEventCards () {
  return (
    <>
      {[0, 1, 2].map(index => (
        <div
          key={index}
          className='h-[360px] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]'
        />
      ))}
    </>
  )
}

function EmptyEventsState () {
  return (
    <div className='col-span-full grid overflow-hidden rounded-2xl border border-[#2b3040] bg-[#16181f] md:grid-cols-[minmax(260px,0.85fr),minmax(0,1fr)] md:items-stretch'>
      <div className='relative min-h-56 md:min-h-72'>
        <Image
          src={CIRCLE_EVENT_PHOTOS.masquerade}
          alt='Illustration de soirée masquée'
          fill
          className='object-cover'
          sizes='(max-width: 768px) 100vw, 42vw'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-[#121318]/65 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#121318]/35' />
      </div>
      <div className='flex flex-col justify-center p-6 md:p-8'>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ffb3b2]'>
          Prochaines dates
        </p>
        <h2 className='mt-2 text-2xl font-black'>{emptyEventsTitle}</h2>
        <p className='mt-2 max-w-xl text-sm leading-6 text-white/60'>
          {EMPTY_EVENTS_STATE.description}
        </p>
        <Button asChild className='mt-5 bg-[#d6bc87] text-[#191714] hover:bg-[#e5d1aa]'>
          <Link href='/events/new'>{EMPTY_EVENTS_STATE.cta}</Link>
        </Button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-xl border border-white/10 bg-white/[0.045] p-4'>
      <p className='text-xs uppercase text-white/45'>{label}</p>
      <p className='mt-2 text-2xl font-black'>{value}</p>
    </div>
  )
}
