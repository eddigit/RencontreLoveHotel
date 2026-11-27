'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { ProtectedRoute } from '@/components/protected-route'
import { Users, Calendar, MessageSquare, BarChart3, ListChecks, Lightbulb, ShieldCheck, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import MainLayout from '@/components/layout/main-layout'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminHeader } from '@/components/admin-header'
import { useEffect, useState } from 'react'
import { AdminMessagingRecovery } from '@/components/admin-messaging-recovery'
import { AdminLoginStatus } from '@/components/admin-login-status'
import { getRoadmapSummary, roadmapItems } from '@/lib/admin-roadmap'
import { JougPilotAdmin } from '@/components/admin/joug-pilot-admin'
import { ComplianceReadiness } from '@/components/admin/compliance-readiness'
import { getAdminOverviewCounts } from '@/actions/admin-stats-actions'

export default function AdminPage () {
  const { user } = useAuth()
  const [overview, setOverview] = useState<{
    users: number
    upcomingEvents: number
  } | null>(null)
  const [overviewError, setOverviewError] = useState(false)
  const roadmapSummary = getRoadmapSummary(roadmapItems)

  useEffect(() => {
    let active = true

    async function fetchDashboardData () {
      try {
        const counts = await getAdminOverviewCounts()
        if (!active) return
        setOverview(counts)
        setOverviewError(false)
      } catch (error) {
        console.error('Compteurs administrateur indisponibles:', error)
        if (active) setOverviewError(true)
      }
    }
    fetchDashboardData()
    return () => {
      active = false
    }
  }, [])

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container py-10'>
          <AdminHeader user={user} />
          <AdminTabs />

          <section aria-label='Suivi de la communauté' className='mb-8 grid gap-3 md:grid-cols-2'>
            <Link href='/admin/idees' className='group flex items-center gap-4 rounded-2xl border border-[#d6bc87]/30 bg-[#d6bc87]/[0.07] p-5 transition hover:border-[#d6bc87]/60 focus-visible:ring-2 focus-visible:ring-[#d6bc87]'>
              <Lightbulb aria-hidden='true' className='h-6 w-6 shrink-0 text-[#d6bc87]' />
              <div className='min-w-0 flex-1'><h2 className='text-xl font-bold text-white'>Boîte à idées</h2><p className='mt-1 text-sm text-white/70'>Lire et suivre les idées et les problèmes envoyés par les membres.</p></div>
              <ArrowUpRight aria-hidden='true' className='h-5 w-5 shrink-0 text-[#d6bc87]' />
            </Link>
            <Link href='/admin/moderation' className='group flex items-center gap-4 rounded-2xl border border-[#d6bc87]/25 bg-[#d6bc87]/[0.06] p-5 transition hover:border-[#d6bc87]/60 focus-visible:ring-2 focus-visible:ring-[#d6bc87]'>
              <ShieldCheck aria-hidden='true' className='h-6 w-6 shrink-0 text-[#d6bc87]' />
              <div className='min-w-0 flex-1'><h2 className='text-xl font-bold text-white'>Modération</h2><p className='mt-1 text-sm text-white/70'>Examiner les alertes et ouvrir les dossiers concernés.</p></div>
              <ArrowUpRight aria-hidden='true' className='h-5 w-5 shrink-0 text-[#d6bc87]' />
            </Link>
          </section>

          <section className='mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d6bc87]/25 bg-[#191a1c] p-5'>
            <div>
              <h2 className='text-lg font-bold'>Audience du site</h2>
              <p className='mt-1 max-w-xl text-sm text-muted-foreground'>Visiteurs mesurés et pages vues, par jour et par domaine. Les espaces membres sont regroupés pour préserver la confidentialité.</p>
            </div>
            <a className='rounded-xl border border-[#d6bc87]/50 px-4 py-2 text-sm font-semibold text-[#d6bc87]' href='https://vercel.com/gilles-korzec-projects/love-hotel-rencontre/analytics' target='_blank' rel='noreferrer'>Consulter les visites ↗</a>
          </section>
          <AdminMessagingRecovery />

          <AdminLoginStatus />

          <JougPilotAdmin />
          <ComplianceReadiness />
          {/* Actions rapides */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Actions Rapides
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='flex items-center'>
                    <Users className='mr-2 h-5 w-5' />
                    Gestion des utilisateurs
                  </CardTitle>
                  <CardDescription>
                    Gérer les comptes utilisateurs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground mb-4'>
                    {overview
                      ? `${overview.users.toLocaleString('fr-FR')} utilisateurs enregistrés`
                      : overviewError
                        ? 'Indisponible'
                        : 'Chargement…'}
                  </p>
                  <Button className='w-full' asChild>
                    <Link href='/admin/users'>Voir les utilisateurs</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='flex items-center'>
                    <Calendar className='mr-2 h-5 w-5' />
                    Événements
                  </CardTitle>
                  <CardDescription>Gérer les événements à venir</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground mb-4'>
                    {overview
                      ? `${overview.upcomingEvents.toLocaleString('fr-FR')} événements à venir`
                      : overviewError
                        ? 'Indisponible'
                        : 'Chargement…'}
                  </p>
                  <Button className='w-full' asChild>
                    <Link href='/admin/events'>Gérer les événements</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='flex items-center'>
                    <MessageSquare className='mr-2 h-5 w-5' />
                    Messages
                  </CardTitle>
                  <CardDescription>
                    Consulter et gérer les messages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground mb-4'>
                    Accéder à la messagerie
                  </p>
                  <Button className='w-full' asChild>
                    <Link href='/admin/messages'>Gérer les messages</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='flex items-center'>
                    <ListChecks className='mr-2 h-5 w-5' />
                    Roadmap
                  </CardTitle>
                  <CardDescription>
                    Suivre les points OK, pas bons, développés et à traiter
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='mb-4 grid grid-cols-4 gap-2 text-center text-xs'>
                    <div className='rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-2'>
                      <div className='font-bold text-emerald-300'>{roadmapSummary.ok}</div>
                      <div className='text-muted-foreground'>OK</div>
                    </div>
                    <div className='rounded border border-red-500/20 bg-red-500/10 px-2 py-2'>
                      <div className='font-bold text-red-300'>{roadmapSummary.issue}</div>
                      <div className='text-muted-foreground'>Pas bons</div>
                    </div>
                    <div className='rounded border border-[#d6bc87]/20 bg-[#d6bc87]/10 px-2 py-2'>
                      <div className='font-bold text-[#d6bc87]'>{roadmapSummary.developed}</div>
                      <div className='text-muted-foreground'>Livrés</div>
                    </div>
                    <div className='rounded border border-sky-500/20 bg-sky-500/10 px-2 py-2'>
                      <div className='font-bold text-sky-300'>{roadmapSummary.planned}</div>
                      <div className='text-muted-foreground'>À faire</div>
                    </div>
                  </div>
                  <Button className='w-full' asChild>
                    <Link href='/admin/roadmap'>Ouvrir la roadmap</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
