'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Hotel, Plus, UsersRound } from 'lucide-react'
import {
  deleteEvent,
  getMyEventSubmissions,
  getUpcomingEvents,
  subscribeToEvent,
  unsubscribeFromEvent
} from '@/actions/event-actions'
import { EventCard } from '@/components/event-card'
import MainLayout from '@/components/layout/main-layout'
import { MobileNavigation } from '@/components/mobile-navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useNotifications } from '@/contexts/notification-context'
import { useRouter } from 'next/navigation'

const activeEventCategoriesFallback =
  'jacuzzi|Apéro jacuzzi 2 à 4 couples\nopen_curtains|Rideaux ouverts 2 ou 3 chambres'
const activeEventCategoryValues = new Set(['jacuzzi', 'open_curtains'])

function parseActiveEventCategories(rawCategories?: string | null) {
  return (rawCategories || activeEventCategoriesFallback)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [value, label] = line.split('|')
      return value && label ? { value: value.trim(), label: label.trim() } : null
    })
    .filter((category): category is { value: string; label: string } =>
      category !== null && activeEventCategoryValues.has(category.value)
    )
}

const formats = parseActiveEventCategories().map(format => ({
  ...format,
  shortLabel: format.value === 'jacuzzi' ? 'Apéro jacuzzi' : 'Rideaux ouverts',
  image: format.value === 'jacuzzi'
    ? '/apero-jacuzzi-rencontre.jpg'
    : '/rideaux-ouverts-rencontre.jpg'
}))

type View = 'upcoming' | 'mine' | 'agenda'

export default function EventsPage () {
  const { markAsRead } = useNotifications()
  const { user } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [mySubmissions, setMySubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [view, setView] = useState<View>('upcoming')
  const [formatFilter, setFormatFilter] = useState('all')

  useEffect(() => {
    if (!user?.id) {
      router.replace('/login')
      return
    }

    async function loadEvents() {
      if (!user?.id) return
      setLoading(true)
      try {
        const [upcoming, submissions] = await Promise.all([
          getUpcomingEvents(user.id),
          getMyEventSubmissions(user.id)
        ])
        setEvents(upcoming)
        setMySubmissions(submissions)
      } finally {
        setLoading(false)
      }
    }

    void loadEvents()
    const eventNotifications: string[] = []
    eventNotifications.forEach(id => markAsRead(id))
  }, [markAsRead, router, user])

  const visibleEvents = formatFilter === 'all'
    ? events
    : events.filter(event => (event.experience_type || event.category) === formatFilter)

  async function handleSubscribeToggle(event: any) {
    if (!user?.id) return
    setActionError('')
    const currentCount = Number(event.attendees || event.participant_count || 0)

    if (event.is_participating) {
      const result = await unsubscribeFromEvent(event.id, user.id)
      if (!result.success) {
        setActionError("La désinscription n'a pas pu être enregistrée.")
        return
      }
      setEvents(current => current.map(item => item.id === event.id
        ? { ...item, is_participating: false, attendees: Math.max(0, currentCount - 1), participant_count: Math.max(0, currentCount - 1) }
        : item))
      return
    }

    const result = await subscribeToEvent(event.id, user.id)
    if (!result.success) {
      setActionError(result.error || "La participation n'a pas pu être enregistrée.")
      return
    }
    setEvents(current => current.map(item => item.id === event.id
      ? { ...item, is_participating: true, attendees: currentCount + 1, participant_count: currentCount + 1 }
      : item))
  }

  async function handleDelete(eventId: string) {
    if (!window.confirm('Supprimer cet événement ?')) return
    await deleteEvent(eventId)
    setEvents(current => current.filter(event => event.id !== eventId))
  }

  const renderEvent = (event: any) => (
    <EventCard
      key={event.id}
      id={event.id}
      title={event.title}
      location={event.location}
      date={event.event_date ? (typeof event.event_date === 'string' ? event.event_date : new Date(event.event_date).toLocaleString('fr-FR')) : ''}
      image={event.image}
      attendees={event.attendees || event.participant_count || 0}
      prix_personne_seule={event.prix_personne_seule ?? 0}
      prix_couple={event.prix_couple ?? 0}
      venue={event.venue}
      experienceType={event.experience_type}
      maxParticipants={event.max_participants}
      createdByRole={event.created_by_role}
      publicationStatus={event.publication_status}
      isParticipating={!!event.is_participating}
      onSubscribeToggle={() => handleSubscribeToggle(event)}
      creatorId={event.creator_id}
      currentUserId={user?.id}
      isAdmin={user?.role === 'admin'}
      onEdit={() => router.push(`/events/edit?id=${event.id}`)}
      onDelete={user?.role === 'admin' || event.creator_id === user?.id ? () => handleDelete(event.id) : undefined}
    />
  )

  return (
    <MainLayout user={user}>
      <div className='min-h-screen pb-20 md:pb-8'>
        <main className='container py-4 md:py-7'>
          <header className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <p className='text-xs font-bold uppercase text-[#ff8cc8]'>Communauté</p>
              <h1 className='mt-1 text-2xl font-black md:text-3xl'>Événements à venir</h1>
            </div>
            <Button asChild className='bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
              <Link href='/events/new'><Plus className='mr-2 h-4 w-4' />Créer un événement</Link>
            </Button>
          </header>

          <div className='mt-5 grid gap-3 sm:grid-cols-2'>
            {formats.map(format => (
              <button
                key={format.value}
                type='button'
                onClick={() => { setView('upcoming'); setFormatFilter(current => current === format.value ? 'all' : format.value) }}
                className={`group relative aspect-[16/5] min-h-28 overflow-hidden rounded-lg border text-left ${formatFilter === format.value ? 'border-[#ff8cc8] ring-2 ring-[#ff4fa3]/25' : 'border-white/10'}`}
              >
                <img src={format.image} alt='' className='absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]' />
                <div className='absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent' />
                <div className='absolute inset-y-0 left-0 flex max-w-[75%] flex-col justify-center p-4'>
                  <strong className='text-lg'>{format.shortLabel}</strong>
                  <span className='mt-1 text-sm text-white/75'>{format.label.replace(`${format.shortLabel} `, '')}</span>
                </div>
              </button>
            ))}
          </div>

          <nav className='mt-5 flex gap-1 overflow-x-auto border-b border-white/10' aria-label='Sections événements'>
            {[
              ['upcoming', 'À venir'],
              ['mine', `Mes propositions${mySubmissions.length ? ` (${mySubmissions.length})` : ''}`],
              ['agenda', 'Agenda Rideaux ouverts']
            ].map(([value, label]) => (
              <button key={value} type='button' onClick={() => setView(value as View)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${view === value ? 'border-[#ff4fa3] text-white' : 'border-transparent text-white/55 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </nav>

          {actionError && <div className='mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100'>{actionError}</div>}

          {view === 'upcoming' && (
            <section className='mt-5'>
              {!loading && events.length > 0 && (
                <div className='mb-4 flex flex-wrap items-center gap-3 text-sm text-white/60'>
                  <span className='flex items-center gap-1.5'><CalendarDays className='h-4 w-4 text-[#ff8cc8]' />{visibleEvents.length} à venir</span>
                  <span className='flex items-center gap-1.5'><UsersRound className='h-4 w-4 text-[#94ffc9]' />Rejoignez directement depuis la fiche</span>
                  <Button asChild variant='outline' size='sm' className='ml-auto border-white/15 bg-white/5'><Link href='/love-rooms'><Hotel className='mr-2 h-4 w-4' />Réserver une chambre</Link></Button>
                </div>
              )}
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {loading ? <p className='text-sm text-white/55'>Chargement...</p> : visibleEvents.length ? visibleEvents.map(renderEvent) : <EmptyEventsState />}
              </div>
            </section>
          )}

          {view === 'mine' && (
            <section className='mt-5'>
              <div className='mb-4 flex items-center justify-between gap-3'>
                <p className='text-sm text-white/60'>L’équipe valide les propositions des membres avant leur publication.</p>
                <Button asChild variant='outline' size='sm' className='border-white/15 bg-white/5'><Link href='/events/new'>Nouvelle proposition</Link></Button>
              </div>
              {loading ? <p className='text-sm text-white/55'>Chargement...</p> : mySubmissions.length ? (
                <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
                  {mySubmissions.map(submission => (
                    <article key={submission.id} className='rounded-lg border border-white/10 bg-white/[0.04] p-4'>
                      <div className='flex items-start justify-between gap-3'>
                        <div><strong>{submission.title}</strong><p className='mt-1 text-xs text-white/55'>{submission.venue === 'chatelet' ? 'Châtelet' : 'Pigalle'} · {submission.experience_type === 'jacuzzi' ? 'Apéro jacuzzi' : 'Rideaux ouverts'}</p></div>
                        <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${submission.publication_status === 'rejected' ? 'border-red-300/20 bg-red-500/10 text-red-200' : 'border-[#ffd166]/25 bg-[#ffd166]/10 text-[#ffe7a3]'}`}>{submission.publication_status === 'rejected' ? 'Refusé' : 'À valider'}</span>
                      </div>
                      {submission.moderation_note && <p className='mt-3 text-sm text-white/65'>{submission.moderation_note}</p>}
                    </article>
                  ))}
                </div>
              ) : (
                <div className='rounded-lg border border-dashed border-white/15 p-8 text-center'><p>Aucune proposition en attente.</p><Button asChild className='mt-4 bg-[#ff4fa3] text-white'><Link href='/events/new'>Créer mon premier événement</Link></Button></div>
              )}
            </section>
          )}

          {view === 'agenda' && (
            <section className='mt-5 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]'>
              <iframe src='https://lovehotelaparis.fr/wp-json/zlhu_api/v3/rideaux_ouverts/' title='Agenda Rideaux ouverts' className='h-[1200px] w-full border-0' />
            </section>
          )}
        </main>
        <MobileNavigation />
      </div>
    </MainLayout>
  )
}

function EmptyEventsState () {
  return (
    <div className='col-span-full rounded-lg border border-dashed border-[#ff8cc8]/30 bg-white/[0.03] p-8 text-center'>
      <h2 className='text-xl font-black'>Aucun événement dans ce format</h2>
      <p className='mt-2 text-sm text-white/60'>Proposez le premier rendez-vous à la communauté.</p>
      <Button asChild className='mt-5 bg-[#ff4fa3] text-white'><Link href='/events/new'>Créer un événement</Link></Button>
    </div>
  )
}
