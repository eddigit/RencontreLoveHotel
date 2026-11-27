'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/protected-route'
import {
  getAllUsers,
  deleteUserByAdmin,
  getTotalUsersCount,
  setUserAdminStar, setModeratorSpotlight
} from '@/actions/user-actions'
import { banUser, unbanUser } from '@/actions/message-actions'
import MainLayout from '@/components/layout/main-layout'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminHeader } from '@/components/admin-header'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { MemberAvatarImage } from '@/components/member-avatar-image'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Search, Star, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { filterAdminUsers, getAdminUserCategory, type AdminPhotoFilter, type AdminUserFilter } from '@/lib/admin-user-filters'

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
  moderator_spotlight_at?: string | boolean | null
  admin_starred?: boolean
  has_eligible_photo?: boolean
  // Add any other properties that come from getAllUsers
  [key: string]: any // Keep it flexible for other existing props from Record<string, any>
}

const PAGE_SIZE = 24

const categoryLabels: Record<AdminUserFilter, string> = {
  all: 'Tous', woman: 'Femmes', man: 'Hommes', couple: 'Couples', other: 'Autres'
}

const profileLabels: Record<string, string> = {
  male: 'Homme', female: 'Femme', single_male: 'Homme seul', single_female: 'Femme seule',
  married_male: 'Homme marié', married_female: 'Femme mariée', couple_mf: 'Couple H/F',
  couple_mm: 'Couple H/H', couple_ff: 'Couple F/F', trans: 'Personne trans', single_trans: 'Personne trans'
}

const profileLabel = (user: Pick<AdminUser, 'gender' | 'profile_status'>) => {
  const value = user.gender || user.profile_status || ''
  return profileLabels[value.toLowerCase()] || value || 'Profil non renseigné'
}

export default function AdminUsersPage () {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  useEffect(() => {
    const member = new URLSearchParams(window.location.search).get('member')
    if (member && /^[a-f0-9-]{36}$/i.test(member)) setSearch(member)
  }, [])
  const [photoFilter, setPhotoFilter] = useState<AdminPhotoFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<AdminUserFilter>('all')
  const [page, setPage] = useState(1)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = previewId ? users.find(member => member.id === previewId) : undefined
  const [starFilter, setStarFilter] = useState<'all' | 'starred' | 'unstarred'>('all')
  const [moderatorsOnly, setModeratorsOnly] = useState(false)
  const showStarredOnly = starFilter === 'starred'
  const [starUpdatingIds, setStarUpdatingIds] = useState<Set<string>>(() => new Set())
  const pendingStarIds = useRef(new Set<string>())

  const fetchAdminData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersResult, totalCountResult] = await Promise.all([
        getAllUsers(),
        getTotalUsersCount()
      ])

      setUsers(usersResult as AdminUser[])
      setTotalUsers(totalCountResult)
    } catch (error) {
      console.error('Erreur lors de la récupération des données admin:', error)
      setUsers([])
      setTotalUsers(0)
    } finally {
      setLoading(false)
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

  const toggleModeratorLabel = async (member: AdminUser) => {
    if (pendingStarIds.current.has(member.id)) return
    pendingStarIds.current.add(member.id)
    setStarUpdatingIds(new Set(pendingStarIds.current))
    try {
      const selected = await setModeratorSpotlight(member.id, !member.moderator_spotlight_at)
      setUsers(current => current.map(item => item.id === member.id ? { ...item, moderator_spotlight_at: selected } : item))
    } catch {
      alert('Le statut de présentation n’a pas pu être enregistré.')
    } finally {
      pendingStarIds.current.delete(member.id)
      setStarUpdatingIds(new Set(pendingStarIds.current))
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

  const filteredUsers = useMemo(() => filterAdminUsers(users, {
    search,
    photo: photoFilter,
    category: categoryFilter,
    starredOnly: showStarredOnly, unstarredOnly: starFilter === 'unstarred', moderatorsOnly
  }), [users, search, photoFilter, categoryFilter, starFilter, showStarredOnly, moderatorsOnly])
  const categoryCounts = useMemo(() => (Object.keys(categoryLabels) as AdminUserFilter[]).reduce<Record<AdminUserFilter, number>>((counts, category) => {
    counts[category] = filterAdminUsers(users, {
      search,
      photo: photoFilter,
      category,
      starredOnly: showStarredOnly, unstarredOnly: starFilter === 'unstarred', moderatorsOnly
    }).length
    return counts
  }, { all: 0, woman: 0, man: 0, couple: 0, other: 0 }), [users, search, photoFilter, starFilter, showStarredOnly, moderatorsOnly])
  const distributionData = useMemo(() => (Object.keys(categoryLabels) as Exclude<AdminUserFilter, 'all'>[])
    .map(category => ({ name: categoryLabels[category], Nombre: filteredUsers.filter(user => getAdminUserCategory(user) === category).length }))
    .filter(item => item.Nombre > 0), [filteredUsers])
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const resetPage = () => setPage(1)
  const hasActiveFilters = search.trim() || photoFilter !== 'all' || categoryFilter !== 'all' || starFilter !== 'all' || moderatorsOnly

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container py-8 mx-auto px-4'>
          <AdminHeader user={user} />
          <AdminTabs />
          <div className='mb-6 rounded-2xl border border-[#d6b36a]/30 bg-[#1d1d20] p-5 text-[#f8f2e8] shadow-xl shadow-black/20'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b36a]'>Administration</p>
                <h1 className='mt-1 text-2xl font-semibold'>Utilisateurs</h1>
              </div>
              <p className='text-sm text-[#d9d4cb]'><span className='font-semibold text-[#f2d79a]'>{filteredUsers.length}</span> résultat{filteredUsers.length > 1 ? 's' : ''} affiché{filteredUsers.length > 1 ? 's' : ''} · {totalUsers} comptes</p>
            </div>
          </div>
          <Card className='mb-6 border-[#d6b36a]/25 bg-[#252529] text-[#f8f2e8]'>
            <CardContent className='space-y-4 p-4 sm:p-5'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d6b36a]' />
                <label htmlFor='admin-user-search' className='sr-only'>Rechercher un utilisateur</label>
                <input
              id='admin-user-search'
              type='text'
              placeholder='Rechercher un nom, un email ou une ville…'
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage() }}
              className='w-full rounded-xl border border-white/15 bg-[#18181b] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#d6b36a] focus:outline-none'
            />
              </div>
              <div className='flex flex-wrap gap-2' aria-label='Filtrer par photo'>
                {([['all', 'Toutes les photos'], ['with-photo', 'Avec photo'], ['without-photo', 'Sans photo']] as const).map(([value, label]) => <Button key={value} size='sm' variant={photoFilter === value ? 'default' : 'outline'} aria-pressed={photoFilter === value} className={photoFilter === value ? 'bg-[#d6b36a] text-[#171719] hover:bg-[#ecd08f]' : 'border-white/15 bg-transparent text-[#e8e1d6] hover:bg-white/10'} onClick={() => { setPhotoFilter(value); resetPage() }}>{label}</Button>)}
                <Button size='sm' variant={showStarredOnly ? 'default' : 'outline'} aria-pressed={showStarredOnly} className={showStarredOnly ? 'bg-[#d6b36a] text-[#171719] hover:bg-[#ecd08f]' : 'border-white/15 bg-transparent text-[#e8e1d6] hover:bg-white/10'} onClick={() => { setStarFilter(showStarredOnly ? 'all' : 'starred'); resetPage() }}><Star className='mr-1 h-3.5 w-3.5' fill={showStarredOnly ? 'currentColor' : 'none'} />Favoris</Button>
                <Button size='sm' variant={starFilter === 'unstarred' ? 'default' : 'outline'} aria-pressed={starFilter === 'unstarred'} onClick={() => { setStarFilter(starFilter === 'unstarred' ? 'all' : 'unstarred'); resetPage() }}>Hors favoris</Button>
                <Button size='sm' variant={moderatorsOnly ? 'default' : 'outline'} aria-pressed={moderatorsOnly} onClick={() => { setModeratorsOnly(value => !value); resetPage() }}>Modérateurs</Button>
              </div>
              <div className='flex flex-wrap gap-2 border-t border-white/10 pt-4' aria-label='Filtrer par type de profil'>
                {(Object.keys(categoryLabels) as AdminUserFilter[]).map(value => <Button key={value} size='sm' variant={categoryFilter === value ? 'default' : 'outline'} aria-pressed={categoryFilter === value} aria-label={`${categoryLabels[value]}, ${categoryCounts[value]} résultat${categoryCounts[value] > 1 ? 's' : ''} avec les autres filtres actifs`} className={categoryFilter === value ? 'bg-[#d6b36a] text-[#171719] hover:bg-[#ecd08f]' : 'border-white/15 bg-transparent text-[#e8e1d6] hover:bg-white/10'} onClick={() => { setCategoryFilter(value); resetPage() }}>{categoryLabels[value]} <span className='ml-1 opacity-70' aria-hidden='true'>{categoryCounts[value]}</span></Button>)}
                {hasActiveFilters && <Button size='sm' variant='ghost' className='text-[#f2d79a] hover:bg-white/10 hover:text-[#f2d79a]' onClick={() => { setSearch(''); setPhotoFilter('all'); setCategoryFilter('all'); setStarFilter('all'); setModeratorsOnly(false); resetPage() }}><X className='mr-1 h-3.5 w-3.5' />Réinitialiser</Button>}
              </div>
            </CardContent>
          </Card>
          {loading ? (
            <div>Chargement...</div>
          ) : filteredUsers.length === 0 ? (
            <p role='status' className='text-sm text-muted-foreground'>
              {showStarredOnly && !search.trim() ? 'Aucun profil mis en avant pour le moment.' : 'Aucun profil trouvé.'}
            </p>
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
              {paginatedUsers.map(u => (
                <Card
                  key={u.id}
                  className={`overflow-hidden border-[#d6b36a]/20 bg-[#252529] text-[#f8f2e8] transition hover:border-[#d6b36a]/60 ${u.is_banned ? 'border-red-500 border-2' : ''}`}
                >
                  <div className='relative aspect-[4/3] bg-[#18181b]'>
                    <button type='button' disabled={!u.has_eligible_photo} onClick={() => setPreviewId(u.id)} aria-label={`Agrandir la photo de ${u.name || 'ce membre'}`} className='h-full w-full enabled:cursor-zoom-in'>
                      <MemberAvatarImage
                        src={u.image}
                        gender={u.gender}
                        profileStatus={u.profile_status}
                        alt={`Photo de ${u.name || 'membre'}`}
                        className='h-full w-full object-cover'
                      />
                    </button>
                    {u.admin_starred && <span className='absolute right-3 top-3 rounded-full bg-[#d6b36a] p-2 text-[#171719] shadow-lg'><Star className='h-4 w-4' fill='currentColor' /></span>}
                  </div>
                  <CardContent className='p-4'>
                    <div className='mb-3 min-w-0'><p className='truncate font-semibold'>{u.name || 'Membre sans nom'} {u.is_banned && <span className='text-xs text-red-400'>(BANNI)</span>}</p><p className='truncate text-xs text-zinc-400'>{u.email || 'Email non renseigné'}</p><p className='mt-1 text-xs text-[#d9d4cb]'>{u.location || 'Localisation non renseignée'} · {u.age ? `${u.age} ans` : 'Âge non renseigné'}</p><div className='mt-2 flex flex-wrap gap-1.5 text-[11px]'><span className='rounded-full border border-[#d6b36a]/30 bg-[#1d1d20] px-2 py-0.5 text-[#f2d79a]'>{profileLabel(u)}</span><span className='rounded-full border border-white/10 bg-[#1d1d20] px-2 py-0.5 text-zinc-300'>Rôle : {u.role || 'utilisateur'}</span></div></div>
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
                      <Button size='sm' variant={u.moderator_spotlight_at ? 'default' : 'outline'}
                        disabled={starUpdatingIds.has(u.id)} aria-pressed={Boolean(u.moderator_spotlight_at)}
                        title="Statut de présentation. Priorité supérieure quand le profil est aussi favori et possède une photo."
                        onClick={() => toggleModeratorLabel(u)}>Modérateur</Button>
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
          {!loading && filteredUsers.length > PAGE_SIZE && <nav className='mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-[#1d1d20] p-3 text-sm text-[#e8e1d6]' aria-label='Pagination des utilisateurs'><span>Page {currentPage} sur {pageCount}</span><div className='flex gap-2'><Button size='sm' variant='outline' className='border-white/15 bg-transparent text-[#e8e1d6]' disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Précédent</Button><Button size='sm' variant='outline' className='border-white/15 bg-transparent text-[#e8e1d6]' disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Suivant</Button></div></nav>}
          {!loading && distributionData.length > 0 && <details className='mt-6 rounded-xl border border-[#d6b36a]/20 bg-[#1d1d20] p-4 text-[#f8f2e8]'><summary className='cursor-pointer font-medium text-[#f2d79a]'>Répartition des {filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''}</summary><p className='mt-2 text-xs text-zinc-400'>Le graphique tient compte de tous les filtres actifs.</p><div className='mt-4 h-64 sm:h-80'><ResponsiveContainer width='100%' height='100%'><BarChart data={distributionData} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}><CartesianGrid strokeDasharray='3 3' stroke='#45403a' /><XAxis dataKey='name' tick={{ fill: '#d9d4cb', fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fill: '#d9d4cb', fontSize: 12 }} /><Tooltip contentStyle={{ backgroundColor: '#252529', border: '1px solid #d6b36a', borderRadius: '8px', color: '#f8f2e8' }} cursor={{ fill: 'rgba(214, 179, 106, 0.12)' }} /><Bar dataKey='Nombre' fill='#d6b36a' radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></details>}
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
