'use client'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { MobileNavigation } from '@/components/mobile-navigation'
import { useState, useEffect, useContext, useCallback } from 'react'
import {
  AdvancedFilters,
  defaultFilters,
  FilterOptions
} from '@/components/advanced-filters'
import { ProfileCard } from '@/components/profile-card'
import { useAuth } from '@/contexts/auth-context'
import { motion } from 'framer-motion'
import MainLayout from '@/components/layout/main-layout'
import { useRouter } from 'next/navigation'
import { getDiscoverProfiles } from '@/actions/user-actions'

export default function DiscoverPage () {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Use the imported defaultFilters for initial state
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters)

  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchProfiles = useCallback(
    async (page: number, currentFilters?: FilterOptions) => {
      if (!user?.id) return

      setLoading(true)
      try {
        // Pass the current filters to getDiscoverProfiles
        const result = await getDiscoverProfiles(
          user.id,
          page,
          50,
          currentFilters || filters
        )

        setProfiles(prev =>
          page === 1 ? result.profiles : [...prev, ...result.profiles]
        )
        setTotalPages(result.totalPages)
        setHasMore(result.hasMore)
      } catch (error) {
        console.error('Error fetching profiles:', error)
      } finally {
        setLoading(false)
      }
    },
    [user?.id, filters]
  ) // Added filters to dependency array

  useEffect(() => {
    if (isLoading) return // Wait for session to load
    if (!user) {
      router.push('/login')
      return
    }
    // Pass filters to the initial fetchProfiles call
    fetchProfiles(currentPage, filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router, currentPage, filters]) // Removed fetchProfiles from deps, added filters

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to page 1 when filters change
    // Pass newFilters directly to fetchProfiles
    fetchProfiles(1, newFilters)
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      // Pass current filters to fetchProfiles when loading more
      fetchProfiles(nextPage, filters)
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('nearby')

  // Filtered profiles based on search query (like /admin/users)
  const filteredProfiles = searchQuery.trim()
    ? profiles.filter(
        p =>
          (p.name &&
            p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.location &&
            p.location.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : profiles

  if (!user?.onboardingCompleted) {
    return (
      <MainLayout user={user}>
        <div className='container mx-auto px-4 py-8'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold mb-4'>Complétez votre profil</h2>
            <p className='mb-4'>
              Vous devez compléter votre profil pour accéder à cette page.
            </p>
            <Button onClick={() => router.push('/onboarding')}>
              Compléter mon profil
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout user={user}>
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-8'>Discover</h1>
        <div className='flex flex-col sm:flex-row items-stretch gap-2 mb-8'>
          <AdvancedFilters onFilterChange={handleFilterChange} />
          <div className='relative w-full max-w-md'>
            <Input
              type='text'
              placeholder='Rechercher par nom ou lieu...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-10'
            />
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          </div>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6'>
          {filteredProfiles.map(profile => (
            <ProfileCard
              key={profile.id}
              id={profile.id}
              name={profile.name}
              age={profile.age}
              location={profile.location}
              image={profile.image || ''}
              popularity={profile.popularity || 0}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className='mt-8 flex justify-center gap-2'>
            <Button
              variant='outline'
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <div className='flex items-center gap-2'>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button variant='outline' onClick={loadMore} disabled={!hasMore}>
              Suivant
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
