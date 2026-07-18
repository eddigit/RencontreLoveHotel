'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ProtectedRoute } from '@/components/protected-route'
import { 
  searchAdminUsers,
  type AdminUserSearchFilters,
  deleteUserByAdmin, 
  getTotalUsersCount,
  getUserCountsByGender // Importer la nouvelle action
} from '@/actions/user-actions'
import { banUser, unbanUser } from '@/actions/message-actions'
import { sendInternalMessageToSelectedUsers } from '@/actions/notification-actions'
import {
  createEmailCampaignDraft,
  createEmailTemplate,
  prepareCampaignRecipients
} from '@/actions/email-campaign-actions'
import MainLayout from '@/components/layout/main-layout'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminHeader } from '@/components/admin-header'
import Link from 'next/link'
import { ModerationAvatar } from '@/components/moderation/moderation-avatar'
import { useAuth } from '@/contexts/auth-context'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChevronLeft, ChevronRight, Filter, Mail, MessageSquare, RotateCcw, Search, X } from 'lucide-react'

// Define a more specific type for user data, including ban status
interface AdminUser {
  id: string
  name?: string
  email?: string
  role?: string
  avatar?: string
  primary_photo?: string
  location?: string
  age?: number
  is_banned?: boolean
  status?: string
  account_status?: string
  profile_status?: string
  gender?: string
  orientation?: string
  display_profile?: boolean
  onboarding_completed?: boolean
  open_to_other_couples?: boolean
  open_curtains?: boolean
  libertine?: boolean
  // Add any other properties that come from getAllUsers
  [key: string]: any // Keep it flexible for other existing props from Record<string, any>
}

interface GenderCount { // Nouvelle interface
  gender: string;
  count: number;
}

function profileImage(user: AdminUser) {
  const uploadedPhoto = user.primary_photo?.trim() || user.avatar?.trim()
  if (uploadedPhoto) return uploadedPhoto

  const profileType = `${user.profile_status || ''} ${user.gender || ''}`.toLowerCase()
  if (profileType.includes('couple')) return '/default-member-couple.jpg'
  if (profileType.includes('female') || profileType.includes('woman')) return '/default-member-woman.jpg'
  if (profileType.includes('male') || profileType.includes('man')) return '/default-member-man.jpg'
  return '/default-member-couple.jpg'
}

export default function AdminUsersPage () {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [directoryTotal, setDirectoryTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [genderCounts, setGenderCounts] = useState<GenderCount[]>([]); // Nouvel état
  const [loading, setLoading] = useState(true)
  const [loadingGenderCounts, setLoadingGenderCounts] = useState(true); // Nouvel état de chargement
  const [filters, setFilters] = useState<AdminUserSearchFilters>({
    pageSize: 24,
    search: '',
    accountStatus: 'all',
    profileStatus: 'all',
    gender: 'all',
    orientation: 'all',
    meetingCriterion: 'all',
    onboarding: 'all',
    visibility: 'all'
  })
  const [appliedFilters, setAppliedFilters] = useState<AdminUserSearchFilters>(filters)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [outreachMode, setOutreachMode] = useState<'message' | 'email' | null>(null)
  const [outreachBusy, setOutreachBusy] = useState(false)
  const [outreachStatus, setOutreachStatus] = useState('')
  const [messageForm, setMessageForm] = useState({
    title: 'Message de Love Hotel Rencontres',
    description: ''
  })
  const [emailForm, setEmailForm] = useState({
    name: 'Relance membres sélectionnés',
    subject: 'Des nouveautés vous attendent sur Love Hotel Rencontres',
    bodyHtml: '<p>Bonjour [name],</p><p>Nous avons de nouvelles annonces et de nouveaux événements à vous faire découvrir.</p><p><a href="[cta-url]">Revenir sur Love Hotel Rencontres</a></p>',
    bodyText: 'Bonjour [name], de nouvelles annonces et de nouveaux événements vous attendent sur Love Hotel Rencontres : [cta-url]'
  })

  const fetchAdminData = async (nextPage = 1, nextFilters = appliedFilters) => {
    setLoading(true)
    setLoadingGenderCounts(true)

    try {
      const [directoryResult, totalCountResult, genderCountsResult] = await Promise.all([
        searchAdminUsers({ ...nextFilters, page: nextPage, pageSize: 24 }),
        getTotalUsersCount(),
        getUserCountsByGender()
      ]);

      setUsers(directoryResult.users as AdminUser[])
      setTotalUsers(totalCountResult);
      setDirectoryTotal(directoryResult.totalCount)
      setPage(directoryResult.currentPage)
      setTotalPages(directoryResult.totalPages)
      setGenderCounts(genderCountsResult || [])

    } catch (error) {
      console.error('Erreur lors de la récupération des données admin:', error)
      setUsers([])
      setTotalUsers(0)
      setDirectoryTotal(0)
      setTotalPages(0)
      setGenderCounts([])
    } finally {
      setLoading(false)
      setLoadingGenderCounts(false)
    }
  }


  useEffect(() => {
    void fetchAdminData(1, appliedFilters)
  }, [])

  const applyFilters = (nextFilters: AdminUserSearchFilters) => {
    setFilters(nextFilters)
    setAppliedFilters(nextFilters)
    void fetchAdminData(1, nextFilters)
  }

  const runSearch = () => {
    applyFilters({ ...filters })
  }

  const resetSearch = () => {
    const nextFilters: AdminUserSearchFilters = {
      pageSize: 24,
      search: '',
      accountStatus: 'all',
      profileStatus: 'all',
      gender: 'all',
      orientation: 'all',
      meetingCriterion: 'all',
      onboarding: 'all',
      visibility: 'all'
    }
    applyFilters(nextFilters)
  }

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return
    await deleteUserByAdmin(userId)
    await fetchAdminData(page, appliedFilters)
  }

  // Handler for banning/unbanning a user
  const handleToggleBan = async (
    userId: string,
    currentIsBanned: boolean | undefined,
    userName: string | undefined
  ) => {
    const action = currentIsBanned ? 'débannir' : 'bannir'
    const confirmMessage = `Êtes-vous sûr de vouloir ${action} cet utilisateur (${
      userName || userId
    }) ?`
    if (!window.confirm(confirmMessage)) return

    try {
      if (currentIsBanned) {
        await unbanUser(userId)
        alert(`Utilisateur ${userName || userId} débanni.`)
      } else {
        await banUser(userId)
        alert(`Utilisateur ${userName || userId} banni.`)
      }
      // Refresh user list to show updated status
      await fetchAdminData(page, appliedFilters)
    } catch (err) {
      console.error(`Error ${action} user:`, err)
      alert(`Erreur lors de la tentative de ${action} l'utilisateur.`)
    }
  }

  const toggleSelectedUser = (userId: string) => {
    setSelectedUserIds(current =>
      current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId].slice(0, 100)
    )
  }

  const toggleCurrentPage = () => {
    const pageIds = users.map(member => member.id)
    const allSelected = pageIds.every(id => selectedUserIds.includes(id))
    setSelectedUserIds(current =>
      allSelected
        ? current.filter(id => !pageIds.includes(id))
        : [...new Set([...current, ...pageIds])].slice(0, 100)
    )
  }

  const openSingleMessage = (userId: string) => {
    setSelectedUserIds([userId])
    setOutreachStatus('')
    setOutreachMode('message')
  }

  const sendSelectedMessage = async () => {
    setOutreachBusy(true)
    setOutreachStatus('')
    try {
      const result = await sendInternalMessageToSelectedUsers({
        userIds: selectedUserIds,
        title: messageForm.title,
        description: messageForm.description
      })
      setOutreachStatus(`${result.sentCount} message(s) remis dans la messagerie.`)
      setMessageForm(current => ({ ...current, description: '' }))
    } catch (error) {
      setOutreachStatus(error instanceof Error ? error.message : 'Envoi impossible.')
    } finally {
      setOutreachBusy(false)
    }
  }

  const prepareSelectedEmailCampaign = async () => {
    setOutreachBusy(true)
    setOutreachStatus('')
    try {
      const slug = `${emailForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`
      const template = await createEmailTemplate({
        name: emailForm.name,
        slug,
        subject: emailForm.subject,
        bodyHtml: emailForm.bodyHtml,
        bodyText: emailForm.bodyText,
        ctaLabel: 'Revenir sur le site',
        ctaUrl: '/discover',
        createdBy: user?.id
      })
      const result = await createEmailCampaignDraft({
        name: emailForm.name,
        templateId: template?.id,
        audienceFilter: { audience: 'manual', userIds: selectedUserIds },
        createdBy: user?.id
      })
      const prepared = await prepareCampaignRecipients(result.campaign.id)
      setOutreachStatus(
        `Campagne préparée : ${prepared.eligible} destinataire(s), ${prepared.excluded} exclu(s) selon leurs préférences.`
      )
    } catch (error) {
      setOutreachStatus(error instanceof Error ? error.message : 'Création de campagne impossible.')
    } finally {
      setOutreachBusy(false)
    }
  }

  const getGenderLabel = (genderKey: string) => {
    const labels: { [key: string]: string } = {
      'male': 'Hommes',
      'female': 'Femmes',
      'couple_mf': 'Couples H/F',
      'couple_mm': 'Couples H/H',
      'couple_ff': 'Couples F/F',
      'single_male': 'Homme seul',
      'single_female': 'Femme seule',
      'married_male': 'Homme marié',
      'married_female': 'Femme mariée',
      'other': 'Autre',
      // Ajoutez d'autres genres/types de profil de votre table user_profiles
    };
    return labels[genderKey.toLowerCase()] || genderKey;
  };

  const getProfileStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      couple: 'Couple',
      couple_mf: 'Couple H/F',
      single_male: 'Homme seul',
      single_female: 'Femme seule',
      single_man: 'Homme seul',
      single_woman: 'Femme seule',
      married_man: 'Homme marié',
      married_woman: 'Femme mariée'
    }
    return status ? labels[status] || status : 'Profil non renseigné'
  }

  const getOrientationLabel = (orientation?: string) => {
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
    return orientation ? labels[orientation] || orientation : 'Orientation non renseignée'
  }

  const activeFilterCount = [
    filters.search?.trim(),
    filters.accountStatus !== 'all' ? filters.accountStatus : '',
    filters.profileStatus !== 'all' ? filters.profileStatus : '',
    filters.gender !== 'all' ? filters.gender : '',
    filters.orientation !== 'all' ? filters.orientation : '',
    filters.meetingCriterion !== 'all' ? filters.meetingCriterion : '',
    filters.onboarding !== 'all' ? filters.onboarding : '',
    filters.visibility !== 'all' ? filters.visibility : ''
  ].filter(Boolean).length

  const appliedCriteria = [
    appliedFilters.search?.trim() ? `Recherche : « ${appliedFilters.search.trim()} »` : null,
    appliedFilters.profileStatus !== 'all' ? getProfileStatusLabel(appliedFilters.profileStatus) : null,
    appliedFilters.gender !== 'all' ? getGenderLabel(appliedFilters.gender || '') : null,
    appliedFilters.orientation !== 'all' ? getOrientationLabel(appliedFilters.orientation) : null,
    appliedFilters.meetingCriterion === 'open_couples' ? 'Ouverts aux couples' : null,
    appliedFilters.meetingCriterion === 'open_curtains' ? 'Rideaux ouverts' : null,
    appliedFilters.meetingCriterion === 'libertine' ? 'Libertin' : null,
    appliedFilters.accountStatus === 'active' ? 'Comptes actifs' : null,
    appliedFilters.accountStatus === 'banned' ? 'Comptes bannis' : null,
    appliedFilters.onboarding === 'complete' ? 'Parcours terminés' : null,
    appliedFilters.onboarding === 'incomplete' ? 'Parcours incomplets' : null,
    appliedFilters.visibility === 'visible' ? 'Profils visibles' : null,
    appliedFilters.visibility === 'hidden' ? 'Profils masqués' : null
  ].filter((criterion): criterion is string => Boolean(criterion))
  
  const genderChartData = genderCounts.map(item => ({
    name: getGenderLabel(item.gender),
    Nombre: item.count,
  }));

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container py-10 mx-auto px-4'> {/* Ajout de mx-auto et px-4 */}
          <AdminHeader user={user} />
          <AdminTabs />
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8'> {/* Responsive flex */}
            <h1 className='text-2xl font-bold mb-2 sm:mb-0'>Gestion des utilisateurs</h1>
            <Link
              href='#directory'
              className='rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-right transition hover:bg-primary/20'
            >
              <span className='block text-xs uppercase tracking-wide text-muted-foreground'>
                Tous les inscrits
              </span>
              <span className='text-lg font-bold'>{totalUsers}</span>{' '}
              utilisateurs
            </Link>
          </div>

          {/* Carte des statistiques par genre */}
          <Card className="mb-6 bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-xl">Statistiques par Genre/Type de Profil</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGenderCounts ? (
                <p className="text-gray-400">Chargement des statistiques...</p>
              ) : genderCounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {genderCounts.map((item) => (
                    <div key={item.gender} className="bg-gray-700 p-4 rounded-lg shadow">
                      <p className="font-medium text-gray-300">{getGenderLabel(item.gender)}</p>
                      <p className="text-2xl font-bold text-primary">{item.count}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">Aucune donnée de genre/type de profil disponible.</p>
              )}
              {/* Graphique */}
              {genderCounts.length > 0 && (
                <div className="mt-6 h-72 md:h-96">
                  <h3 className="text-lg font-semibold mb-2">Répartition visuelle</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genderChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                      <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568', color: '#E2E8F0' }}
                        itemStyle={{ color: '#E2E8F0' }}
                        cursor={{ fill: 'rgba(188, 82, 133, 0.2)' }}
                      />
                      <Legend wrapperStyle={{ color: '#E2E8F0' }} />
                      <Bar dataKey="Nombre" fill="#BC5285" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <section id='directory' className='mb-6 rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-sm'>
            <div className='mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-primary'>Annuaire des membres</p>
                <h2 className='text-xl font-semibold'>
                  {appliedCriteria.length > 0 ? 'Résultats de la recherche' : 'Tous les profils'}
                </h2>
                <p className='text-sm text-muted-foreground'>
                  {directoryTotal} résultat{directoryTotal > 1 ? 's' : ''}
                  {totalPages > 0 ? ` · page ${page} sur ${totalPages}` : ''} · 24 comptes par page
                </p>
              </div>
              <div className='flex items-center gap-2 self-end sm:self-start'>
                {activeFilterCount > 0 && (
                  <span className='text-xs text-muted-foreground'>
                    {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''}
                  </span>
                )}
                <Button
                  type='button'
                  variant={filtersOpen ? 'default' : 'outline'}
                  onClick={() => setFiltersOpen(open => !open)}
                  aria-expanded={filtersOpen}
                  title='Afficher ou masquer les filtres'
                >
                  <Filter className='mr-2 h-4 w-4' />
                  Filtrer
                  {activeFilterCount > 0 && (
                    <span className='ml-2 rounded-full bg-background/20 px-1.5 py-0.5 text-xs'>
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_230px_auto] md:items-end'>
              <label className='text-sm font-medium'>
                Rechercher dans les profils
                <div className='relative mt-1'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <input
                    type='search'
                    placeholder='Nom, email ou ville'
                    value={filters.search || ''}
                    onChange={event => setFilters(current => ({ ...current, search: event.target.value }))}
                    onKeyDown={event => {
                      if (event.key === 'Enter') runSearch()
                    }}
                    className='h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm'
                  />
                </div>
              </label>

              <label className='text-sm font-medium'>
                Profil recherché
                <select
                  value={filters.profileStatus || 'all'}
                  onChange={event => applyFilters({ ...filters, profileStatus: event.target.value })}
                  className='mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                >
                  <option value='all'>Tous les profils</option>
                  <option value='couple'>Couples</option>
                  <option value='couple_mf'>Couples H/F</option>
                  <option value='single_male'>Hommes seuls</option>
                  <option value='single_female'>Femmes seules</option>
                  <option value='single_man'>Hommes seuls (ancien format)</option>
                  <option value='single_woman'>Femmes seules (ancien format)</option>
                  <option value='married_man'>Hommes mariés</option>
                  <option value='married_woman'>Femmes mariées</option>
                </select>
              </label>

              <Button type='button' onClick={runSearch} disabled={loading}>
                <Search className='mr-2 h-4 w-4' />
                Rechercher
              </Button>
            </div>

            {filtersOpen && (
              <div className='mt-4 rounded-xl border border-border bg-muted/20 p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <p className='text-sm font-semibold'>Filtres avancés</p>
                  <Button type='button' variant='ghost' size='sm' onClick={resetSearch} disabled={loading}>
                    <RotateCcw className='mr-2 h-4 w-4' />
                    Réinitialiser
                  </Button>
                </div>

                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                  <label className='text-sm font-medium'>
                    Compte
                    <select
                      value={filters.accountStatus || 'all'}
                      onChange={event => applyFilters({ ...filters, accountStatus: event.target.value as AdminUserSearchFilters['accountStatus'] })}
                      className='mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                    >
                      <option value='all'>Tous les comptes</option>
                      <option value='active'>Actifs</option>
                      <option value='banned'>Bannis</option>
                    </select>
                  </label>

                  <label className='text-sm font-medium'>
                    Orientation
                    <select
                      value={filters.orientation || 'all'}
                      onChange={event => applyFilters({ ...filters, orientation: event.target.value })}
                      className='mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
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

                  <label className='text-sm font-medium'>
                    Genre
                    <select
                      value={filters.gender || 'all'}
                      onChange={event => applyFilters({ ...filters, gender: event.target.value })}
                      className='mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                    >
                      <option value='all'>Tous les genres</option>
                      <option value='male'>Homme</option>
                      <option value='female'>Femme</option>
                      <option value='couple_mf'>Couple H/F</option>
                      <option value='other'>Autre</option>
                    </select>
                  </label>

                  <label className='text-sm font-medium'>
                    Critère de rencontre
                    <select
                      value={filters.meetingCriterion || 'all'}
                      onChange={event => applyFilters({ ...filters, meetingCriterion: event.target.value as AdminUserSearchFilters['meetingCriterion'] })}
                      className='mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                    >
                      <option value='all'>Tous les critères</option>
                      <option value='open_couples'>Ouverts aux couples</option>
                      <option value='open_curtains'>Rideaux ouverts</option>
                      <option value='libertine'>Libertin</option>
                    </select>
                  </label>

                  <label className='text-sm font-medium'>
                    Parcours
                    <select
                      value={filters.onboarding || 'all'}
                      onChange={event => applyFilters({ ...filters, onboarding: event.target.value as AdminUserSearchFilters['onboarding'] })}
                      className='mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                    >
                      <option value='all'>Tous les parcours</option>
                      <option value='complete'>Parcours terminé</option>
                      <option value='incomplete'>À compléter</option>
                    </select>
                  </label>

                  <label className='text-sm font-medium'>
                    Visibilité du profil
                    <select
                      value={filters.visibility || 'all'}
                      onChange={event => applyFilters({ ...filters, visibility: event.target.value as AdminUserSearchFilters['visibility'] })}
                      className='mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                    >
                      <option value='all'>Toutes les visibilités</option>
                      <option value='visible'>Profil visible</option>
                      <option value='hidden'>Profil masqué</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex flex-wrap gap-2'>
                {appliedCriteria.length > 0 ? appliedCriteria.map(criterion => (
                  <span key={criterion} className='rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary'>
                    {criterion}
                  </span>
                )) : (
                  <span className='text-xs text-muted-foreground'>Tous les profils, sans filtre</span>
                )}
              </div>
              {appliedCriteria.length > 0 && (
                <Button type='button' variant='ghost' size='sm' onClick={resetSearch} disabled={loading}>
                  <X className='mr-2 h-4 w-4' />
                  Effacer la recherche
                </Button>
              )}
            </div>
          </section>

          {!loading && users.length > 0 && (
            <div className='mb-5 flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between'>
              <label className='flex cursor-pointer items-center gap-2 text-sm font-medium'>
                <Checkbox
                  checked={users.every(member => selectedUserIds.includes(member.id))}
                  onCheckedChange={toggleCurrentPage}
                  aria-label='Sélectionner tous les membres de cette page'
                />
                Sélectionner la page
              </label>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='mr-1 text-sm text-muted-foreground'>
                  {selectedUserIds.length} membre{selectedUserIds.length > 1 ? 's' : ''} sélectionné{selectedUserIds.length > 1 ? 's' : ''}
                </span>
                <Button
                  type='button'
                  variant='outline'
                  disabled={!selectedUserIds.length}
                  onClick={() => {
                    setOutreachStatus('')
                    setOutreachMode('message')
                  }}
                >
                  <MessageSquare className='mr-2 h-4 w-4' />
                  Message interne
                </Button>
                <Button
                  type='button'
                  disabled={!selectedUserIds.length}
                  onClick={() => {
                    setOutreachStatus('')
                    setOutreachMode('email')
                  }}
                >
                  <Mail className='mr-2 h-4 w-4' />
                  Campagne email
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className='rounded-xl border border-border p-8 text-center text-muted-foreground'>Chargement du répertoire...</div>
          ) : users.length === 0 ? (
            <div className='rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground'>
              Aucun inscrit ne correspond à ces critères.
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {users.map(u => (
                <Card
                  key={u.id}
                  className={u.is_banned ? 'overflow-hidden border-2 border-red-500' : 'overflow-hidden'}
                >
                  <div className='relative aspect-[16/9] overflow-hidden bg-muted'>
                    <ModerationAvatar
                      name={u.name || u.email || 'Membre'}
                      src={profileImage(u)}
                      className='h-full w-full rounded-none'
                    />
                    <label className='absolute left-3 top-3 flex cursor-pointer items-center gap-2 rounded-md bg-background/90 px-2.5 py-2 text-xs font-semibold shadow'>
                      <Checkbox
                        checked={selectedUserIds.includes(u.id)}
                        onCheckedChange={() => toggleSelectedUser(u.id)}
                        aria-label={`Sélectionner ${u.name || u.email || 'ce membre'}`}
                      />
                      Sélectionner
                    </label>
                  </div>
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex flex-wrap items-center gap-2 text-lg'>
                      <Link href={`/profile/${u.id}`} className='hover:text-primary hover:underline'>
                        {u.name || 'Membre sans pseudo'}
                      </Link>
                      <span className='text-xs font-normal text-muted-foreground'>({u.role})</span>
                      {u.is_banned && <span className='text-xs text-red-500'>(BANNI)</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='pt-0'>
                    <div className='mb-2 text-sm text-muted-foreground'>
                      {u.email}
                    </div>
                    <div className='mb-2 text-sm text-muted-foreground'>
                      {u.location || '-'} | {u.age ? `${u.age} ans` : '-'}
                    </div>
                    <div className='mb-3 flex flex-wrap gap-1.5 text-xs'>
                      <span className='rounded-full bg-primary/10 px-2 py-1 text-primary'>
                        {getProfileStatusLabel(u.profile_status)}
                      </span>
                      {u.gender && (
                        <span className='rounded-full bg-muted px-2 py-1 text-muted-foreground'>
                          {getGenderLabel(u.gender)}
                        </span>
                      )}
                      {u.orientation && (
                        <span className='rounded-full bg-muted px-2 py-1 text-muted-foreground'>
                          {getOrientationLabel(u.orientation)}
                        </span>
                      )}
                      {u.open_to_other_couples && (
                        <span className='rounded-full bg-muted px-2 py-1 text-muted-foreground'>Ouvert aux couples</span>
                      )}
                      {u.open_curtains && (
                        <span className='rounded-full bg-primary/10 px-2 py-1 text-primary'>Rideaux ouverts</span>
                      )}
                      {u.libertine && (
                        <span className='rounded-full bg-muted px-2 py-1 text-muted-foreground'>Libertin</span>
                      )}
                    </div>
                    <p className='mb-3 text-xs text-muted-foreground'>
                      Compte : {u.account_status || 'actif'} · Profil : {u.display_profile ? 'visible' : 'masqué'} · Parcours : {u.onboarding_completed ? 'terminé' : 'incomplet'}
                    </p>
                    <div className='mt-4 flex flex-wrap gap-2'>
                      <Button size='sm' variant='outline' onClick={() => openSingleMessage(u.id)}>
                        <MessageSquare className='mr-1.5 h-4 w-4' />
                        Écrire
                      </Button>
                      <Button size='sm' asChild>
                        <Link href={`/admin/users/${u.id}/edit`}>Éditer</Link>
                      </Button>
                      <Button
                        size='sm'
                        variant='destructive'
                        onClick={() => handleDelete(u.id)}
                      >
                        Supprimer
                      </Button>
                      <Button
                        size='sm'
                        variant={u.is_banned ? 'outline' : 'destructive'}
                        onClick={() =>
                          handleToggleBan(u.id, u.is_banned, u.name)
                        }
                      >
                        {u.is_banned ? 'Débannir' : 'Bannir'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && totalPages > 0 && (
            <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-sm text-muted-foreground'>Page {page} sur {totalPages} · {directoryTotal} résultat{directoryTotal > 1 ? 's' : ''}</p>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  disabled={page <= 1 || loading}
                  onClick={() => void fetchAdminData(page - 1, appliedFilters)}
                >
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Précédente
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled={page >= totalPages || loading}
                  onClick={() => void fetchAdminData(page + 1, appliedFilters)}
                >
                  Suivante
                  <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </div>
            </div>
          )}

          <Dialog open={outreachMode !== null} onOpenChange={open => !open && setOutreachMode(null)}>
            <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
              <DialogHeader>
                <DialogTitle>
                  {outreachMode === 'message' ? 'Message interne' : 'Campagne email ciblée'}
                </DialogTitle>
                <DialogDescription>
                  {selectedUserIds.length} membre{selectedUserIds.length > 1 ? 's' : ''} sélectionné{selectedUserIds.length > 1 ? 's' : ''}.
                  {outreachMode === 'email' && ' Les désinscriptions et consentements sont appliqués automatiquement.'}
                </DialogDescription>
              </DialogHeader>

              {outreachMode === 'message' ? (
                <div className='space-y-4'>
                  <label className='block space-y-1 text-sm font-medium'>
                    Titre de la notification
                    <input
                      value={messageForm.title}
                      onChange={event => setMessageForm(current => ({ ...current, title: event.target.value }))}
                      className='h-10 w-full rounded-md border border-input bg-background px-3'
                    />
                  </label>
                  <label className='block space-y-1 text-sm font-medium'>
                    Message
                    <Textarea
                      value={messageForm.description}
                      onChange={event => setMessageForm(current => ({ ...current, description: event.target.value }))}
                      rows={7}
                      placeholder='Votre réponse ou votre message de relance...'
                    />
                  </label>
                </div>
              ) : (
                <div className='space-y-4'>
                  <label className='block space-y-1 text-sm font-medium'>
                    Nom de la campagne
                    <input
                      value={emailForm.name}
                      onChange={event => setEmailForm(current => ({ ...current, name: event.target.value }))}
                      className='h-10 w-full rounded-md border border-input bg-background px-3'
                    />
                  </label>
                  <label className='block space-y-1 text-sm font-medium'>
                    Sujet
                    <input
                      value={emailForm.subject}
                      onChange={event => setEmailForm(current => ({ ...current, subject: event.target.value }))}
                      className='h-10 w-full rounded-md border border-input bg-background px-3'
                    />
                  </label>
                  <label className='block space-y-1 text-sm font-medium'>
                    Message email
                    <Textarea
                      value={emailForm.bodyText}
                      onChange={event => {
                        const bodyText = event.target.value
                        setEmailForm(current => ({
                          ...current,
                          bodyText,
                          bodyHtml: `<p>${bodyText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`
                        }))
                      }}
                      rows={8}
                    />
                  </label>
                </div>
              )}

              {outreachStatus && (
                <p className='rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm'>
                  {outreachStatus}
                </p>
              )}

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setOutreachMode(null)}>
                  Fermer
                </Button>
                <Button
                  type='button'
                  disabled={outreachBusy || !selectedUserIds.length || (outreachMode === 'message' ? messageForm.description.trim().length < 8 : !emailForm.subject.trim() || !emailForm.bodyText.trim())}
                  onClick={() => void (outreachMode === 'message' ? sendSelectedMessage() : prepareSelectedEmailCampaign())}
                >
                  {outreachBusy ? 'Traitement...' : outreachMode === 'message' ? 'Envoyer dans la messagerie' : 'Préparer la campagne'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
