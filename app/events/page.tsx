'use client'

import { useNotifications } from '@/contexts/notification-context'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { EventCard } from '@/components/event-card'
import MainLayout from '@/components/layout/main-layout'
import {
  deleteEvent,
  getPublishedEventsForMember,
  subscribeToEvent,
  unsubscribeFromEvent
} from '@/actions/event-actions'
import { getOption } from '@/actions/user-actions'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  EMPTY_EVENTS_STATE,
  EVENT_TIME_ZONE,
  formatEventDateTime,
  isPastEvent,
  sortEventsChronologically
} from '@/lib/event-presentation'

const activeEventCategoriesFallback =
  'jacuzzi|Apéro jacuzzi 2 à 4 couples\nopen_curtains|Rideaux ouverts 2 ou 3 chambres'
const activeEventCategoryValues = new Set(['jacuzzi', 'open_curtains'])

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
    )
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

function getTodayInParis() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function isWeekendEvent(event: any) {
  const datePart = getEventDatePart(event)
  if (!datePart) return false
  const date = new Date(`${datePart}T12:00:00`)
  const day = date.getDay()
  return day === 0 || day === 6
}

function filterEvents(
  events: any[],
  filters: { period: string; type: string; venue: string }
) {
  const today = getTodayInParis()

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
      return isWeekendEvent(event)
    }

    return true
  })
}

export default function EventsPage () {
  const { markAsRead } = useNotifications()
  const { user: authUser } = useAuth()
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
    if (!authUser?.id) {
      router.replace('/login')
      return
    }

    async function fetchEventsAndCategories () {
      if (!authUser?.id) return
      setLoading(true)
      setActionError('')

      try {
        const [result, rawCategories] = await Promise.all([
          getPublishedEventsForMember(authUser.id),
          getOption('event_categories')
        ])
        setEvents(sortEventsChronologically(result))
        setCategories(parseActiveEventCategories(rawCategories))
      } catch (error) {
        setActionError("Les événements n'ont pas pu être chargés.")
      } finally {
        setLoading(false)
      }
    }

    fetchEventsAndCategories()

    const eventNotifications: string[] = []
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    eventNotifications.forEach((id: string) => {
      if (uuidRegex.test(id)) markAsRead(id)
    })
  }, [markAsRead, authUser, router])

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
      image={event.image}
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
        options.isPast ? undefined : () => handleSubscribeToggle(event)
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
      <div className='min-h-screen flex flex-col pb-16 md:pb-0'>
        <div className='container py-4 md:py-6 flex-1'>
          <header className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h1 className='text-2xl font-bold md:text-3xl'>
                Expériences Love Hotel
              </h1>
              <p className='mt-1 text-sm text-white/58'>
                Les prochaines dates, triées de la plus proche à la plus lointaine.
              </p>
            </div>
            <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>
              <Link href='/events/new'>Proposer un événement</Link>
            </Button>
          </header>

          {actionError && (
            <div className='mb-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100'>
              {actionError}
            </div>
          )}

          <section className='mb-6 space-y-4'>
            <div className='flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 md:flex-row'>
              <select
                className='w-full rounded-lg border border-white/10 bg-[#16051f] p-2 text-sm text-white'
                value={periodFilter}
                onChange={event => setPeriodFilter(event.target.value)}
                aria-label='Filtrer par date'
              >
                <option value='all'>Toutes les dates</option>
                <option value='today'>Aujourd’hui</option>
                <option value='weekend'>Ce week-end</option>
              </select>

              <select
                className='w-full rounded-lg border border-white/10 bg-[#16051f] p-2 text-sm text-white'
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
                className='w-full rounded-lg border border-white/10 bg-[#16051f] p-2 text-sm text-white'
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
                  <h2 className='text-xl font-black'>Événements à venir</h2>
                  <p className='text-sm text-white/52'>
                    {filteredUpcomingEvents.length} date{filteredUpcomingEvents.length > 1 ? 's' : ''} disponible{filteredUpcomingEvents.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {loading ? (
                  <LoadingEventCards />
                ) : filteredUpcomingEvents.length === 0 ? (
                  <EmptyEventsState />
                ) : (
                  filteredUpcomingEvents.map(event => renderEventCard(event))
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

          <section className='mb-6 rounded-xl border border-[#ff8cc8]/20 bg-white/[0.045] p-5'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
                  Créer une rencontre autour d’un lieu réel
                </p>
                <h2 className='mt-2 text-2xl font-black'>
                  De la rencontre douce à l’expérience assumée.
                </h2>
                <p className='mt-2 max-w-3xl text-sm leading-6 text-white/62'>
                  Chaque expérience part d’un cadre concret : Love Room à l’heure,
                  Jacuzzi privatif et Chambres rideaux ouverts à Pigalle ou
                  Châtelet.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button asChild className='bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                  <Link href='/love-rooms'>Réserver une Love Room</Link>
                </Button>
                <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                  <Link href='/events/new'>Proposer un événement</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className='mb-6 rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,59,139,0.12),rgba(10,3,18,0.7))] p-5'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
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
              <Button asChild className='bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                <Link href='/events/new'>Créer un format</Link>
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

        <div className='fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-6 pointer-events-none md:hidden'>
          <Link href='/events/new' className='pointer-events-auto'>
            <Button className='rounded-full bg-[#ff3b8b] px-7 py-3 text-base font-bold text-white shadow-lg hover:bg-[#ff3b8b]/90'>
              Proposer un événement
            </Button>
          </Link>
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
    <div className='col-span-full grid overflow-hidden rounded-2xl border border-[#ff8cc8]/25 bg-white/[0.035] md:grid-cols-[minmax(260px,0.85fr),minmax(0,1fr)] md:items-stretch'>
      <div className='relative min-h-56 md:min-h-72'>
        <Image
          src='/paris-event-limousine.png'
          alt='Soirée parisienne en limousine avec vue sur la tour Eiffel'
          fill
          className='object-cover'
          sizes='(max-width: 768px) 100vw, 42vw'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-[#16051f]/65 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#16051f]/35' />
      </div>
      <div className='flex flex-col justify-center p-6 md:p-8'>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
          Prochaines dates
        </p>
        <h2 className='mt-2 text-2xl font-black'>{emptyEventsTitle}</h2>
        <p className='mt-2 max-w-xl text-sm leading-6 text-white/60'>
          {EMPTY_EVENTS_STATE.description}
        </p>
        <Button asChild className='mt-5 bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>
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
