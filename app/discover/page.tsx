'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  CalendarHeart,
  Crown,
  Heart,
  MessageCircle,
  Search,
  Sparkles,
  UsersRound,
  Wine
} from 'lucide-react'
import { AdvancedFilters, defaultFilters, FilterOptions } from '@/components/advanced-filters'
import { CommunityWall } from '@/components/community-wall'
import { CommunityFeedbackWidget } from '@/components/community-feedback-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { MobileNavigation } from '@/components/mobile-navigation'
import { useAuth } from '@/contexts/auth-context'
import { getDiscoverProfiles, getUserMatches } from '@/actions/user-actions'
import { getUpcomingEvents } from '@/actions/event-actions'

type DiscoverProfile = {
  id: string
  name: string
  age?: number
  location?: string
  image?: string
  bio?: string
  interests?: string[]
  popularity?: number
  matchScore?: number | null
  online?: boolean
}

type MatchRow = {
  id: string
  user_id_1: string
  user_id_2: string
  user1_name: string
  user1_avatar: string | null
  user2_name: string
  user2_avatar: string | null
  match_score?: number | string | null
}

type EventRow = {
  id: string
  title: string
  event_date: string
  event_time?: string
  location: string
  image?: string | null
  category?: string | null
  participant_count?: number | string
}

const jacuzziMeetupImageUrl = '/apero-jacuzzi-rencontre.jpg'
const openCurtainsImageUrl = '/rideaux-ouverts-rencontre.jpg'
const conciergerieImageUrl = '/conciergerie-service.jpg'

function profileImage (profile?: DiscoverProfile) {
  return profile?.image || '/elegant-woman-purple-glow.png'
}

function mediaImage (src: string, alt: string, className = 'h-full w-full object-cover') {
  if (src.startsWith('http')) {
    return <img src={src} alt={alt} className={className} />
  }
  return <Image src={src} alt={alt} fill className='object-cover' sizes='160px' />
}

function compatibility (profile: DiscoverProfile, index = 0) {
  if (typeof profile.matchScore === 'number') return Math.round(profile.matchScore)
  const popularity = Number(profile.popularity || 0)
  return Math.min(98, 80 + ((popularity + index * 5) % 18))
}

function eventDateLabel (value?: string) {
  if (!value) return 'Prochainement'
  return new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  })
}

export default function DiscoverPage () {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([])
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchCommunity = useCallback(
    async (currentFilters?: FilterOptions) => {
      if (!user?.id) return

      setLoading(true)
      setError(null)
      try {
        const [profileResult, matchResult, eventResult] = await Promise.all([
          getDiscoverProfiles(user.id, 1, 36, currentFilters || filters),
          getUserMatches(user.id),
          getUpcomingEvents(user.id)
        ])

        setProfiles(profileResult.profiles || [])
        setMatches((matchResult || []) as MatchRow[])
        setEvents((eventResult || []) as EventRow[])
      } catch (error) {
        console.error('Error fetching community home:', error)
        setError('Impossible de charger la communauté pour le moment.')
      } finally {
        setLoading(false)
      }
    },
    [user?.id, filters]
  )

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    fetchCommunity(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router])

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
    fetchCommunity(newFilters)
  }

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return profiles
    return profiles.filter(
      profile =>
        profile.name?.toLowerCase().includes(query) ||
        profile.location?.toLowerCase().includes(query)
    )
  }, [profiles, searchQuery])

  const onlineProfiles = filteredProfiles.filter(profile => profile.online)
  const newProfiles = filteredProfiles.slice(0, 8)
  const featuredProfiles = filteredProfiles.slice(0, 4)
  const upcomingEvents = events.slice(0, 3)
  const recentMatches = matches.slice(0, 5)

  if (isLoading) {
    return (
      <MainLayout user={user}>
        <LhrV2Shell title='Communauté' subtitle='Chargement de votre espace rencontre.' user={user}>
          <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-white/70'>
            Chargement...
          </div>
        </LhrV2Shell>
      </MainLayout>
    )
  }

  if (!user?.onboardingCompleted) {
    return (
      <MainLayout user={user}>
        <LhrV2Shell title='Complétez votre profil' subtitle='Votre profil doit être prêt avant d’entrer dans la communauté.' user={user}>
          <div className='max-w-xl rounded-2xl border border-white/10 bg-white/[0.05] p-6'>
            <p className='text-white/70'>
              Quelques informations sont nécessaires pour proposer des rencontres compatibles.
            </p>
            <Button onClick={() => router.push('/onboarding')} className='mt-5 bg-[#ff3b8b] hover:bg-[#ff62a8]'>
              Compléter mon profil
            </Button>
          </div>
        </LhrV2Shell>
      </MainLayout>
    )
  }

  return (
    <MainLayout user={user}>
      <LhrV2Shell
        user={user}
        eyebrow='Accueil connecté'
        title='Communauté'
        subtitle='Les profils actifs, les matchs, les événements et les expériences Love Rooms au même endroit.'
        action={
          <div className='flex flex-wrap items-center gap-2'>
            <AdvancedFilters onFilterChange={handleFilterChange} />
            <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'>
              <Link href='/love-rooms'>
                <Sparkles className='mr-2 h-4 w-4' />
                Love Rooms
              </Link>
            </Button>
          </div>
        }
      >
        <div className='grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_360px]'>
          <aside className='order-1 space-y-4 xl:sticky xl:top-24 xl:self-start'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <div className='flex items-center gap-3'>
                <div className='relative h-14 w-14 overflow-hidden rounded-2xl bg-white/10'>
                  {user.avatar ? (
                    user.avatar.startsWith('http') ? (
                      <img src={user.avatar} alt={user.name} className='h-full w-full object-cover' />
                    ) : (
                      <Image src={user.avatar} alt={user.name} fill className='object-cover' sizes='56px' />
                    )
                  ) : (
                    <div className='flex h-full w-full items-center justify-center bg-[#ff3b8b]/20 font-black'>
                      {user.name?.slice(0, 1) || 'L'}
                    </div>
                  )}
                </div>
                <div className='min-w-0'>
                  <h2 className='truncate font-black'>{user.name}</h2>
                  <p className='text-xs text-[#94ffc9]'>Profil actif</p>
                </div>
              </div>
              <div className='mt-5 space-y-3 text-sm'>
                <Link href='#new-profiles' className='flex justify-between rounded-xl border-b border-white/8 pb-3 transition hover:bg-white/[0.04]'>
                  <span className='text-white/58'>Nouveaux membres</span>
                  <span className='font-bold'>{newProfiles.length}</span>
                </Link>
                <Link href='/matches' className='flex justify-between rounded-xl border-b border-white/8 pb-3 transition hover:bg-white/[0.04]'>
                  <span className='text-white/58'>Vos matchs</span>
                  <span className='font-bold'>{matches.length}</span>
                </Link>
                <Link href='/events' className='flex justify-between rounded-xl transition hover:bg-white/[0.04]'>
                  <span className='text-white/58'>Événements</span>
                  <span className='font-bold'>{events.length}</span>
                </Link>
              </div>
            </div>

            <CommunityFeedbackWidget />
          </aside>

          <section className='order-3 min-w-0 space-y-5 xl:order-2 xl:col-start-2 2xl:col-start-auto'>
            <div className='grid gap-3 md:grid-cols-3'>
              <Link href='#new-profiles' className='group rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:-translate-y-0.5 hover:border-[#94ffc9]/45 hover:bg-white/[0.075]'>
                <UsersRound className='mb-3 h-5 w-5 text-[#94ffc9]' />
                <div className='text-2xl font-black'>{newProfiles.length}</div>
                <div className='text-sm text-white/56'>Nouveaux membres</div>
              </Link>
              <Link href='/matches' className='group rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:-translate-y-0.5 hover:border-[#ff8cc8]/45 hover:bg-white/[0.075]'>
                <Heart className='mb-3 h-5 w-5 text-[#ff8cc8]' />
                <div className='text-2xl font-black'>{matches.length}</div>
                <div className='text-sm text-white/56'>Vos matchs</div>
              </Link>
              <Link href='/events' className='group rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:-translate-y-0.5 hover:border-[#ffd166]/45 hover:bg-white/[0.075]'>
                <CalendarHeart className='mb-3 h-5 w-5 text-[#ffd166]' />
                <div className='text-2xl font-black'>{events.length}</div>
                <div className='text-sm text-white/56'>Événements à venir</div>
              </Link>
            </div>

            <div className='relative'>
              <Search className='absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45' />
              <Input
                type='text'
                placeholder='Rechercher un profil, une ville, une ambiance...'
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className='h-12 rounded-2xl border-white/10 bg-white/[0.06] pl-11 text-white placeholder:text-white/38 focus:border-[#ff62a8]'
              />
            </div>

            {error && (
              <div className='rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100'>
                {error}
              </div>
            )}

            <section id='new-profiles' className='scroll-mt-24'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-black'>Nouveaux membres</h2>
                <span className='text-sm text-white/52'>{loading ? 'Actualisation...' : `${newProfiles.length} profils`}</span>
              </div>
              <div className='grid gap-3 sm:grid-cols-2 2xl:grid-cols-4'>
                {newProfiles.map((profile, index) => (
                  <Link
                    key={profile.id}
                    href={`/profile/${profile.id}`}
                    className='group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] transition hover:-translate-y-0.5 hover:bg-white/[0.07]'
                  >
                    <div className='relative aspect-[4/5] bg-white/10'>
                      {mediaImage(profileImage(profile), profile.name)}
                      <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent' />
                      <div className='absolute bottom-3 left-3 right-3'>
                        <div className='text-lg font-black'>
                          {profile.name}{profile.age ? `, ${profile.age}` : ''}
                        </div>
                        <div className='text-xs text-white/66'>{compatibility(profile, index)}% compatible</div>
                      </div>
                    </div>
                    <div className='p-3'>
                      <p className='line-clamp-2 text-sm leading-5 text-white/62'>
                        {profile.bio || 'Profil disponible pour une rencontre élégante autour du Love Hotel.'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <CommunityWall currentUserId={user.id} />

            <section id='online-now' className='scroll-mt-24 rounded-2xl border border-white/10 bg-black/16 p-4'>
              <div className='mb-4 flex items-center justify-between gap-3'>
                <div>
                  <h2 className='text-xl font-black'>En ligne maintenant</h2>
                  <p className='text-sm text-white/56'>
                    {onlineProfiles.length > 0
                      ? 'Des membres disponibles pour échanger tout de suite.'
                      : 'Aucun membre vu dans les dernières minutes.'}
                  </p>
                </div>
                <Button asChild variant='outline' className='hidden border-white/12 bg-white/[0.04] sm:inline-flex'>
                  <Link href='/messages'>Messages</Link>
                </Button>
              </div>
              <div className='flex gap-3 overflow-x-auto pb-2'>
                {onlineProfiles.map((profile, index) => (
                  <Link key={profile.id} href={`/profile/${profile.id}`} className='w-[116px] shrink-0'>
                    <div className='relative h-[116px] overflow-hidden rounded-2xl bg-white/10'>
                      {mediaImage(profileImage(profile), profile.name)}
                      <span className='absolute right-2 top-2 h-3 w-3 rounded-full border-2 border-[#170321] bg-[#35e48d]' />
                    </div>
                    <div className='mt-2 truncate text-sm font-bold'>
                      {profile.name}{profile.age ? `, ${profile.age}` : ''}
                    </div>
                    <div className='truncate text-xs text-white/50'>{profile.location || 'Paris'}</div>
                  </Link>
                ))}
              </div>
            </section>

            <section className='rounded-2xl border border-[#ff8cc8]/20 bg-white/[0.045] p-4'>
              <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
                <div>
                  <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
                    Choisir son degré d’ouverture
                  </p>
                  <h2 className='mt-1 text-xl font-black'>Rencontrer, ressentir, puis décider.</h2>
                  <p className='mt-2 max-w-3xl text-sm leading-6 text-white/62'>
                    La communauté permet de passer d’un verre discret à une expérience plus ouverte, avec des rideaux fermés, entrouverts ou ouverts selon l’envie du moment.
                  </p>
                </div>
                <Button asChild size='sm' className='bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                  <Link href='/profile'>Régler mes envies</Link>
                </Button>
              </div>
              <div className='mt-4 grid gap-3 md:grid-cols-3'>
                {[
                  ['Découverte douce', 'Un verre, une Love Room privée, aucune pression.'],
                  ['Curiosité encadrée', 'Apéro jacuzzi, 3 couples maximum, règles claires.'],
                  ['Expérience assumée', 'Rideaux ouverts et soirées couples pour profils alignés.']
                ].map(([title, detail]) => (
                  <div key={title} className='rounded-2xl border border-white/10 bg-black/18 p-4'>
                    <div className='font-black'>{title}</div>
                    <div className='mt-2 text-sm leading-5 text-white/58'>{detail}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className='rounded-2xl border border-[#ff8cc8]/20 bg-[linear-gradient(135deg,rgba(255,59,139,0.18),rgba(61,17,85,0.72),rgba(10,3,18,0.94))] p-4'>
              <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
                <div className='min-w-0'>
                  <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#ff8cc8]'>
                    Expériences officielles Love Hotel
                  </p>
                  <h2 className='mt-1 text-xl font-black md:text-2xl'>
                    Un match peut devenir un rendez-vous à Pigalle ou Châtelet.
                  </h2>
                  <div className='mt-3 flex flex-wrap gap-2 text-xs font-bold'>
                    {['Love Room à l’heure', 'Jacuzzi privatif', 'Rideaux ouverts', 'Champagne'].map(label => (
                      <span key={label} className='rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-white/82'>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className='flex shrink-0 flex-wrap gap-2'>
                  <Button asChild size='sm' className='bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                    <Link href='/events/new'>Créer</Link>
                  </Button>
                  <Button asChild size='sm' variant='outline' className='border-white/12 bg-white/[0.04]'>
                    <Link href='/love-rooms'>Love Rooms</Link>
                  </Button>
                  <Button asChild size='sm' variant='outline' className='border-white/12 bg-white/[0.04]'>
                    <Link href='/events'>Agenda</Link>
                  </Button>
                </div>
              </div>
            </section>

            <section className='grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]'>
              <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-black'>Événements à venir</h2>
                  <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                    <Link href='/events'>Tout voir</Link>
                  </Button>
                </div>
                <div className='space-y-3'>
                  {upcomingEvents.length === 0 && (
                    <p className='text-sm text-white/58'>Aucun événement programmé pour le moment.</p>
                  )}
                  {upcomingEvents.map(event => (
                    <Link key={event.id} href={`/events/${event.id}`} className='flex gap-3 rounded-2xl p-2 transition hover:bg-white/8'>
                      <div className='relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-white/10'>
                        {mediaImage(event.image || '/pink-jacuzzi-night.png', event.title)}
                      </div>
                      <div className='min-w-0'>
                        <div className='text-xs font-bold uppercase tracking-[0.14em] text-[#ffd166]'>
                          {eventDateLabel(event.event_date)}
                        </div>
                        <div className='truncate font-black'>{event.title}</div>
                        <div className='truncate text-sm text-white/56'>{event.location}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className='rounded-2xl border border-[#ff8cc8]/20 bg-[linear-gradient(135deg,rgba(255,59,139,0.18),rgba(148,255,201,0.08))] p-5'>
                <Crown className='mb-4 h-6 w-6 text-[#ffd166]' />
                <h2 className='text-xl font-black'>Love Rooms</h2>
                <p className='mt-3 text-sm leading-6 text-white/66'>
                  Proposez une chambre, un verre, trois coupes ou une bouteille de champagne quand l’échange devient concret.
                </p>
                <div className='mt-5 flex flex-wrap gap-2'>
                  <Button asChild className='bg-[#ff4fa3] hover:bg-[#ff6cb4]'>
                    <Link href='/love-rooms'>Réserver</Link>
                  </Button>
                  <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                    <Link href='/messages'>Inviter un match</Link>
                  </Button>
                </div>
              </div>
            </section>
          </section>

          <aside className='order-2 xl:order-3 space-y-4 xl:col-start-2 2xl:col-start-auto 2xl:sticky 2xl:top-24 2xl:self-start'>
            <div className='overflow-hidden rounded-2xl border border-[#ff8cc8]/25 bg-[#ff3b8b]/10 shadow-xl shadow-black/20'>
              <div
                className='relative aspect-[16/11] bg-cover bg-center'
                style={{
                  backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.86), rgba(0,0,0,0.18), rgba(0,0,0,0.03)), url(${openCurtainsImageUrl})`
                }}
              >
                <img
                  src={openCurtainsImageUrl}
                  alt='Activité rencontre rideaux ouverts'
                  className='sr-only'
                />
                <div className='absolute bottom-3 left-3 right-3'>
                  <span className='rounded-full bg-[#ff3b8b] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white'>
                    RIDEAUX OUVERTS
                  </span>
                </div>
              </div>
              <div className='p-4'>
                <h2 className='text-lg font-black'>Initiation rideaux ouverts</h2>
                <p className='mt-2 text-sm leading-6 text-white/66'>
                  Une expérience progressive pour découvrir, observer puis choisir d’ouvrir davantage si tout le monde est aligné.
                </p>
                <div className='mt-4 grid gap-2'>
                  <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'>
                    <Link href='/events'>Voir les créneaux</Link>
                  </Button>
                  <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                    <Link href='/events/new'>Créer une session</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className='overflow-hidden rounded-2xl border border-[#ff8cc8]/25 bg-[#ff3b8b]/10 shadow-xl shadow-black/20'>
              <div
                className='relative aspect-[16/10] bg-cover bg-center'
                style={{
                  backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.18), rgba(0,0,0,0.02)), url(${jacuzziMeetupImageUrl})`
                }}
              >
                <img
                  src={jacuzziMeetupImageUrl}
                  alt='Apéro jacuzzi rencontre'
                  className='sr-only'
                />
                <div className='absolute bottom-3 left-3 right-3'>
                  <span className='rounded-full bg-[#ff3b8b] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white'>
                    3 couples maximum
                  </span>
                </div>
              </div>
              <div className='p-4'>
                <div className='flex items-center gap-2 font-black'>
                  <Wine className='h-4 w-4 text-[#ff8cc8]' />
                  Apéro jacuzzi rencontre
                </div>
                <p className='mt-2 text-sm leading-6 text-white/66'>
                  Champagne, spa et rencontre en petit comité pour créer une vraie opportunité entre couples.
                </p>
                <div className='mt-4 grid gap-2 sm:grid-cols-2 2xl:grid-cols-1'>
                  <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'>
                    <Link href='/events/new'>Créer un apéro jacuzzi</Link>
                  </Button>
                  <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                    <Link href='/events'>Voir les expériences</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className='overflow-hidden rounded-2xl border border-[#ffd166]/25 bg-[#ffd166]/10 shadow-xl shadow-black/20'>
              <div
                className='relative aspect-[16/12] bg-cover bg-center'
                style={{
                  backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.34), rgba(0,0,0,0.08)), url(${conciergerieImageUrl})`
                }}
              >
                <img
                  src={conciergerieImageUrl}
                  alt='Conciergerie privée Love Hotel'
                  className='sr-only'
                />
                <div className='absolute bottom-3 left-3 right-3'>
                  <span className='rounded-full bg-[#ffd166] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#210018]'>
                    Conciergerie privée
                  </span>
                </div>
              </div>
              <div className='p-4'>
                <div className='flex items-center gap-2 font-black'>
                  <Sparkles className='h-4 w-4 text-[#ffd166]' />
                  Soirée sur mesure
                </div>
                <p className='mt-2 text-sm leading-6 text-white/66'>
                  Une envie particulière autour d’une Love Room, d’un jacuzzi,
                  de rideaux ouverts ou d’une arrivée scénarisée.
                </p>
                <div className='mt-4 grid gap-2'>
                  <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'>
                    <Link href='/conciergerie'>Faire une demande</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <div className='mb-4 flex items-center justify-between gap-3'>
                <div>
                  <h2 className='font-black'>En ligne dans la communauté</h2>
                  <p className='text-xs text-white/50'>Profils actifs maintenant</p>
                </div>
                <UsersRound className='h-5 w-5 text-[#94ffc9]' />
              </div>
              <div className='space-y-3'>
                {onlineProfiles.length === 0 && (
                  <p className='text-sm text-white/58'>Aucun membre vu récemment.</p>
                )}
                {onlineProfiles.slice(0, 6).map(profile => (
                  <Link key={profile.id} href={`/profile/${profile.id}`} className='flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/8'>
                    <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white/10'>
                      {mediaImage(profileImage(profile), profile.name)}
                      <span className='absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border border-[#170321] bg-[#35e48d]' />
                    </div>
                    <div className='min-w-0'>
                      <div className='truncate font-bold'>
                        {profile.name}{profile.age ? `, ${profile.age}` : ''}
                      </div>
                      <div className='truncate text-xs text-white/50'>{profile.location || 'Paris'}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className='rounded-2xl border border-[#ffd166]/25 bg-[linear-gradient(135deg,rgba(255,209,102,0.16),rgba(255,59,139,0.12),rgba(255,255,255,0.045))] p-5'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#ffd166]'>Premium bientôt</p>
                  <h2 className='mt-1 text-xl font-black'>Club Love Hotel</h2>
                </div>
                <Crown className='h-6 w-6 shrink-0 text-[#ffd166]' />
              </div>
              <p className='mt-3 text-sm leading-6 text-white/66'>
                Standard : matchs et envois limités. Club : messages illimités après match, photos, vidéos et vocaux dans la messagerie, puis lives privés quand la modération sera prête.
              </p>
              <div className='mt-4 grid gap-2 text-sm text-white/72'>
                {[
                  'messages illimités entre membres compatibles',
                  'photos, vidéos et vocaux réservés au Club',
                  'lives privés en direct dans une prochaine étape'
                ].map(label => (
                  <div key={label} className='flex items-center gap-2 rounded-2xl border border-white/10 bg-black/16 px-3 py-2'>
                    <Sparkles className='h-3.5 w-3.5 shrink-0 text-[#ff8cc8]' />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <Button asChild variant='outline' className='mt-4 w-full border-[#ffd166]/30 bg-[#ffd166]/10 text-white hover:bg-[#ffd166]/18'>
                <Link href='/profile'>Être prévenu</Link>
              </Button>
            </div>

            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h2 className='font-black'>Suggestions compatibles</h2>
              <div className='mt-4 space-y-2'>
                {featuredProfiles.map((profile, index) => (
                  <Link key={profile.id} href={`/profile/${profile.id}`} className='flex items-center justify-between gap-3 rounded-2xl p-2 transition hover:bg-white/8'>
                    <div className='min-w-0'>
                      <div className='truncate font-bold'>{profile.name}</div>
                      <div className='text-xs text-white/50'>{compatibility(profile, index)}% compatible</div>
                    </div>
                    <ArrowUpRight className='h-4 w-4 text-white/50' />
                  </Link>
                ))}
              </div>
            </div>

            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h2 className='font-black'>Vos matchs</h2>
              <div className='mt-4 space-y-3'>
                {recentMatches.length === 0 && (
                  <p className='text-sm text-white/58'>Vos prochains matchs apparaîtront ici.</p>
                )}
                {recentMatches.map(match => {
                  const otherIsUser1 = match.user_id_1 !== user.id
                  const name = otherIsUser1 ? match.user1_name : match.user2_name
                  const avatar = otherIsUser1 ? match.user1_avatar : match.user2_avatar
                  const otherId = otherIsUser1 ? match.user_id_1 : match.user_id_2
                  return (
                    <Link key={match.id} href={`/profile/${otherId}`} className='flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/8'>
                      <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10'>
                        {mediaImage(avatar || '/purple-haze-chat.png', name || 'Match')}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='truncate font-bold'>{name}</div>
                        <div className='text-xs text-white/50'>Match confirmé</div>
                      </div>
                      <MessageCircle className='h-4 w-4 text-[#ff8cc8]' />
                    </Link>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
        <MobileNavigation />
      </LhrV2Shell>
    </MainLayout>
  )
}
