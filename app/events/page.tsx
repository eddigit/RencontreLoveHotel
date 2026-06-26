'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MobileNavigation } from '@/components/mobile-navigation'
import { useNotifications } from '@/contexts/notification-context'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EventCard } from '@/components/event-card'
import MainLayout from '@/components/layout/main-layout'
import {
  getUpcomingEvents,
  subscribeToEvent,
  unsubscribeFromEvent,
  deleteEvent
} from '@/actions/event-actions'
import { getOption } from '@/actions/user-actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function isTonight (event: any) {
  if (!event.event_date) return false
  const eventDate = new Date(event.event_date)
  const now = new Date()
  return eventDate.toDateString() === now.toDateString()
}

const activeEventCategoriesFallback =
  'jacuzzi|Apéro jacuzzi 2 à 4 couples\nopen_curtains|Rideaux ouverts 2 ou 3 chambres'
const activeEventCategoryValues = new Set(['jacuzzi', 'open_curtains'])

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
  const [activeTab, setActiveTab] = useState('all')

  // Compute the correct Tailwind grid-cols class for the TabsList
  const gridColsClass =
    {
      1: 'md:grid-cols-2',
      2: 'md:grid-cols-3',
      3: 'md:grid-cols-4',
      4: 'md:grid-cols-5',
      5: 'md:grid-cols-6',
      6: 'md:grid-cols-7',
      7: 'md:grid-cols-8',
      8: 'md:grid-cols-9',
      9: 'md:grid-cols-10'
    }[categories.length + 1] || 'md:grid-cols-2'

  // Redirect if not logged in
  useEffect(() => {
    if (!authUser?.id) {
      router.replace('/login')
      return
    }

    async function fetchEventsAndCategories () {
      if (!authUser?.id) return
      setLoading(true)
      const [result, rawCategories] = await Promise.all([
        getUpcomingEvents(authUser.id),
        getOption('event_categories')
      ])
      setEvents(result)
      setCategories(parseActiveEventCategories(rawCategories))
      setLoading(false)
    }

    fetchEventsAndCategories()

    const eventNotifications: string[] = [
      // Only push real notification UUIDs here if available
    ]
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    eventNotifications.forEach((id: string) => {
      if (uuidRegex.test(id)) markAsRead(id)
    })
  }, [markAsRead, authUser, router])

  const handleSubscribeToggle = async (event: any) => {
    if (!authUser?.id) return
    setActionError('')

    if (event.is_participating) {
      const result = await unsubscribeFromEvent(event.id, authUser.id)
      if (!result.success) {
        setActionError("La désinscription n'a pas pu être enregistrée.")
        return
      }
      setEvents(
        events.map(e =>
          e.id === event.id
            ? {
                ...e,
                is_participating: false,
                attendees: Math.max(0, Number(e.attendees || e.participant_count || 0) - 1),
                participant_count: Math.max(0, Number(e.participant_count || e.attendees || 0) - 1)
              }
            : e
        )
      )
    } else {
      const result = await subscribeToEvent(event.id, authUser.id)
      if (!result.success) {
        setActionError(result.error || "La participation n'a pas pu être enregistrée.")
        return
      }
      setEvents(
        events.map(e =>
          e.id === event.id
            ? {
                ...e,
                is_participating: true,
                attendees: Number(e.attendees || e.participant_count || 0) + 1,
                participant_count: Number(e.participant_count || e.attendees || 0) + 1
              }
            : e
        )
      )
    }
  }

  const handleEdit = (eventId: string) => {
    router.push(`/events/edit?id=${eventId}`)
  }
  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Supprimer cet événement ?')) return
    await deleteEvent(eventId)
    setEvents(events.filter(e => e.id !== eventId))
  }

  return (
    <MainLayout user={authUser}>
      <div className='min-h-screen flex flex-col pb-16 md:pb-0'>
        <div className='container py-4 md:py-6 flex-1'>
          <div className='flex items-center justify-between mb-4 md:mb-6'>
            <h1 className='text-2xl md:text-3xl font-bold'>
              Expériences Love Hotel
            </h1>
            <Button asChild className='hidden bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white md:inline-flex'>
              <Link href='/events/new'>Créer une expérience</Link>
            </Button>
          </div>

          <div className='mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]'>
            <div className='rounded-2xl border border-white/10 bg-gradient-to-br from-[#3d1155]/90 via-[#5b0f46]/80 to-[#16051f] p-5 md:p-6'>
              <p className='text-sm font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>Ce soir au Love Hotel</p>
              <h2 className='mt-2 text-2xl font-black md:text-4xl'>
                De la rencontre douce à l’expérience assumée.
              </h2>
              <p className='mt-3 max-w-2xl text-white/68'>
                Les membres peuvent créer leurs expériences à Pigalle ou Châtelet : apéro jacuzzi en petit comité ou chambre à rideaux modulables. Pour la bêta, les publications sont immédiates afin de montrer le potentiel communautaire et commercial.
              </p>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <p className='text-sm font-semibold text-white/62'>Réservation et informations</p>
              <a href='tel:+33144826305' className='mt-2 block text-2xl font-black text-white underline decoration-[#ff3b8b] underline-offset-4'>
                +33 1 44 82 63 05
              </a>
              <p className='mt-3 text-sm text-white/54'>
                Une expérience peut pousser vers une chambre rideaux ouverts ou un créneau jacuzzi partagé, sans offre restaurant ni bar.
              </p>
            </div>
          </div>

          <section className='mb-6 rounded-2xl border border-[#ff8cc8]/20 bg-white/[0.045] p-5'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
                  Créer une rencontre autour d’un lieu réel
                </p>
                <h2 className='mt-2 text-2xl font-black'>
                  Love Room à l’heure, Jacuzzi privatif et Chambres rideaux ouverts.
                </h2>
                <p className='mt-2 max-w-3xl text-sm leading-6 text-white/62'>
                  Chaque expérience peut devenir une opportunité : apéro jacuzzi de 2 à 4 couples, ou rideaux ouverts dans 2 ou 3 chambres à Pigalle ou Châtelet.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button asChild className='bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                  <Link href='/love-rooms'>Réserver une Love Room</Link>
                </Button>
                <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                  <Link href='/events/new'>Créer un événement</Link>
                </Button>
              </div>
            </div>
            <div className='mt-5 grid gap-3 md:grid-cols-4'>
              {[
                ['Love Room à l’heure', '35 à 50 €/h selon chambre'],
                ['Jacuzzi privatif', '2, 3 ou 4 couples maximum'],
                ['Chambres rideaux ouverts', 'Pour rencontres assumées'],
                ['Pigalle & Châtelet', 'Deux lieux pour organiser']
              ].map(([title, detail]) => (
                <div key={title} className='rounded-2xl border border-white/10 bg-black/18 p-4'>
                  <div className='font-black'>{title}</div>
                  <div className='mt-1 text-xs text-white/52'>{detail}</div>
                </div>
              ))}
            </div>
          </section>

          <section className='mb-6 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,59,139,0.12),rgba(10,3,18,0.7))] p-5'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
                  Formats prêts à réserver
                </p>
                <h2 className='mt-2 text-2xl font-black'>Des expériences qui rassurent avant d’ouvrir le jeu.</h2>
                <p className='mt-2 max-w-3xl text-sm leading-6 text-white/62'>
                  Chaque format part d’un lieu réel disponible : jacuzzi ou chambre avec rideaux. Les participants savent le cadre avant de rejoindre.
                </p>
              </div>
              <Button asChild className='bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                <Link href='/events/new'>Créer un format</Link>
              </Button>
            </div>
            <div className='mt-5 grid gap-3 md:grid-cols-3'>
              {[
                ['Apéro jacuzzi 2 à 4 couples', 'Petit comité, spa et rencontre progressive.'],
                ['Initiation rideaux modulables', '2 chambres minimum : on commence fermé, chacun choisit d’entrouvrir ou non.'],
                ['Soirée rideaux ouverts', '2 ou 3 chambres pour profils déjà alignés sur une expérience assumée.']
              ].map(([title, detail]) => (
                <div key={title} className='rounded-2xl border border-white/10 bg-white/[0.045] p-4'>
                  <div className='font-black'>{title}</div>
                  <div className='mt-2 text-sm leading-5 text-white/58'>{detail}</div>
                </div>
              ))}
            </div>
          </section>

          {actionError && (
            <div className='mb-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100'>
              {actionError}
            </div>
          )}

          {/* Mobile category filter */}
          <div className="mb-4 md:hidden px-4">
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={activeTab}
              onChange={e => setActiveTab(e.target.value)}
            >
              <option value="all">Tous</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
              <option value="planning-rideaux-ouverts">Agenda Rideaux ouverts</option>
            </select>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='w-full'
          >
            <TabsList className={`hidden md:grid w-full ${gridColsClass} mb-4 md:mb-6`}>
              <TabsTrigger value='all'>Tous</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value='planning-rideaux-ouverts'>Agenda Rideaux ouverts</TabsTrigger>
            </TabsList>
            <TabsContent value='all' className='space-y-4 md:space-y-6'>
              {!loading && (
                <div className='grid gap-4 md:grid-cols-4'>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-4'>
                    <p className='text-xs uppercase text-white/45'>Ce soir au Love Hotel</p>
                    <p className='mt-2 text-2xl font-black'>{events.filter(isTonight).length}</p>
                  </div>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-4'>
                    <p className='text-xs uppercase text-white/45'>Apéros jacuzzi</p>
                    <p className='mt-2 text-2xl font-black'>
                      {events.filter(event => event.experience_type === 'jacuzzi').length}
                    </p>
                  </div>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-4'>
                    <p className='text-xs uppercase text-white/45'>Rideaux ouverts</p>
                    <p className='mt-2 text-2xl font-black'>
                      {events.filter(event => event.experience_type === 'open_curtains').length}
                    </p>
                  </div>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-4'>
                    <p className='text-xs uppercase text-white/45'>Créées par la communauté</p>
                    <p className='mt-2 text-2xl font-black'>
                      {events.filter(event => event.created_by_role === 'member' || !event.created_by_role).length}
                    </p>
                  </div>
                </div>
              )}
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                {loading ? (
                  <div>Chargement...</div>
                ) : events.length === 0 ? (
                  <EmptyEventsState />
                ) : (
                  events.map(event => (
                    <EventCard
                      key={event.id}
                      id={event.id}
                      title={event.title}
                      location={event.location}
                      date={
                        event.event_date
                          ? typeof event.event_date === 'string'
                            ? event.event_date
                            : new Date(event.event_date).toLocaleString('fr-FR')
                          : ''
                      }
                      image={event.image}
                      attendees={
                        event.attendees || event.participant_count || 0
                      }
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
                      currentUserId={authUser?.id}
                      isAdmin={authUser?.role === 'admin'}
                      onEdit={() => handleEdit(event.id)}
                      onDelete={
                        authUser?.role === 'admin' ||
                        event.creator_id === authUser?.id
                          ? () => handleDelete(event.id)
                          : undefined
                      }
                    />
                  ))
                )}
              </div>
            </TabsContent>
            {categories.map(cat => (
              <TabsContent
                key={cat.value}
                value={cat.value}
                className='space-y-4 md:space-y-6'
              >
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {loading ? (
                    <div>Chargement...</div>
                  ) : events.filter(event => event.category === cat.value).length === 0 ? (
                    <EmptyEventsState />
                  ) : (
                    events
                      .filter(event => event.category === cat.value)
                      .map(event => (
                        <EventCard
                          key={event.id}
                          id={event.id}
                          title={event.title}
                          location={event.location}
                          date={
                            event.event_date
                              ? typeof event.event_date === 'string'
                                ? event.event_date
                                : new Date(event.event_date).toLocaleString(
                                    'fr-FR'
                                  )
                              : ''
                          }
                          image={event.image}
                          attendees={
                            event.attendees || event.participant_count || 0
                          }
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
                          currentUserId={authUser?.id}
                          isAdmin={authUser?.role === 'admin'}
                          onEdit={() => handleEdit(event.id)}
                          onDelete={
                            authUser?.role === 'admin' ||
                            event.creator_id === authUser?.id
                              ? () => handleDelete(event.id)
                              : undefined
                          }
                        />
                      ))
                  )}
                </div>
              </TabsContent>
            ))}
            <TabsContent
              value='planning-rideaux-ouverts'
              className='space-y-4 md:space-y-6'
            >
              <div className='grid grid-cols-1'>
                <iframe
                  src='https://lovehotelaparis.fr/wp-json/zlhu_api/v3/rideaux_ouverts/'
                  title='Rideaux Ouverts'
                  className='w-full h-[1600px] border-0'
                  frameBorder='0'
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className='fixed bottom-0 left-0 right-0 flex justify-center pb-6 pointer-events-none z-40'>
          <Link href='/events/new' className='pointer-events-auto'>
            <Button className='bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white rounded-full px-8 py-3 shadow-lg text-lg font-bold'>
              Créer un évènement
            </Button>
          </Link>
        </div>
        <MobileNavigation />
      </div>
    </MainLayout>
  )
}

function EmptyEventsState () {
  return (
    <div className='col-span-full rounded-2xl border border-dashed border-[#ff8cc8]/30 bg-white/[0.035] p-8 text-center'>
      <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
        Aucun événement publié
      </p>
      <h2 className='mt-2 text-2xl font-black'>Créez la première expérience Love Hotel.</h2>
      <p className='mx-auto mt-2 max-w-xl text-sm leading-6 text-white/60'>
        Les membres et les administrateurs peuvent lancer un apéro jacuzzi,
        une rencontre rideaux ouverts dans 2 ou 3 chambres.
      </p>
      <Button asChild className='mt-5 bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>
        <Link href='/events/new'>Créer un événement</Link>
      </Button>
    </div>
  )
}
