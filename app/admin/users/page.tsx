'use client'

import { useEffect, useState, useCallback, useRef } from 'react' // Ajout de useCallback
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/protected-route'
import {
  getAllUsers,
  deleteUserByAdmin,
  getTotalUsersCount,
  getUserCountsByGender,
  setUserAdminStar // Importer la nouvelle action
} from '@/actions/user-actions'
import { banUser, unbanUser } from '@/actions/message-actions'
import MainLayout from '@/components/layout/main-layout'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminHeader } from '@/components/admin-header'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { MemberAvatarImage } from '@/components/member-avatar-image'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Pour le graphique
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Star } from 'lucide-react'

// Define a more specific type for user data, including ban status
interface AdminUser {
  id: string
  name?: string
  email?: string
  role?: string
  avatar?: string
  image?: string | null
  location?: string
  age?: number
  gender?: string | null
  profile_status?: string | null
  is_banned?: boolean
  status?: string
  admin_starred_at?: string | null
  admin_starred?: boolean
  has_eligible_photo?: boolean
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
  const [genderCounts, setGenderCounts] = useState<GenderCount[]>([]); // Nouvel état
  const [loading, setLoading] = useState(true)
  const [loadingGenderCounts, setLoadingGenderCounts] = useState(true); // Nouvel état de chargement
  const [search, setSearch] = useState('')
  const [photosOnly, setPhotosOnly] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = previewId ? users.find(member => member.id === previewId) : undefined
  const [showStarredOnly, setShowStarredOnly] = useState(false)
  const [starUpdatingIds, setStarUpdatingIds] = useState<Set<string>>(() => new Set())
  const pendingStarIds = useRef(new Set<string>())

  const fetchAdminData = useCallback(async () => { // Renommer et utiliser useCallback
    setLoading(true);
    setLoadingGenderCounts(true);

    try {
      const [usersResult, totalCountResult, genderCountsResult] = await Promise.all([
        getAllUsers(),
        getTotalUsersCount(),
        getUserCountsByGender()
      ]);

      setUsers(usersResult as AdminUser[]);
      setTotalUsers(totalCountResult);
      setGenderCounts(genderCountsResult || []);

    } catch (error) {
      console.error("Erreur lors de la récupération des données admin:", error);
      // Gérer les erreurs individuelles si nécessaire ou afficher un message global
      setUsers([]);
      setTotalUsers(0);
      setGenderCounts([]);
    } finally {
      setLoading(false);
      setLoadingGenderCounts(false);
    }
  }, []);


  useEffect(() => {
    fetchAdminData() // Appeler la nouvelle fonction
  }, [fetchAdminData])

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return
    await deleteUserByAdmin(userId)
    setUsers(users.filter(u => u.id !== userId))
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
      await fetchAdminData() // Mettre à jour toutes les données
    } catch (err) {
      console.error(`Error ${action} user:`, err)
      alert(`Erreur lors de la tentative de ${action} l'utilisateur.`)
    }
  }

  const handleToggleAdminStar = async (member: AdminUser) => {
    if (pendingStarIds.current.has(member.id)) return

    const nextStarred = !member.admin_starred
    pendingStarIds.current.add(member.id)
    setStarUpdatingIds(current => new Set(current).add(member.id))

    try {
      const result = await setUserAdminStar(member.id, nextStarred)
      setUsers(current => current.map(user => user.id === member.id
        ? {
            ...user,
            admin_starred_at: result.adminStarredAt,
            admin_starred: Boolean(result.adminStarredAt)
          }
        : user))
    } catch (error) {
      console.error('Erreur de mise à jour de la mise en avant:', error)
      alert('La mise en avant n’a pas pu être enregistrée.')
    } finally {
      pendingStarIds.current.delete(member.id)
      setStarUpdatingIds(current => {
        const next = new Set(current)
        next.delete(member.id)
        return next
      })
    }
  }

  const filteredUsers = users.filter(
    u =>
      (!photosOnly || u.has_eligible_photo) && (!showStarredOnly || u.admin_starred) && (
        !search.trim() || u.name?.toLowerCase().includes(search.trim().toLowerCase()) ||
        u.email?.toLowerCase().includes(search.trim().toLowerCase())
      )
  )

  const getGenderLabel = (genderKey: string) => {
    const labels: { [key: string]: string } = {
      'male': 'Hommes',
      'female': 'Femmes',
      'couple_mf': 'Couples H/F',
      'couple_mm': 'Couples H/H',
      'couple_ff': 'Couples F/F',
      'single_male': 'Homme seul',
      'single_female': 'Femme seule',
      'single_trans': 'Personne trans',
      'trans': 'Personne trans',
      'married_male': 'Homme marié',
      'married_female': 'Femme mariée',
      'other': 'Autre',
      // Ajoutez d'autres genres/types de profil de votre table user_profiles
    };
    return labels[genderKey.toLowerCase()] || genderKey;
  };

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
            <div className='text-lg'>
              Total : <span className='font-bold'>{totalUsers}</span> utilisateurs
            </div>
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

          <div className='mb-6 flex flex-wrap items-center gap-3'>
            <input
              type='text'
              placeholder='Rechercher par nom ou email...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full max-w-md border rounded p-2'
            />
            <label className='flex items-center gap-2 text-sm font-medium'>
              <input type='checkbox' checked={photosOnly} onChange={event => setPhotosOnly(event.target.checked)} />
              Avec photo de profil
            </label>
            <label className='flex items-center gap-2 text-sm font-medium'>
              <input
                type='checkbox'
                checked={showStarredOnly}
                onChange={event => setShowStarredOnly(event.target.checked)}
              />
              Voir uniquement les profils mis en avant
            </label>
          </div>
          {loading ? (
            <div>Chargement...</div>
          ) : filteredUsers.length === 0 ? (
            <p role='status' className='text-sm text-muted-foreground'>
              {showStarredOnly && !search.trim() ? 'Aucun profil mis en avant pour le moment.' : 'Aucun profil trouvé.'}
            </p>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {filteredUsers.map(u => (
                <Card
                  key={u.id}
                  className={u.is_banned ? 'border-red-500 border-2' : ''}
                >
                  <CardHeader>
                    <CardTitle className='flex items-center gap-3'>
                      <button type='button' disabled={!u.has_eligible_photo} onClick={() => setPreviewId(u.id)}
                        aria-label={`Agrandir la photo de ${u.name || 'ce membre'}`} className='shrink-0 rounded-lg enabled:cursor-zoom-in'>
                      <MemberAvatarImage
                        src={u.image}
                        gender={u.gender}
                        profileStatus={u.profile_status}
                        alt={`Photo de ${u.name || 'membre'}`}
                        className='h-20 w-20 shrink-0 rounded-lg border border-white/15 object-cover'
                      />
                      </button>
                      <span>{u.name}{' '}
                      <span className='text-xs text-muted-foreground'>
                        ({u.role})
                      </span>{' '}
                      {u.is_banned && (
                        <span className='text-red-500 text-xs'>(BANNI)</span>
                      )}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='mb-2 text-sm text-muted-foreground'>
                      {u.email}
                    </div>
                    <div className='mb-2 text-sm text-muted-foreground'>
                      {u.location || '-'} | {u.age ? `${u.age} ans` : '-'}
                    </div>
                    <div className='mt-4 flex flex-wrap gap-2'>
                      <Button
                        size='sm'
                        variant={u.admin_starred ? 'default' : 'outline'}
                        aria-pressed={Boolean(u.admin_starred)}
                        disabled={starUpdatingIds.has(u.id) || (!u.admin_starred && !u.has_eligible_photo)}
                        onClick={() => handleToggleAdminStar(u)}
                        title={u.admin_starred
                          ? 'Retirer la mise en avant'
                          : u.has_eligible_photo
                            ? 'Mettre en avant'
                            : 'Une photo membre éligible est requise'}
                      >
                        <Star className='mr-1 h-4 w-4' fill={u.admin_starred ? 'currentColor' : 'none'} />
                        {u.admin_starred ? 'Mis en avant' : 'Mettre en avant'}
                      </Button>
                      {!u.admin_starred && !u.has_eligible_photo && (
                        <span className='self-center text-xs text-muted-foreground'>Photo membre requise</span>
                      )}
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
        </div>
        <Dialog open={Boolean(preview)} onOpenChange={open => { if (!open) setPreviewId(null) }}>
          {preview && <DialogContent className='max-w-lg'>
            <DialogTitle>{preview.name || 'Profil membre'}</DialogTitle>
            <DialogDescription>Photo de profil affichée aux membres</DialogDescription>
            <MemberAvatarImage src={preview.image} gender={preview.gender} profileStatus={preview.profile_status}
              alt={`Portrait de ${preview.name || 'ce membre'}`} className='max-h-[55dvh] w-full rounded-lg object-contain' />
            <Button aria-pressed={Boolean(preview.admin_starred)} disabled={starUpdatingIds.has(preview.id)}
              onClick={() => handleToggleAdminStar(preview)}>
              <Star className='mr-2 h-4 w-4' fill={preview.admin_starred ? 'currentColor' : 'none'} />
              {preview.admin_starred ? 'Retirer la mise en avant' : 'Mettre en avant'}
            </Button>
          </DialogContent>}
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  )
}
