'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Filter, MapPin, MessageCircle, RotateCcw, Search, UsersRound, X } from 'lucide-react'
import MainLayout from '@/components/layout/main-layout'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { defaultMemberImage } from '@/lib/default-member-image'
import {
  getCommunityMemberStats,
  searchCommunityMembers,
  type CommunityMemberDirectoryFilters
} from '@/actions/user-actions'

type CommunityMember = {
  id: string
  name?: string
  avatar?: string | null
  age?: number | null
  location?: string | null
  profile_status?: string | null
  gender?: string | null
  orientation?: string | null
  bio?: string | null
  open_to_other_couples?: boolean
  open_curtains?: boolean
  libertine?: boolean
  online?: boolean
}

type CommunityStats = {
  totalMembers: number
  newMembersLast24h: number
}

const initialFilters: CommunityMemberDirectoryFilters = {
  pageSize: 24,
  search: '',
  profileType: 'all',
  orientation: 'all',
  meetingCriterion: 'all',
  onlineOnly: false
}

function formatCount(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function imageFor(member: CommunityMember) {
  return defaultMemberImage(member)
}

function profileTypeLabel(member: CommunityMember) {
  const status = (member.profile_status || '').toLowerCase()
  const gender = (member.gender || '').toLowerCase()
  if (status.startsWith('couple') || gender.startsWith('couple')) return 'Couple'
  if (gender.includes('female') || gender.includes('woman') || status.includes('female') || status.includes('woman')) return 'Femme'
  if (gender.includes('male') || gender.includes('man') || status.includes('male') || status.includes('man')) return 'Homme'
  return 'Profil membre'
}

function orientationLabel(value?: string | null) {
  const labels: Record<string, string> = {
    hetero: 'Hétéro',
    straight: 'Hétéro',
    bi: 'Bi',
    bisexual: 'Bisexuel',
    homo: 'Homo',
    gay: 'Gay',
    lesbian: 'Lesbienne',
    pansexual: 'Pansexuel'
  }
  return value ? labels[value.toLowerCase()] || value : null
}

export default function MembersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [stats, setStats] = useState<CommunityStats>({ totalMembers: 0, newMembersLast24h: 0 })
  const [filters, setFilters] = useState<CommunityMemberDirectoryFilters>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<CommunityMemberDirectoryFilters>(initialFilters)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = async (nextPage = 1, nextFilters = appliedFilters) => {
    setLoading(true)
    setError(null)
    try {
      const [directoryResult, statsResult] = await Promise.all([
        searchCommunityMembers({ ...nextFilters, page: nextPage, pageSize: 24 }),
        getCommunityMemberStats()
      ])
      setMembers(directoryResult.members as CommunityMember[])
      setTotalCount(directoryResult.totalCount)
      setPage(directoryResult.currentPage)
      setTotalPages(directoryResult.totalPages)
      setStats(statsResult)
    } catch (fetchError) {
      console.error('Erreur lors du chargement de l’annuaire membre:', fetchError)
      setError('Impossible de charger les membres pour le moment.')
      setMembers([])
      setTotalCount(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    void fetchMembers(1, initialFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router])

  const applyFilters = (nextFilters: CommunityMemberDirectoryFilters) => {
    setFilters(nextFilters)
    setAppliedFilters(nextFilters)
    void fetchMembers(1, nextFilters)
  }

  const resetFilters = () => {
    applyFilters({ ...initialFilters })
  }

  const activeFilterCount = [
    filters.search?.trim(),
    filters.profileType !== 'all' ? filters.profileType : '',
    filters.orientation !== 'all' ? filters.orientation : '',
    filters.meetingCriterion !== 'all' ? filters.meetingCriterion : '',
    filters.onlineOnly ? 'online' : ''
  ].filter(Boolean).length

  const appliedCriteria = [
    appliedFilters.search?.trim() ? `Recherche : « ${appliedFilters.search.trim()} »` : null,
    appliedFilters.profileType === 'couple' ? 'Couples' : null,
    appliedFilters.profileType === 'woman' ? 'Femmes' : null,
    appliedFilters.profileType === 'man' ? 'Hommes' : null,
    appliedFilters.orientation !== 'all' ? orientationLabel(appliedFilters.orientation) : null,
    appliedFilters.meetingCriterion === 'open_couples' ? 'Ouverts aux couples' : null,
    appliedFilters.meetingCriterion === 'open_curtains' ? 'Rideaux ouverts' : null,
    appliedFilters.meetingCriterion === 'libertine' ? 'Libertins' : null,
    appliedFilters.onlineOnly ? 'En ligne maintenant' : null
  ].filter((criterion): criterion is string => Boolean(criterion))

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
        eyebrow='Annuaire communautaire'
        title='Rechercher des membres'
        subtitle='Accédez aux profils visibles de la communauté et trouvez le type de rencontre qui vous correspond.'
      >
        <div className='space-y-5'>
          <section className='rounded-2xl border border-[#94ffc9]/25 bg-white/[0.045] p-5'>
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <div className='flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#94ffc9]/15 text-[#94ffc9]'>
                  <UsersRound className='h-6 w-6' />
                </div>
                <div>
                  <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#94ffc9]'>Communauté visible</p>
                  <h2 className='text-2xl font-black'>{formatCount(stats.totalMembers)} membres</h2>
                  <p className='text-sm text-white/58'>Les profils incomplets ou masqués ne sont pas publiés dans cet annuaire.</p>
                </div>
              </div>
              <Link href='/discover#new-profiles' className='text-sm font-bold text-[#94ffc9] hover:text-white'>
                Voir les nouveaux membres
              </Link>
            </div>
          </section>

          <section className='rounded-2xl border-2 border-[#ff8cc8]/35 bg-white/[0.045] p-5'>
            <div className='mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#ff8cc8]'>Annuaire complet</p>
                <h2 className='text-xl font-black'>{appliedCriteria.length > 0 ? 'Résultats de la recherche' : 'Tous les membres'}</h2>
                <p className='mt-1 text-sm text-white/58'>
                  {formatCount(totalCount)} résultat{totalCount > 1 ? 's' : ''} · 24 profils par page
                </p>
              </div>
              <div className='flex items-center gap-2 self-end sm:self-start'>
                {activeFilterCount > 0 && <span className='text-xs text-white/55'>{activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''}</span>}
                <Button
                  type='button'
                  variant={filtersOpen ? 'default' : 'outline'}
                  onClick={() => setFiltersOpen(open => !open)}
                  aria-expanded={filtersOpen}
                  className='border-[#ff8cc8]/35'
                  title='Afficher ou masquer les filtres'
                >
                  <Filter className='mr-2 h-4 w-4' />
                  Filtrer les membres
                  {activeFilterCount > 0 && <span className='ml-2 rounded-full bg-background/20 px-1.5 py-0.5 text-xs'>{activeFilterCount}</span>}
                </Button>
              </div>
            </div>

            <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end'>
              <label className='text-sm font-semibold'>
                Rechercher dans les membres
                <div className='relative mt-1'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45' />
                  <Input
                    type='search'
                    placeholder='Nom ou ville'
                    value={filters.search || ''}
                    onChange={event => setFilters(current => ({ ...current, search: event.target.value }))}
                    onKeyDown={event => {
                      if (event.key === 'Enter') applyFilters({ ...filters })
                    }}
                    className='h-11 border-white/10 bg-black/20 pl-9 text-white placeholder:text-white/40'
                  />
                </div>
              </label>

              <label className='text-sm font-semibold'>
                Type de membre
                <select
                  value={filters.profileType || 'all'}
                  onChange={event => applyFilters({ ...filters, profileType: event.target.value as CommunityMemberDirectoryFilters['profileType'] })}
                  className='mt-1 h-11 w-full rounded-md border border-white/10 bg-[#1c082d] px-3 text-sm text-white'
                >
                  <option value='all'>Tous les membres</option>
                  <option value='couple'>Couples</option>
                  <option value='woman'>Femmes</option>
                  <option value='man'>Hommes</option>
                </select>
              </label>

              <Button type='button' onClick={() => applyFilters({ ...filters })} disabled={loading} className='bg-[#ff3b8b] hover:bg-[#ff62a8]'>
                <Search className='mr-2 h-4 w-4' />
                Rechercher
              </Button>
            </div>

            {filtersOpen && (
              <div className='mt-4 rounded-2xl border border-white/10 bg-black/15 p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <p className='text-sm font-bold'>Filtrer les membres</p>
                  <Button type='button' variant='ghost' size='sm' onClick={resetFilters} disabled={loading} className='text-white/70 hover:text-white'>
                    <RotateCcw className='mr-2 h-4 w-4' />
                    Réinitialiser
                  </Button>
                </div>
                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                  <label className='text-sm font-semibold'>
                    Orientation
                    <select
                      value={filters.orientation || 'all'}
                      onChange={event => applyFilters({ ...filters, orientation: event.target.value as CommunityMemberDirectoryFilters['orientation'] })}
                      className='mt-1 h-10 w-full rounded-md border border-white/10 bg-[#1c082d] px-3 text-sm text-white'
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
                      className='mt-1 h-10 w-full rounded-md border border-white/10 bg-[#1c082d] px-3 text-sm text-white'
                    >
                      <option value='all'>Tous les critères</option>
                      <option value='open_couples'>Ouverts aux couples</option>
                      <option value='open_curtains'>Rideaux ouverts</option>
                      <option value='libertine'>Libertins</option>
                    </select>
                  </label>

                  <label className='flex h-10 items-center gap-3 self-end rounded-md border border-white/10 bg-[#1c082d] px-3 text-sm font-semibold'>
                    <input
                      type='checkbox'
                      checked={Boolean(filters.onlineOnly)}
                      onChange={event => applyFilters({ ...filters, onlineOnly: event.target.checked })}
                      className='h-4 w-4 accent-[#ff3b8b]'
                    />
                    En ligne maintenant
                  </label>
                </div>
              </div>
            )}

            <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex flex-wrap gap-2'>
                {appliedCriteria.length > 0 ? appliedCriteria.map(criterion => (
                  <span key={criterion} className='rounded-full bg-[#ff8cc8]/12 px-2.5 py-1 text-xs text-[#ffb8dc]'>{criterion}</span>
                )) : <span className='text-xs text-white/50'>Tous les membres, sans filtre</span>}
              </div>
              {appliedCriteria.length > 0 && (
                <Button type='button' variant='ghost' size='sm' onClick={resetFilters} disabled={loading} className='text-white/70 hover:text-white'>
                  <X className='mr-2 h-4 w-4' />
                  Effacer la recherche
                </Button>
              )}
            </div>
          </section>

          {error && <div className='rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100'>{error}</div>}

          {loading ? (
            <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/60'>Chargement des membres...</div>
          ) : members.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-white/60'>Aucun membre ne correspond à ces critères.</div>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
              {members.map(member => (
                <article key={member.id} className='overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]'>
                  <Link href={`/profile/${member.id}`} className='group block'>
                    <div className='relative aspect-[4/3] bg-white/10'>
                      {imageFor(member).startsWith('http') ? (
                        <img src={imageFor(member)} alt={member.name || 'Profil membre'} className='h-full w-full object-cover transition group-hover:scale-105' />
                      ) : (
                        <Image src={imageFor(member)} alt={member.name || 'Profil membre'} fill className='object-cover transition group-hover:scale-105' sizes='320px' />
                      )}
                      <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent' />
                      {member.online && <span className='absolute right-3 top-3 h-3 w-3 rounded-full border-2 border-[#170321] bg-[#35e48d]' title='En ligne' />}
                      <div className='absolute bottom-3 left-3 right-3'>
                        <h3 className='text-lg font-black'>{member.name || 'Membre'}{member.age ? `, ${member.age}` : ''}</h3>
                        <div className='flex items-center gap-1 text-xs text-white/70'>
                          <MapPin className='h-3.5 w-3.5' />
                          {member.location || 'Localisation non renseignée'}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className='p-3'>
                    <div className='flex flex-wrap gap-1.5 text-xs'>
                      <span className='rounded-full bg-[#94ffc9]/12 px-2 py-1 text-[#b8ffdb]'>{profileTypeLabel(member)}</span>
                      {orientationLabel(member.orientation) && <span className='rounded-full bg-white/8 px-2 py-1 text-white/65'>{orientationLabel(member.orientation)}</span>}
                      {member.open_to_other_couples && <span className='rounded-full bg-white/8 px-2 py-1 text-white/65'>Ouvert aux couples</span>}
                      {member.open_curtains && <span className='rounded-full bg-[#ff8cc8]/12 px-2 py-1 text-[#ffb8dc]'>Rideaux ouverts</span>}
                      {member.libertine && <span className='rounded-full bg-white/8 px-2 py-1 text-white/65'>Libertin</span>}
                    </div>
                    {member.bio ? (
                      <p className='mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-white/58'>{member.bio}</p>
                    ) : null}
                    <div className='mt-3 flex gap-2'>
                      <Button asChild size='sm' className='flex-1 bg-[#ff3b8b] hover:bg-[#ff62a8]'>
                        <Link href={`/profile/${member.id}`}>Voir le profil</Link>
                      </Button>
                      <Button asChild size='sm' variant='outline' className='border-white/12 bg-white/[0.04]' title='Ouvrir la messagerie'>
                        <Link href={`/messages?user=${member.id}`}><MessageCircle className='h-4 w-4' /></Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && totalPages > 0 && (
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-sm text-white/55'>Page {page} sur {totalPages} · {formatCount(totalCount)} membres trouvés</p>
              <div className='flex gap-2'>
                <Button type='button' variant='outline' disabled={page <= 1 || loading} onClick={() => void fetchMembers(page - 1, appliedFilters)} className='border-white/12 bg-white/[0.04]'>
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Précédente
                </Button>
                <Button type='button' variant='outline' disabled={page >= totalPages || loading} onClick={() => void fetchMembers(page + 1, appliedFilters)} className='border-white/12 bg-white/[0.04]'>
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
