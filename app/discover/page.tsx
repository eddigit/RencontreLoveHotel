'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowUpRight,
  Bell,
  CalendarHeart,
  ChevronDown,
  Heart,
  MessageCircle,
  RefreshCw,
  Search,
  UsersRound
} from 'lucide-react'
import { AdvancedFilters, defaultFilters, FilterOptions } from '@/components/advanced-filters'
import { CommunityWall } from '@/components/community-wall'
import { CommunityFeedbackWidget } from '@/components/community-feedback-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MemberReferralLink } from '@/components/member-referral-link'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import { NotificationsButton } from '@/components/notifications-button'
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
        const [profileResult, onlineResult, matchResult, eventResult, statsResult] = await getCommunityHome(resolvedFilters, batch)
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
  const memberGrowthLabel = memberStats.newMembersLast24h > 0
    ? `+${formatCount(memberStats.newMembersLast24h)} en 24 h`
    : 'Voir les membres'
  const newProfilesSummary = memberStats.totalMembers > 0
    ? `Les ${newProfiles.length} derniers profils visibles sur ${totalMembersLabel} membres.`
    : `Les ${newProfiles.length} derniers profils visibles.`
  const primaryHomeAction = counts.messages > 0
    ? { href: '/messages', icon: MessageCircle, title: 'Répondre à vos messages', detail: `${counts.messages} message${counts.messages > 1 ? 's' : ''} attend${counts.messages > 1 ? 'ent' : ''} votre réponse.`, label: 'Ouvrir la messagerie', count: counts.messages }
    : matches.length > 0
      ? { href: '/matches', icon: Heart, title: 'Voir vos matchs', detail: `${matches.length} match${matches.length > 1 ? 's' : ''} à découvrir.`, label: 'Voir mes matchs', count: matches.length }
      : { href: '/members', icon: UsersRound, title: 'Découvrir des profils', detail: 'Explorez selon vos envies, votre ville et le type de rencontre.', label: 'Explorer', count: null }
  const PrimaryActionIcon = primaryHomeAction.icon

  if (isLoading) {
    return (
      <MainLayout user={user}>
        <LhrV2Shell title='Communauté' subtitle='Chargement de votre espace rencontre.' user={user}>
          <div className='rounded-2xl border border-[#d9d7d0] bg-[#f6f4ee] p-8 text-[#667085]'>
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
          <div className='max-w-xl rounded-2xl border border-[#d9d7d0] bg-[#f6f4ee] p-6 text-[#172033]'>
            <p className='text-[#667085]'>
              Quelques informations sont nécessaires pour proposer des rencontres compatibles.
            </p>
            <Button onClick={() => router.push('/onboarding')} className='mt-5 bg-[#1f5eff] text-white hover:bg-[#1746c8]'>
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
        title='Mon cercle'
        action={
          <div className='flex flex-wrap items-center gap-2'>
            <div className='hidden lg:block'>
              <NotificationsButton />
            </div>
            <Button asChild size='sm' variant='ghost' className='text-[#1f5eff] hover:bg-[#eef3ff] hover:text-[#1746c8]'>
              <Link href='#boite-a-idees'>Boîte à idées</Link>
            </Button>
          </div>
        }
      >
        <div className='-m-3 min-h-[calc(100vh-8rem)] bg-[#f6f4ee] p-3 text-[#172033] sm:-m-4 sm:p-5 lg:-m-5 lg:p-6'>
        <section aria-label='Action principale' className='mb-5'>
          <Link href={primaryHomeAction.href} className='group flex items-center gap-4 rounded-2xl border border-[#cbd8ff] bg-white p-5 shadow-[0_10px_30px_rgba(23,32,51,0.06)] transition hover:-translate-y-0.5 hover:border-[#1f5eff]'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#1f5eff]'><PrimaryActionIcon className='h-5 w-5' /></span>
            <span className='min-w-0 flex-1'><span className='block text-lg font-black'>{primaryHomeAction.title}</span><span className='mt-0.5 block text-sm text-[#667085]'>{primaryHomeAction.detail}</span></span>
            {primaryHomeAction.count && <span className='hidden text-2xl font-black text-[#1f5eff] sm:block'>{primaryHomeAction.count}</span>}
            <span className='inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#1746c8]'>{primaryHomeAction.label}<ArrowUpRight className='h-4 w-4' /></span>
          </Link>
        </section>

        <section aria-labelledby='next-event-title' className='mb-5 overflow-hidden rounded-2xl border border-[#cbd8ff] bg-white shadow-[0_10px_30px_rgba(23,32,51,0.06)]'>
          {upcomingEvents.length > 0 ? (
            <div className='grid sm:grid-cols-[180px_minmax(0,1fr)]'>
              <div className='relative aspect-[16/10] bg-[#e7e4dc] sm:aspect-auto'>{mediaImage(upcomingEvents[0].image || '/soiree-masquee.webp', upcomingEvents[0].title)}</div>
              <div className='p-5'><p className='text-xs font-bold uppercase tracking-[0.16em] text-[#1746c8]'>Mon cercle · prochain rendez-vous</p><h2 id='next-event-title' className='mt-1 text-xl font-black'>{upcomingEvents[0].title}</h2><p className='mt-2 text-sm text-[#667085]'>{eventDateLabel(upcomingEvents[0].event_date)}{upcomingEvents[0].event_time ? ` · ${upcomingEvents[0].event_time}` : ''} · {upcomingEvents[0].location}</p><div className='mt-4 flex flex-wrap gap-4 text-sm font-bold text-[#1746c8]'><Link href={`/events/${upcomingEvents[0].id}`}>Voir le rendez-vous</Link><Link href='/events'>Agenda</Link><Link href='/lieux'>Guide des lieux</Link></div></div>
            </div>
          ) : <div className='flex flex-wrap items-center justify-between gap-3 p-5'><div><p className='text-xs font-bold uppercase tracking-[0.16em] text-[#1746c8]'>Mon cercle</p><h2 id='next-event-title' className='mt-1 text-xl font-black'>Préparez votre prochaine sortie</h2><p className='mt-1 text-sm text-[#667085]'>Découvrez les lieux et les rendez-vous proposés par la communauté.</p></div><div className='flex gap-3 text-sm font-bold text-[#1746c8]'><Link href='/events'>Agenda</Link><Link href='/lieux'>Guide des lieux</Link></div></div>}
        </section>

        <div className='space-y-5'>
          <section className='order-1 min-w-0 space-y-5'>
            {(counts.matches > 0 || counts.events > 0) && (
              <section aria-label='À suivre' className='flex flex-wrap gap-2'>
                {counts.matches > 0 && <Link href='/matches' className='inline-flex items-center gap-2 rounded-full border border-[#d9d7d0] bg-white px-3 py-2 text-sm font-bold text-[#172033]'><Heart className='h-4 w-4 text-[#1f5eff]' />{counts.matches} match{counts.matches > 1 ? 's' : ''} à consulter</Link>}
                {counts.events > 0 && <Link href='/events' className='inline-flex items-center gap-2 rounded-full border border-[#d9d7d0] bg-white px-3 py-2 text-sm font-bold text-[#172033]'><Bell className='h-4 w-4 text-[#1f5eff]' />{counts.events} alerte{counts.events > 1 ? 's' : ''} événement</Link>}
                <Link href='/notifications' className='inline-flex items-center gap-1 px-2 py-2 text-sm font-bold text-[#1746c8]'>Voir tout <ArrowUpRight className='h-4 w-4' /></Link>
              </section>
            )}

            <div className='relative'>
              <Search className='absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]' />
              <Input
                type='text'
                placeholder='Rechercher un profil, une ville, une ambiance...'
                value={searchQuery}
                onChange={event => handleSearchChange(event.target.value)}
                className='h-12 rounded-2xl border-[#d9d7d0] bg-white pl-11 text-[#172033] placeholder:text-[#667085] focus:border-[#1f5eff]'
              />
            </div>

            {error && (
              <div className='rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800'>
                {error}
              </div>
            )}

            <section id='new-profiles' className='scroll-mt-24'>
              <div className='mb-4 flex items-start justify-between gap-3'>
                <div>
                  <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#1746c8]'>Découvrir</p>
                  <h2 className='mt-1 text-xl font-black'>Des profils qui pourraient vous plaire</h2>
                  <p className='mt-1 text-sm leading-5 text-[#667085]'>{newProfilesSummary}</p>
                </div>
                <div className='flex shrink-0 flex-col items-end gap-2'>
                  <div className='flex items-center gap-2'>
                    <span className='hidden text-right text-xs text-[#667085] sm:block'>
                      {loading ? 'Actualisation...' : `${newProfiles.length} affichés`}
                    </span>
                    <AdvancedFilters value={filters} onFilterChange={handleFilterChange} />
                  </div>
                  <Button type='button' size='sm' variant='outline' onClick={showAnotherBatch} disabled={loading || preparingProfiles || profiles.length <= 12} className='border-[#d9d7d0] bg-white text-[#172033] hover:bg-[#eef3ff]'>
                    <RefreshCw className='mr-2 h-3.5 w-3.5' />
                    {preparingProfiles ? 'Actualisation...' : 'Découvrir d’autres profils'}
                  </Button>
                </div>
              </div>
              <div className='mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d7e1ff] bg-[#eef3ff] px-3 py-2 text-sm'>
                <span className='font-medium text-[#34405a]'>Affinez par type de profil, envies et critères de rencontre.</span>
                <Link href='/members' className='inline-flex items-center gap-1 font-bold text-[#1746c8] hover:text-[#12379e]'>Recherche détaillée <ArrowUpRight className='h-4 w-4' /></Link>
              </div>
              <div className='grid gap-3 sm:grid-cols-2 2xl:grid-cols-4'>
                {newProfiles.map(profile => (
                  <Link
                    key={profile.id}
                    href={`/profile/${profile.id}`}
                    className='group overflow-hidden rounded-2xl border border-[#d9d7d0] bg-white shadow-[0_8px_20px_rgba(23,32,51,0.05)] transition hover:-translate-y-0.5 hover:border-[#1f5eff]'
                  >
                    <div className='relative aspect-[4/5] bg-white/10'>
                      {mediaImage(profileImage(profile), profile.name)}
                      {profile.online && (
                        <span
                          aria-label='En ligne'
                          className='absolute right-3 top-3 h-3.5 w-3.5 rounded-full border-2 border-[#170321] bg-[#35e48d]'
                        />
                      )}
                      <div className='absolute inset-0 bg-gradient-to-t from-[#172033]/80 via-transparent to-transparent' />
                      <div className='absolute bottom-3 left-3 right-3'>
                        <div className='text-lg font-black'>
                          {profile.name}{profile.age ? `, ${profile.age}` : ''}
                        </div>
                        {typeof profile.matchScore === 'number' && <div className='text-xs text-white/66'>{Math.round(profile.matchScore)}% compatible</div>}
                      </div>
                    </div>
                    {profile.bio && (
                      <div className='p-3'>
                        <p className='line-clamp-2 text-sm leading-5 text-[#667085]'>{profile.bio}</p>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>


            <MemberReferralLink />
            <CommunityWall currentUserId={user.id} />

            <section id='boite-a-idees' className='scroll-mt-24 rounded-2xl border border-[#d9d7d0] bg-white'>
              <button type='button' onClick={() => setFeedbackOpen(open => !open)} aria-expanded={feedbackOpen} className='flex w-full items-center justify-between gap-4 p-4 text-left'>
                <span><span className='block font-black'>Une idée ou un problème à signaler ?</span><span className='mt-0.5 block text-sm text-[#667085]'>Votre retour aide à améliorer la communauté.</span></span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-[#1f5eff] transition ${feedbackOpen ? 'rotate-180' : ''}`} />
              </button>
              {feedbackOpen && <div className='border-t border-[#e7e4dc] p-4'><CommunityFeedbackWidget /></div>}
            </section>

          </section>
        </div>
        </div>
      </LhrV2Shell>
    </MainLayout>
  )
}
