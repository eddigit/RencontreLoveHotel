'use client'

import { ProtectedRoute } from '@/components/protected-route'
import MainLayout from '@/components/layout/main-layout'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminProductDiagnostic } from '@/components/admin-product-diagnostic'
import { useAuth } from '@/contexts/auth-context'

export default function AdminDiagnosticPage() {
  const { user } = useAuth()
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container py-10'>
          <AdminHeader user={user} />
          <AdminTabs />
          <AdminProductDiagnostic />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
