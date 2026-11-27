'use client'

import { ProtectedRoute } from '@/components/protected-route'
import MainLayout from '@/components/layout/main-layout'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminMatchingCoverage } from '@/components/admin-matching-coverage'
import { AdminStats } from '@/components/admin-stats'
import { AdminMemberEngagementStats } from '@/components/admin-member-engagement-stats'
import { useAuth } from '@/contexts/auth-context'

export default function AdminStatsPage() {
  const { user } = useAuth()

  return <ProtectedRoute allowedRoles={['admin']}>
    <MainLayout user={user}>
      <div className='container py-10'>
        <AdminHeader user={user} />
        <AdminTabs />
        <h1 className='mb-6 text-2xl font-bold'>Statistiques</h1>
        <AdminMatchingCoverage />
        <AdminMemberEngagementStats />
        <AdminStats />
      </div>
    </MainLayout>
  </ProtectedRoute>
}
