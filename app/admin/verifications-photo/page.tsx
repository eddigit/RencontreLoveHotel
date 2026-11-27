import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import MainLayout from '@/components/layout/main-layout'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminPhotoVerificationQueue } from '@/components/admin-photo-verification-queue'
import { getAdminPhotoVerificationRequests, reviewPhotoVerificationRequest } from '@/actions/photo-verification-actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Vérifications photo · Administration', robots: { index: false, follow: false } }

export default async function AdminPhotoVerificationsPage () {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin') redirect('/unauthorized')
  const requests = await getAdminPhotoVerificationRequests().catch(() => null)

  return (
    <MainLayout user={session.user}>
      <div className='container py-8'>
        <AdminHeader user={session.user} />
        <AdminTabs />
        {requests
          ? <AdminPhotoVerificationQueue requests={requests} onReview={reviewPhotoVerificationRequest} />
          : <p role='alert' className='rounded-xl border border-rose-300/30 bg-rose-950/30 p-4 text-rose-100'>La file de vérifications est temporairement indisponible. Actualisez la page pour réessayer.</p>}
      </div>
    </MainLayout>
  )
}
