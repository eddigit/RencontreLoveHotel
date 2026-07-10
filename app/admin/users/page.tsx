'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/protected-route'
import { 
  searchAdminUsers,
  type AdminUserSearchFilters,
  deleteUserByAdmin, 
  getTotalUsersCount,
  getUserCountsByGender // Importer la nouvelle action
} from '@/actions/user-actions'
import { banUser, unbanUser } from '@/actions/message-actions'
import MainLayout from '@/components/layout/main-layout'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminHeader } from '@/components/admin-header'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react'

// Define a more specific type for user data, including ban status
interface AdminUser {
  id: string
  name?: string
  email?: string
  role?: string
  avatar?: string
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

  const fetchAdminData = async (nextPage = 1, nextFilters = filters) => {
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
    void fetchAdminData(1)
  }, [])

  const runSearch = () => {
    void fetchAdminData(1, filters)
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
    setFilters(nextFilters)
    void fetchAdminData(1, nextFilters)
  }

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return
    await deleteUserByAdmin(userId)
    await fetchAdminData(page)
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
      await fetchAdminData(page)
    } catch (err) {
      console.error(`Error ${action} user:`, err)
      alert(`Erreur lors de la tentative de ${action} l'utilisateur.`)
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

          <section id='directory' className='mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm'>
            <div className='mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-primary'>Répertoire complet</p>
                <h2 className='text-xl font-semibold'>Ensemble des inscrits</h2>
                <p className='text-sm text-muted-foreground'>
                  {directoryTotal} résultat{directoryTotal > 1 ? 's' : ''} correspondant aux critères
                  {totalPages > 0 ? ` · page ${page} sur ${totalPages}` : ''}
                </p>
              </div>
              <span className='text-sm text-muted-foreground'>24 comptes par page</span>
            </div>

            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              <label className='text-sm font-medium'>
                Recherche
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
                Compte
                <select
                  value={filters.accountStatus || 'all'}
                  onChange={event => setFilters(current => ({ ...current, accountStatus: event.target.value as AdminUserSearchFilters['accountStatus'] }))}
                  className='mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                >
                  <option value='all'>Tous les comptes</option>
                  <option value='active'>Actifs</option>
                  <option value='banned'>Bannis</option>
                </select>
              </label>

              <label className='text-sm font-medium'>
                Type de profil
                <select
                  value={filters.profileStatus || 'all'}
                  onChange={event => setFilters(current => ({ ...current, profileStatus: event.target.value }))}
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

              <label className='text-sm font-medium'>
                Orientation
                <select
                  value={filters.orientation || 'all'}
                  onChange={event => setFilters(current => ({ ...current, orientation: event.target.value }))}
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
                  onChange={event => setFilters(current => ({ ...current, gender: event.target.value }))}
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
                  onChange={event => setFilters(current => ({ ...current, meetingCriterion: event.target.value as AdminUserSearchFilters['meetingCriterion'] }))}
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
                  onChange={event => setFilters(current => ({ ...current, onboarding: event.target.value as AdminUserSearchFilters['onboarding'] }))}
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
                  onChange={event => setFilters(current => ({ ...current, visibility: event.target.value as AdminUserSearchFilters['visibility'] }))}
                  className='mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
                >
                  <option value='all'>Toutes les visibilités</option>
                  <option value='visible'>Profil visible</option>
                  <option value='hidden'>Profil masqué</option>
                </select>
              </label>
            </div>

            <div className='mt-5 flex flex-col gap-3 sm:flex-row sm:items-center'>
              <Button type='button' onClick={runSearch} disabled={loading}>
                <Search className='mr-2 h-4 w-4' />
                Rechercher
              </Button>
              <Button type='button' variant='outline' onClick={resetSearch} disabled={loading}>
                <RotateCcw className='mr-2 h-4 w-4' />
                Réinitialiser
              </Button>
              <span className='text-xs text-muted-foreground'>La recherche s’effectue côté serveur sur l’ensemble des inscrits.</span>
            </div>
          </section>

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
                  className={u.is_banned ? 'border-red-500 border-2' : ''}
                >
                  <CardHeader>
                    <CardTitle>
                      {u.name}{' '}
                      <span className='text-xs text-muted-foreground'>
                        ({u.role})
                      </span>{' '}
                      {u.is_banned && (
                        <span className='text-red-500 text-xs'>(BANNI)</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                    <div className='flex gap-2 mt-4'>
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
                  onClick={() => void fetchAdminData(page - 1)}
                >
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Précédente
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled={page >= totalPages || loading}
                  onClick={() => void fetchAdminData(page + 1)}
                >
                  Suivante
                  <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
