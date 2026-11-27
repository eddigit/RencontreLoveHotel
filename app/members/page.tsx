'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Filter, RotateCcw, Search } from 'lucide-react'
import MainLayout from '@/components/layout/main-layout'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { MemberDirectoryCard, orientationLabel, type DirectoryMember } from '@/components/member-directory-card'
import {
  searchCommunityMembers,
  type CommunityMemberDirectoryFilters
} from '@/actions/user-actions'

const initialFilters: CommunityMemberDirectoryFilters = {
  pageSize: 24,
  search: '',
  profileType: 'all',
  orientation: 'all',
  meetingCriterion: 'all',
  onlineOnly: false
}

function isDirectoryProfileType(value: string | null): value is NonNullable<CommunityMemberDirectoryFilters['profileType']> {
  return value === 'all' || value === 'couple' || value === 'woman' || value === 'man' || value === 'trans'
}

function isDirectoryOrientation(value: string | null): value is NonNullable<CommunityMemberDirectoryFilters['orientation']> {
  return value === 'all' || value === 'hetero' || value === 'bi' || value === 'bisexual' || value === 'homo' || value === 'gay' || value === 'lesbian' || value === 'pansexual'
}

function isDirectoryMeetingCriterion(value: string | null): value is NonNullable<CommunityMemberDirectoryFilters['meetingCriterion']> {
  return value === 'all' || value === 'open_couples' || value === 'open_curtains' || value === 'libertine'
}

function filtersFromSearchParams(searchParams: URLSearchParams) {
  const pageValue = Number(searchParams.get('page') || 1)
  const profileType = searchParams.get('profileType')
  const orientation = searchParams.get('orientation')
  const meetingCriterion = searchParams.get('meetingCriterion')

  return {
    page: Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1,
    filters: {
      ...initialFilters,
      search: searchParams.get('search') || '',
      profileType: isDirectoryProfileType(profileType) ? profileType : initialFilters.profileType,
      orientation: isDirectoryOrientation(orientation) ? orientation : initialFilters.orientation,
      meetingCriterion: isDirectoryMeetingCriterion(meetingCriterion) ? meetingCriterion : initialFilters.meetingCriterion,
      recent: searchParams.get('recent') === 'true',
      onlineOnly: searchParams.get('onlineOnly') === 'true'
    }
  }
}

function writeMemberDirectoryUrlState(
  router: ReturnType<typeof useRouter>,
  filters: CommunityMemberDirectoryFilters,
  page: number
) {
  const params = new URLSearchParams()
  const search = filters.search?.trim()

  if (search) params.set('search', search)
  if (filters.profileType && filters.profileType !== initialFilters.profileType) params.set('profileType', filters.profileType)
  if (filters.orientation && filters.orientation !== initialFilters.orientation) params.set('orientation', filters.orientation)
  if (filters.meetingCriterion && filters.meetingCriterion !== initialFilters.meetingCriterion) params.set('meetingCriterion', filters.meetingCriterion)
  if (filters.recent) params.set('recent', 'true')
  if (filters.onlineOnly) params.set('onlineOnly', 'true')
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  router.replace(query ? `/members?${query}` : '/members', { scroll: false })
}

function formatCount(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

export default function MembersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamString = searchParams.toString()
  const [members, setMembers] = useState<DirectoryMember[]>([])
  const [filters, setFilters] = useState<CommunityMemberDirectoryFilters>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<CommunityMemberDirectoryFilters>(initialFilters)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const filterToggleRef = useRef<HTMLButtonElement>(null)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const memberRequestRef = useRef(0)

  const fetchMembers = async (nextPage = 1, nextFilters = appliedFilters) => {
    const requestId = ++memberRequestRef.current
    setLoading(true)
    setError(null)
    try {
      const directoryResult = await searchCommunityMembers({ ...nextFilters, page: nextPage, pageSize: 24 })
      if (requestId !== memberRequestRef.current) return
      setMembers(directoryResult.members as DirectoryMember[])
      setTotalCount(directoryResult.totalCount)
      setPage(directoryResult.currentPage)
      setTotalPages(directoryResult.totalPages)
    } catch (fetchError) {
      if (requestId !== memberRequestRef.current) return
      console.error('Erreur lors du chargement de l’annuaire membre:', fetchError)
      setError('Impossible de charger les membres pour le moment.')
      setMembers([])
      setTotalCount(0)
      setTotalPages(0)
    } finally {
      if (requestId === memberRequestRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoading) return () => { memberRequestRef.current += 1 }
    if (!user) {
      memberRequestRef.current += 1
      router.push('/login')
      return () => { memberRequestRef.current += 1 }
    }
    const restoredState = filtersFromSearchParams(new URLSearchParams(searchParamString))
    setFilters(restoredState.filters)
    setAppliedFilters(restoredState.filters)
    void fetchMembers(restoredState.page, restoredState.filters)
    return () => { memberRequestRef.current += 1 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router, searchParamString])

  const applyFilters = (nextFilters: CommunityMemberDirectoryFilters) => {
    setFilters(nextFilters)
    setAppliedFilters(nextFilters)
    writeMemberDirectoryUrlState(router, nextFilters, 1)
  }

  const resetFilters = () => {
    setFilters({ ...initialFilters })
    setAppliedFilters({ ...initialFilters })
    writeMemberDirectoryUrlState(router, { ...initialFilters }, 1)
  }

  const appliedCriteria = [
    appliedFilters.search?.trim() ? `Recherche : « ${appliedFilters.search.trim()} »` : null,
    appliedFilters.profileType === 'couple' ? 'Couples' : null,
    appliedFilters.profileType === 'woman' ? 'Femmes' : null,
    appliedFilters.profileType === 'man' ? 'Hommes' : null,
    appliedFilters.profileType === 'trans' ? 'Personnes trans' : null,
    appliedFilters.orientation !== 'all' ? orientationLabel(appliedFilters.orientation) : null,
    appliedFilters.meetingCriterion === 'open_couples' ? 'Ouverts aux couples' : null,
    appliedFilters.meetingCriterion === 'open_curtains' ? 'Rideaux ouverts' : null,
    appliedFilters.meetingCriterion === 'libertine' ? 'Libertins' : null,
    appliedFilters.recent ? 'Inscrits depuis 24 h' : null,
    appliedFilters.onlineOnly ? 'En ligne maintenant' : null
  ].filter((criterion): criterion is string => Boolean(criterion))
  const activeFilterCount = appliedCriteria.length

  useEffect(() => {
    if (filtersOpen) filterPanelRef.current?.focus()
  }, [filtersOpen])

  const closeFilters = () => {
    setFiltersOpen(false)
    requestAnimationFrame(() => filterToggleRef.current?.focus())
  }

  if (isLoading) {
    return (
      <MainLayout user={user}>
        <LhrV2Shell title='Rechercher des membres' subtitle='Chargement de l’annuaire.' user={user}>
          <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-white/70'>Chargement...</div>
        </LhrV2Shell>
      </MainLayout>
    )
  }

  if (!user?.onboardingCompleted) {
    return (
      <MainLayout user={user}>
        <LhrV2Shell title='Complétez votre profil' subtitle='Votre profil doit être prêt avant de consulter la communauté.' user={user}>
          <div className='max-w-xl rounded-2xl border border-white/10 bg-white/[0.05] p-6'>
            <p className='text-white/70'>Quelques informations sont nécessaires avant d’accéder aux membres.</p>
            <Button onClick={() => router.push('/onboarding')} className='mt-5 bg-[#c1121f] hover:bg-[#c1121f]'>
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
        title='Membres'
      >
        <div className='space-y-5'>
          <section className='rounded-2xl border border-[#2b3040] bg-[#16181f] p-4 sm:p-5'>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <p className='text-sm text-[#c1c6da]'>
                  <span aria-live='polite'>{loading ? 'Recherche en cours…' : `${formatCount(totalCount)} ${totalCount === 1 ? 'profil' : 'profils'}`}</span>
                  <span aria-hidden='true'> · </span>
                  <Link href='/discover#new-profiles' className='text-[#ffb3b2] hover:text-white'>Nouveaux membres</Link>
                </p>
              </div>
              <div className='flex flex-wrap items-center gap-2 self-end sm:self-start'>
                {activeFilterCount > 0 && <span className='rounded-full bg-[#ff334b]/15 px-2.5 py-1 text-xs font-semibold text-[#ffb3b2]'>{activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}</span>}
                {activeFilterCount > 0 && <Button type='button' variant='ghost' size='sm' onClick={resetFilters} disabled={loading} className='text-[#94a3b8] hover:bg-white/5 hover:text-white'><RotateCcw className='mr-2 h-4 w-4' />Réinitialiser</Button>}
              </div>
            </div>

            <form onSubmit={event => { event.preventDefault(); applyFilters({ ...filters }) }} className='grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2'>
              <label className='sr-only' htmlFor='member-search'>Rechercher dans les membres</label>
              <div className='relative min-w-0'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45' />
                  <Input
                    id='member-search'
                    type='search'
                    placeholder='Nom ou ville'
                    value={filters.search || ''}
                    onChange={event => setFilters(current => ({ ...current, search: event.target.value }))}
                    className='h-11 border-[#2b3040] bg-[#1e222d] pl-9 text-[#f8fafc] placeholder:text-[#94a3b8] focus-visible:ring-[#ff334b]'
                  />
              </div>
              <Button type='submit' size='icon' disabled={loading} className='h-11 w-11 bg-[#ff334b] text-white hover:bg-[#cc001a]' aria-label='Lancer la recherche'><Search className='h-4 w-4' /></Button>
              <Button ref={filterToggleRef} type='button' variant='outline' onClick={() => setFiltersOpen(open => !open)} aria-expanded={filtersOpen} aria-controls='filtres-avances-membres' aria-label={filtersOpen ? 'Masquer les filtres avancés' : 'Afficher les filtres avancés'} className='h-11 border-[#3b4257] bg-[#1e222d] px-3 text-[#f8fafc] hover:bg-[#34343a] hover:text-white'><Filter className='mr-2 h-4 w-4' />Filtres</Button>
            </form>

            {filtersOpen && (
              <div id='filtres-avances-membres' ref={filterPanelRef} tabIndex={-1} onKeyDown={event => { if (event.key === 'Escape') closeFilters() }} className='mt-4 rounded-xl border border-[#2b3040] bg-[#0d0e13] p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff334b]'>
                <div className='mb-3 flex items-center justify-between'>
                  <p className='text-sm font-semibold text-[#f8fafc]'>Filtres avancés</p>
                  <span className='text-xs text-[#94a3b8]'>Échap pour refermer</span>
                </div>
                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                  <label className='text-sm font-semibold'>
                    Type de membre
                    <select value={filters.profileType || 'all'} onChange={event => applyFilters({ ...filters, profileType: event.target.value as CommunityMemberDirectoryFilters['profileType'] })} className='mt-1 h-10 w-full rounded-md border border-[#2b3040] bg-[#1e222d] px-3 text-sm text-[#f8fafc]'>
                      <option value='all'>Tous les membres</option><option value='couple'>Couples</option><option value='woman'>Femmes</option><option value='man'>Hommes</option><option value='trans'>Personnes trans</option>
                    </select>
                  </label>
                  <label className='text-sm font-semibold'>
                    Orientation
                    <select
                      value={filters.orientation || 'all'}
                      onChange={event => applyFilters({ ...filters, orientation: event.target.value as CommunityMemberDirectoryFilters['orientation'] })}
                      className='mt-1 h-10 w-full rounded-md border border-white/10 bg-[#0a0f15] px-3 text-sm text-white'
                    >
                      <option value='all'>Toutes les orientations</option>
                      <option value='hetero'>Hétéro</option>
                      <option value='bi'>Bi</option>
                      <option value='bisexual'>Bisexuel</option>
                      <option value='homo'>Homo</option>
                      <option value='gay'>Gay</option>
                      <option value='lesbian'>Lesbienne</option>
                      <option value='pansexual'>Pansexuel</option>
                    </select>
                  </label>

                  <label className='text-sm font-semibold'>
                    Critère de rencontre
                    <select
                      value={filters.meetingCriterion || 'all'}
                      onChange={event => applyFilters({ ...filters, meetingCriterion: event.target.value as CommunityMemberDirectoryFilters['meetingCriterion'] })}
                      className='mt-1 h-10 w-full rounded-md border border-white/10 bg-[#0a0f15] px-3 text-sm text-white'
                    >
                      <option value='all'>Tous les critères</option>
                      <option value='open_couples'>Ouverts aux couples</option>
                      <option value='open_curtains'>Rideaux ouverts</option>
                      <option value='libertine'>Libertins</option>
                    </select>
                  </label>

                  <label className='flex h-10 items-center gap-3 self-end rounded-md border border-white/10 bg-[#0a0f15] px-3 text-sm font-semibold'>
                    <input
                      type='checkbox'
                      checked={Boolean(filters.onlineOnly)}
                      onChange={event => applyFilters({ ...filters, onlineOnly: event.target.checked })}
                      className='h-4 w-4 accent-[#ff525d]'
                    />
                    En ligne maintenant
                  </label>
                  <label className='flex h-10 items-center gap-3 self-end rounded-md border border-white/10 bg-[#0a0f15] px-3 text-sm font-semibold'>
                    <input
                      type='checkbox'
                      checked={Boolean(filters.recent)}
                      onChange={event => applyFilters({ ...filters, recent: event.target.checked })}
                      className='h-4 w-4 accent-[#ff525d]'
                    />
                    Inscrits depuis 24 h
                  </label>
                </div>
              </div>
            )}

            {appliedCriteria.length > 0 && (
              <div className='mt-3 flex flex-wrap gap-2'>
                {appliedCriteria.map(criterion => (
                  <span key={criterion} className='rounded-full bg-[#292a2f] px-2.5 py-1 text-xs text-[#e3e1e9]'>{criterion}</span>
                ))}
              </div>
            )}
          </section>

          {error && <div className='rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100'>{error}</div>}

          {loading ? (
            <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/60'>Chargement des membres...</div>
          ) : members.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-white/60'>Aucun membre ne correspond à ces critères.</div>
          ) : (
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6'>
              {members.map(member => <MemberDirectoryCard key={member.id} member={member} />)}
            </div>
          )}

          {!loading && totalPages > 0 && (
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-sm text-white/55'>Page {page} sur {totalPages} · {formatCount(totalCount)} membres trouvés</p>
              <div className='flex gap-2'>
                <Button type='button' variant='outline' disabled={page <= 1 || loading} onClick={() => writeMemberDirectoryUrlState(router, appliedFilters, page - 1)} className='border-white/12 bg-white/[0.04]'>
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Précédente
                </Button>
                <Button type='button' variant='outline' disabled={page >= totalPages || loading} onClick={() => writeMemberDirectoryUrlState(router, appliedFilters, page + 1)} className='border-white/12 bg-white/[0.04]'>
                  Suivante
                  <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </div>
      </LhrV2Shell>
    </MainLayout>
  )
}
