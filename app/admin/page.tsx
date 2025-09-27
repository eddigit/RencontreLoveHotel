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
import { Users, Calendar, Settings, MessageSquare, BarChart3, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import MainLayout from '@/components/layout/main-layout'
import { AdminTabs } from '@/components/admin-tabs'
import { AdminHeader } from '@/components/admin-header'
import { getAllUsers } from '@/actions/user-actions'
import { getUpcomingEvents } from '@/actions/event-actions'
import { useEffect, useState } from 'react'
import { AdminStats } from '@/components/admin-stats'
import { AdminRealTimeStats } from '@/components/admin-real-time-stats'

export default function AdminPage () {
  const { user } = useAuth()
  const [userCount, setUserCount] = useState(0)
  const [eventCount, setEventCount] = useState(0)

  useEffect(() => {
    async function fetchDashboardData () {
      const users = await getAllUsers()
      setUserCount(users.length)
      const events = await getUpcomingEvents()
      setEventCount(events.length)
    }
    fetchDashboardData()
  }, [])

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container py-10'>
          <AdminHeader user={user} />
          <AdminTabs />
          
          {/* Nouvelles statistiques temps réel */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              <h2 className="text-2xl font-bold">Tableau de Bord en Temps Réel</h2>
            </div>
            <AdminRealTimeStats />
          </div>

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
                    {userCount} utilisateurs enregistrés
                    {/* , X actifs aujourd'hui */}
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
                    {eventCount} événements à venir
                    {/* , X nécessitent votre attention */}
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
            </div>
          </div>

          {/* Statistiques détaillées (graphiques existants) */}
          <AdminStats />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
