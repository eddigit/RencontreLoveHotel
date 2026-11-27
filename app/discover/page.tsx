'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowUpRight,
  CalendarHeart,
  ChevronDown,
  RefreshCw,
  Search
} from 'lucide-react'
import { AdvancedFilters, defaultFilters, FilterOptions } from '@/components/advanced-filters'
import { CommunityWall } from '@/components/community-wall'
import { CommunityFeedbackWidget } from '@/components/community-feedback-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MemberReferralLink } from '@/components/member-referral-link'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import { CircleAgendaWeek } from '@/components/circle-agenda-week'
import { CircleActivityCards } from '@/components/circle-activity-cards'
import type { ConversationSummary } from '@/lib/member-relationship-service'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { useNotifications } from '@/contexts/notification-context'
import { getOnlineCommunityMembers, recordProfileImpressions } from '@/actions/user-actions'
import { getCommunityHome } from '@/actions/community-home'
import { PRESENCE_HEARTBEAT_MS } from '@/lib/presence-config'
import { defaultMemberImage } from '@/lib/default-member-image'
import {
  discoverySnapshotKey,
  orderProfilesFromSnapshot
} from '@/lib/discovery-session-state'
import { rotateDiscoveryBatchWithPhotoPriority } from '@/lib/discovery-ranking'

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
  is_current_user?: boolean
  created_at?: string | Date | null
  status?: string | null
  gender?: string | null
  preferences?: {
    status?: string | null
    gender?: string | null
  } | null
}

type MatchRow = {
  id: string
  user_id_1: string
  user_id_2: string
  user1_name: string
  user1_avatar: string | null
  user1_online?: boolean
  user2_name: string
  user2_avatar: string | null
  user2_online?: boolean
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

type CommunityMemberStats = {
  totalMembers: number
  newMembersLast24h: number
}

function isDiscoverStatus(value: string | null): value is FilterOptions['status'] {
  return value === 'all' || value === 'single' || value === 'couple' || value === 'trans'
}

function isDiscoverOrientation(value: string | null): value is FilterOptions['orientation'] {
  return value === 'all' || value === 'hetero' || value === 'homo' || value === 'bi'
}

function isDiscoverCurtainPreference(value: string | null): value is FilterOptions['curtainPreference'] {
  return value === 'all' || value === 'open' || value === 'closed'
}

function discoverFiltersFromSearchParams(searchParams: URLSearchParams): FilterOptions {
  const ageMin = Number(searchParams.get('ageMin') || defaultFilters.ageRange[0])
  const ageMax = Number(searchParams.get('ageMax') || defaultFilters.ageRange[1])
  const distance = Number(searchParams.get('distance') || defaultFilters.distance)
  const status = searchParams.get('status')
  const orientation = searchParams.get('orientation')
  const curtainPreference = searchParams.get('curtainPreference')
  const meetingTypes = new Set((searchParams.get('meetingTypes') || '').split(',').filter(Boolean))

  return {
    ageRange: [
      Number.isFinite(ageMin) ? Math.max(18, Math.min(80, Math.floor(ageMin))) : defaultFilters.ageRange[0],
      Number.isFinite(ageMax) ? Math.max(18, Math.min(80, Math.floor(ageMax))) : defaultFilters.ageRange[1]
    ],
    distance: Number.isFinite(distance) ? Math.max(5, Math.min(100, Math.floor(distance))) : defaultFilters.distance,
    onlineOnly: searchParams.get('onlineOnly') === 'true',
    status: isDiscoverStatus(status) ? status : defaultFilters.status,
    orientation: isDiscoverOrientation(orientation) ? orientation : defaultFilters.orientation,
    meetingTypes: {
      friendly: meetingTypes.has('friendly'),
      romantic: meetingTypes.has('romantic'),
      playful: meetingTypes.has('playful'),
      openCurtains: meetingTypes.has('openCurtains'),
      libertine: meetingTypes.has('libertine')
    },
    curtainPreference: isDiscoverCurtainPreference(curtainPreference)
      ? curtainPreference
      : defaultFilters.curtainPreference
  }
}

function discoverBatchFromSearchParams(searchParams: URLSearchParams) {
  const batch = Number(searchParams.get('batch') || 0)
  return Number.isFinite(batch) ? Math.max(0, Math.floor(batch)) : 0
}

function discoverSearchFromSearchParams(searchParams: URLSearchParams) {
  return searchParams.get('q') || ''
}

function writeDiscoverUrlState(
  router: ReturnType<typeof useRouter>,
  filters: FilterOptions,
  search: string,
  batch: number
) {
  const params = new URLSearchParams()
  const activeMeetingTypes = Object.entries(filters.meetingTypes)
    .filter(([, active]) => active)
    .map(([key]) => key)
  const trimmedSearch = search.trim()

  if (trimmedSearch) params.set('q', trimmedSearch)
  if (batch > 0) params.set('batch', String(batch))
  if (filters.onlineOnly) params.set('onlineOnly', 'true')
  if (filters.status !== defaultFilters.status) params.set('status', filters.status)
  if (filters.orientation !== defaultFilters.orientation) params.set('orientation', filters.orientation)
  if (filters.curtainPreference !== defaultFilters.curtainPreference) params.set('curtainPreference', filters.curtainPreference)
  if (filters.ageRange[0] !== defaultFilters.ageRange[0]) params.set('ageMin', String(filters.ageRange[0]))
  if (filters.ageRange[1] !== defaultFilters.ageRange[1]) params.set('ageMax', String(filters.ageRange[1]))
  if (filters.distance !== defaultFilters.distance) params.set('distance', String(filters.distance))
  if (activeMeetingTypes.length > 0) params.set('meetingTypes', activeMeetingTypes.join(','))

  const query = params.toString()
  router.replace(query ? `/discover?${query}` : '/discover', { scroll: false })
}

function profileImage (profile?: DiscoverProfile) {
  return defaultMemberImage(profile || {})
}

function mediaImage (src: string, alt: string, className = 'h-full w-full object-cover') {
  if (src.startsWith('http')) {
    return <img src={src} alt={alt} className={className} />
  }
  return <Image src={src} alt={alt} fill className='object-cover' sizes='160px' />
}

function eventDateLabel (value?: string) {
  if (!value) return 'Prochainement'
  return new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  })
}

function formatCount (value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

export default function DiscoverPage () {
  const { user, isLoading } = useAuth()
  const { counts } = useNotifications()
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamString = searchParams.toString()
  const initialSearchParams = new URLSearchParams(searchParamString)
  const [filters, setFilters] = useState<FilterOptions>(() => discoverFiltersFromSearchParams(initialSearchParams))
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([])
  const [onlineMembers, setOnlineMembers] = useState<DiscoverProfile[]>([])
  const [threads, setThreads] = useState<ConversationSummary[] | null>(null)
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [memberStats, setMemberStats] = useState<CommunityMemberStats>({
    totalMembers: 0,
    newMembersLast24h: 0
  })
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(() => discoverSearchFromSearchParams(initialSearchParams))
  const [profileBatch, setProfileBatch] = useState(() => discoverBatchFromSearchParams(initialSearchParams))
  const [preparingProfiles, setPreparingProfiles] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const communityRequest = useRef(0)
  const localBatchNavigationRef = useRef<number | null>(null)

  const saveProfileOrder = (
    profilesToSave: DiscoverProfile[],
    currentFilters: FilterOptions,
    currentSearch: string,
    batch: number
  ) => {
    const key = discoverySnapshotKey(
      String(user?.id || ''),
      currentFilters,
      currentSearch,
      batch
    )
    try {
      window.sessionStorage.setItem(
        key,
        JSON.stringify(profilesToSave.map(profile => profile.id))
      )
    } catch {
      // Session storage is optional; discovery still works when it is unavailable.
    }
  }

  const restoreProfileOrder = (
    resultProfiles: DiscoverProfile[],
    currentFilters: FilterOptions,
    currentSearch: string,
    batch: number
  ) => {
    const key = discoverySnapshotKey(
      String(user?.id || ''),
      currentFilters,
      currentSearch,
      batch
    )
    try {
      const storedIds = JSON.parse(window.sessionStorage.getItem(key) || '[]')
      const orderedProfiles = Array.isArray(storedIds)
        ? orderProfilesFromSnapshot(resultProfiles, storedIds)
        : resultProfiles
      saveProfileOrder(orderedProfiles, currentFilters, currentSearch, batch)
      return orderedProfiles
    } catch {
      return resultProfiles
    }
  }

  const fetchCommunity = useCallback(
    async (currentFilters?: FilterOptions, batch = 0, currentSearch = '') => {
      if (!user?.id) return

      const request = ++communityRequest.current
      setLoading(true)
      setError(null)
      try {
        const resolvedFilters = currentFilters || filters
        const [profileResult, onlineResult, matchResult, eventResult, statsResult, threadResult] = await getCommunityHome(resolvedFilters, batch)
        if (request !== communityRequest.current) return

        const restoredProfiles = restoreProfileOrder(
          profileResult.profiles || [],
          resolvedFilters,
          currentSearch,
          batch
        )
        setProfiles(restoredProfiles)
        void recordProfileImpressions(
          user.id,
          restoredProfiles.slice(0, 12).map((profile: DiscoverProfile) => profile.id),
          batch
        )
        setOnlineMembers((onlineResult || []) as DiscoverProfile[])
        setMatches((matchResult || []) as MatchRow[])
        setEvents((eventResult || []) as EventRow[])
        setMemberStats(statsResult)
        setThreads(threadResult ?? null)
      } catch (error) {
        if (request !== communityRequest.current) return
        console.error('Error fetching community home:', error)
        setError('Impossible de charger la communauté pour le moment.')
      } finally {
        if (request === communityRequest.current) {
          setLoading(false)
          setPreparingProfiles(false)
        }
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
    const restoredSearchParams = new URLSearchParams(searchParamString)
    const restoredFilters = discoverFiltersFromSearchParams(restoredSearchParams)
    const restoredSearch = discoverSearchFromSearchParams(restoredSearchParams)
    const restoredBatch = discoverBatchFromSearchParams(restoredSearchParams)
    if (localBatchNavigationRef.current === restoredBatch) {
      localBatchNavigationRef.current = null
      setProfileBatch(restoredBatch)
      setPreparingProfiles(false)
      return
    }
    localBatchNavigationRef.current = null
    setFilters(restoredFilters)
    setSearchQuery(restoredSearch)
    setProfileBatch(restoredBatch)
    void fetchCommunity(restoredFilters, restoredBatch, restoredSearch)
    return () => { communityRequest.current += 1 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router, searchParamString])

  useEffect(() => {
    if (!user?.id) return

    const refreshOnlineMembers = async () => {
      const result = await getOnlineCommunityMembers()
      setOnlineMembers((result || []) as DiscoverProfile[])
    }

    const interval = window.setInterval(refreshOnlineMembers, PRESENCE_HEARTBEAT_MS)
    return () => window.clearInterval(interval)
  }, [user?.id])

  useEffect(() => {
    if (window.location.hash === '#boite-a-idees') setFeedbackOpen(true)
  }, [])

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
    setProfileBatch(0)
    writeDiscoverUrlState(router, newFilters, searchQuery, 0)
  }

  const showAnotherBatch = () => {
    if (
      !user?.id ||
      preparingProfiles ||
      localBatchNavigationRef.current !== null ||
      profiles.length <= 12
    ) return

    const nextBatch = profileBatch + 1
    const nextProfiles = rotateDiscoveryBatchWithPhotoPriority(profiles, 1, 12)
    setPreparingProfiles(true)
    setError(null)
    try {
      localBatchNavigationRef.current = nextBatch
      setProfiles(nextProfiles)
      setProfileBatch(nextBatch)
      saveProfileOrder(nextProfiles, filters, searchQuery, nextBatch)
      writeDiscoverUrlState(router, filters, searchQuery, nextBatch)
      void recordProfileImpressions(
        user.id,
        nextProfiles.slice(0, 12).map(profile => profile.id),
        nextBatch
      )
    } catch (error) {
      console.error('Error loading another profile batch:', error)
      setError("Impossible de charger d'autres profils pour le moment.")
      localBatchNavigationRef.current = null
    } finally {
      setPreparingProfiles(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    writeDiscoverUrlState(router, filters, value, profileBatch)
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

  const newProfiles = [...filteredProfiles].slice(0, 12)
  const upcomingEvents = events.slice(0, 3)
  const totalMembersLabel = memberStats.totalMembers > 0 ? formatCount(memberStats.totalMembers) : '...'
  const newProfilesSummary = memberStats.totalMembers > 0
    ? `${newProfiles.length} profils proposés parmi ${totalMembersLabel} membres.`
    : `${newProfiles.length} profils proposés.`
  if (isLoading) {
    return (
      <MainLayout user={user}>
        <LhrV2Shell title='Communauté' subtitle='Chargement de votre espace rencontre.' user={user}>
          <div className='rounded-2xl border border-[#41454b] bg-[#04070b] p-8 text-[#c9c7c2]'>
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
          <div className='max-w-xl rounded-2xl border border-[#41454b] bg-[#04070b] p-6 text-[#ecebe7]'>
            <p className='text-[#c9c7c2]'>
              Quelques informations sont nécessaires pour proposer des rencontres compatibles.
            </p>
            <Button onClick={() => router.push('/onboarding')} className='mt-5 bg-[#c1121f] text-white hover:bg-[#c1121f]'>
              Compléter mon profil
            </Button>
          </div>
        </LhrV2Shell>
      </MainLayout>
    )
  }

  return (
    <MainLayout user={user}>
      <div className='mx-auto min-h-screen w-full max-w-[1540px] bg-[#121318] px-3 pb-8 pt-3 text-[#e3e1e9] sm:px-5 lg:px-7'>
          <h1 className='sr-only'>Mon cercle</h1>
          <div className='mb-3 flex gap-4 text-sm text-[#ffb3b2] xl:hidden'>
            <Link href='#agenda-du-cercle'>Présence et agenda ↓</Link>
            <Link href='#boite-a-idees'>Boîte à idées</Link>
          </div>
          <div className='grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,30%)]'>
            <div className='min-w-0 space-y-5'>
              <section aria-label='Mur de la communauté' className='min-w-0'>
                <CommunityWall currentUserId={user.id} currentUserName={user.name} currentUserAvatar={user.avatar} betweenComposerAndFeed={
                  <CircleActivityCards
                    threads={threads}
                    loading={loading}
                    unread={counts.messages}
                    matches={matches.slice(0, 3).map(match => {
                      const first = match.user_id_1 !== user.id
                      return {
                        id: first ? match.user_id_1 : match.user_id_2,
                        name: (first ? match.user1_name : match.user2_name) || 'Membre',
                        avatar: first ? match.user1_avatar : match.user2_avatar
                      }
                    })}
                  />
                } />
              </section>

              <section id='new-profiles' className='scroll-mt-24'>
                <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#ecebe7]'>Découvrir</p>
                    <h2 className='mt-1 text-lg font-black'>Profils à découvrir</h2>
                    <p className='mt-1 text-sm leading-5 text-[#c9c7c2]'>{newProfilesSummary}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <AdvancedFilters value={filters} onFilterChange={handleFilterChange} />
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      aria-label='Découvrir d’autres profils'
                      onClick={showAnotherBatch}
                      disabled={loading || preparingProfiles || profiles.length <= 12}
                      className='border-white/[0.07] bg-[#1a1b21] text-[#ecebe7] hover:bg-[#1a1b21]'
                    >
                      <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
                      {preparingProfiles ? 'Actualisation...' : 'Autres'}
                    </Button>
                  </div>
                </div>
                <div className='relative mb-3'>
                  <Search className='absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c9c7c2]' />
                  <Input
                    type='text'
                    placeholder='Rechercher un profil, une ville, une ambiance...'
                    value={searchQuery}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    className='h-12 rounded-xl border-white/[0.07] bg-[#1a1b21] pl-11 text-[#ecebe7] placeholder:text-[#c9c7c2] focus:border-[#ffb3b2]'
                  />
                </div>
                {error && (
                  <div className='rounded-xl border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-100'>
                    {error}
                  </div>
                )}
                <div className='mb-3 flex flex-wrap items-center justify-between gap-2 text-sm'>
                  <span className='text-[#c9c7c2]'>{loading ? 'Actualisation...' : `${newProfiles.length} affichés`}</span>
                  <Link
                    href='/members'
                    className='inline-flex items-center gap-1 font-bold text-[#ecebe7] hover:text-[#ffb3b2]'
                  >
                    Recherche détaillée <ArrowUpRight className='h-4 w-4' />
                  </Link>
                </div>
                <div className='grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2'>
                  {newProfiles.map((profile) => (
                    <Link
                      key={profile.id}
                      href={`/profile/${profile.id}`}
                      className='group flex min-w-0 flex-col items-center gap-2 overflow-hidden text-center rounded-xl border border-white/[0.07] bg-[#1a1b21] p-2 transition hover:border-[#ffb3b2]'
                    >
                      <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/10'>
                        {mediaImage(profileImage(profile), profile.name)}
                        {profile.online && (
                          <span
                            aria-label='En ligne'
                            className='absolute right-1 top-1 h-2.5 w-2.5 rounded-full border border-[#170321] bg-[#35e48d]'
                          />
                        )}
                      </div>
                      <div className='w-full min-w-0'>
                        <div className='truncate text-sm font-black'>
                          {profile.name}
                          {profile.age ? `, ${profile.age}` : ''}
                        </div>
                        <div className='truncate text-xs text-[#c9c7c2]'>
                          {profile.location || profile.bio || 'Voir le profil'}
                        </div>
                        {typeof profile.matchScore === 'number' && (
                          <div className='mt-0.5 text-xs text-[#ffb3b2]'>{Math.round(profile.matchScore)}% compatible</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <MemberReferralLink />
              <section id='boite-a-idees' className='scroll-mt-24 rounded-xl border border-white/[0.07] bg-[#1a1b21]'>
                <button
                  type='button'
                  onClick={() => setFeedbackOpen((open) => !open)}
                  aria-expanded={feedbackOpen}
                  className='flex w-full items-center justify-between gap-4 p-4 text-left'
                >
                  <span>
                    <span className='block font-black'>Une idée ou un problème à signaler ?</span>
                    <span className='mt-0.5 block text-sm text-[#c9c7c2]'>
                      Votre retour aide à améliorer la communauté.
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#ecebe7] transition ${feedbackOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {feedbackOpen && (
                  <div className='border-t border-white/[0.07] p-4'>
                    <CommunityFeedbackWidget />
                  </div>
                )}
              </section>
            </div>

            <aside id='agenda-du-cercle' aria-label='Agenda et présence' className='min-w-0 scroll-mt-20 space-y-5'>
              <section
                aria-labelledby='online-members-title'
                className='rounded-xl border border-white/[0.07] bg-[#1a1b21] p-4'
              >
                <div className='flex items-center justify-between gap-2'>
                  <h2 id='online-members-title' className='font-black'>
                    Présence en direct
                  </h2>
                  <Link href='/members' className='text-sm font-bold text-[#ecebe7] hover:text-[#ffb3b2]'>
                    Voir
                  </Link>
                </div>
                <dl className='my-3 grid grid-cols-2 gap-2 text-center'>
                  <div className='flex flex-col-reverse rounded-lg bg-[#292a2f] py-2'>
                    <dt className='text-xs text-[#c9c7c2]'>Membres du cercle</dt>
                    <dd className='text-xl font-semibold text-[#ffb3b2]'>{loading || error ? '…' : formatCount(memberStats.totalMembers)}</dd>
                  </div>
                  <div className='flex flex-col-reverse rounded-lg bg-[#292a2f] py-2'>
                    <dt className='text-xs text-[#c9c7c2]'>Nouveaux en 24 h</dt>
                    <dd className='text-xl font-semibold text-[#ffb3b2]'>{loading || error ? '…' : formatCount(memberStats.newMembersLast24h)}</dd>
                  </div>
                </dl>
                {onlineMembers.length > 0 ? (
                  <div className='mt-3 space-y-2'>
                    {onlineMembers.slice(0, 5).map((member) => (
                      <Link
                        key={member.id}
                        href={`/profile/${member.id}`}
                        className='flex items-center gap-2 rounded-xl bg-[#121318] p-2 hover:bg-[#0a0f15]'
                      >
                        <div className='relative h-9 w-9 shrink-0 overflow-hidden rounded-full'>
                          {mediaImage(profileImage(member), member.name)}
                          <span
                            aria-label='En ligne'
                            className='absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#04070b] bg-[#35e48d]'
                          />
                        </div>
                        <span className='truncate text-sm font-bold'>{member.name}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className='mt-3 text-sm text-[#c9c7c2]'>{loading ? 'Chargement de la présence…' : error ? 'Présence temporairement indisponible.' : 'Aucun membre en ligne pour le moment.'}</p>
                )}
              </section>
              <section aria-labelledby='next-event-title' className='rounded-xl border border-white/[0.07] bg-[#1a1b21] p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <h2 id='next-event-title' className='flex items-center gap-2 font-black'>
                    <CalendarHeart className='h-4 w-4 text-[#ffb3b2]' /> Agenda
                  </h2>
                  <Link href='/events' className='text-sm font-bold text-[#ecebe7] hover:text-[#ffb3b2]'>
                    Tout voir
                  </Link>
                </div>
                <CircleAgendaWeek events={events} />
                {upcomingEvents.length > 0 ? (
                  <div className='mt-3 space-y-3'>
                    {upcomingEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className='flex items-center gap-2 rounded-xl bg-[#121318] p-3 hover:bg-[#0a0f15]'
                      >
                        {event.image && (
                          <span className='relative size-12 shrink-0 overflow-hidden rounded-lg'>
                            {mediaImage(event.image, '')}
                          </span>
                        )}
                        <div className='min-w-0'>
                          <div className='text-sm font-bold'>{event.title}</div>
                          <p className='mt-1 text-xs text-[#c9c7c2]'>
                            {eventDateLabel(event.event_date)}
                            {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ''} · {event.location}
                          </p>
                          {event.participant_count != null && (
                            <span className='mt-1 block text-xs text-[#ffb3b2]'>
                              {Number(event.participant_count)} inscrit{Number(event.participant_count) > 1 ? 's' : ''} · Voir le rendez-vous →
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className='mt-3 text-sm text-[#c9c7c2]'>{loading ? 'Chargement de l’agenda…' : error ? 'Agenda temporairement indisponible.' : 'Aucun rendez-vous à venir.'}</p>
                )}
                <Link
                  href='/lieux'
                  className='mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#ecebe7] hover:text-[#ffb3b2]'
                >
                  Guide des lieux <ArrowUpRight className='h-4 w-4' />
                </Link>
                <Link href='/events/new' className='mt-4 block rounded-lg border border-white/10 py-2 text-center text-sm font-semibold hover:bg-[#292a2f]'>Proposer un événement</Link>
              </section>
              <Link href='/community-safety' className='block rounded-xl bg-[#1a1b21] p-4 text-sm text-[#e3e1e9] hover:bg-[#292a2f]'>Confidentialité et sécurité du cercle ↗</Link>
            </aside>
          </div>
        </div>
    </MainLayout>
  )
}
