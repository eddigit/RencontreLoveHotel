'use client'

import { useState, type FormEvent } from 'react'
import { Bell, Send, Users } from 'lucide-react'
import MainLayout from '@/components/layout/main-layout'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import {
  sendInternalMessageToAllUsers,
  type NotificationPriority
} from '@/actions/notification-actions'

const priorities: Array<{ value: NotificationPriority; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Important' },
  { value: 'critical', label: 'Critique' }
]

export default function AdminInternalMessagesPage () {
  const { user } = useAuth()
  const [title, setTitle] = useState('Nouvelle annonce Love Hotel')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('/events')
  const [priority, setPriority] = useState<NotificationPriority>('normal')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')

  async function handleSubmit (event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setStatus('')

    try {
      const result = await sendInternalMessageToAllUsers({
        title,
        description,
        link,
        priority
      })
      setStatus(`${result.messageCount} conversation(s) interne(s) créée(s) ou mise(s) à jour. ${result.sentCount} notification(s) envoyée(s).`)
      setDescription('')
    } catch (error) {
      setStatus("Le message interne n'a pas pu être envoyé.")
    } finally {
      setSending(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout user={user}>
        <div className='container mx-auto px-4 py-10'>
          <AdminHeader user={user} />
          <AdminTabs />

          <div className='mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div>
              <h1 className='text-2xl font-bold'>Messages internes</h1>
              <p className='mt-2 max-w-3xl text-sm text-muted-foreground'>
                Envoyer un message interne à tous les membres actifs. Une conversation admin est créée ou réutilisée, et aucun email n'est envoyé.
              </p>
            </div>
            <div className='flex items-center gap-2 rounded-full border border-[#ff8cc8]/25 bg-[#ff3b8b]/10 px-4 py-2 text-sm text-[#ffb3d8]'>
              <Users className='h-4 w-4' />
              Membres actifs
            </div>
          </div>

          {status && (
            <div className='mb-5 rounded-lg border border-[#ff8cc8]/30 bg-[#ff3b8b]/10 px-4 py-3 text-sm text-white'>
              {status}
            </div>
          )}

          <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Send className='h-5 w-5 text-[#ff8cc8]' />
                  Nouveau message interne
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className='space-y-4'>
                  <label className='space-y-1 text-sm'>
                    <span className='text-muted-foreground'>Titre</span>
                    <input
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                      required
                    />
                  </label>

                  <label className='space-y-1 text-sm'>
                    <span className='text-muted-foreground'>Message</span>
                    <textarea
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                      rows={7}
                      className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                      placeholder='Exemple : un nouvel apéro jacuzzi est ouvert aux inscriptions ce soir.'
                      required
                    />
                  </label>

                  <div className='grid gap-4 md:grid-cols-2'>
                    <label className='space-y-1 text-sm'>
                      <span className='text-muted-foreground'>Lien interne</span>
                      <input
                        value={link}
                        onChange={event => setLink(event.target.value)}
                        className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                        placeholder='/events'
                      />
                    </label>

                    <label className='space-y-1 text-sm'>
                      <span className='text-muted-foreground'>Priorité</span>
                      <select
                        value={priority}
                        onChange={event => setPriority(event.target.value as NotificationPriority)}
                        className='w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#ff8cc8]'
                      >
                        {priorities.map(item => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <Button
                    type='submit'
                    disabled={sending}
                    className='w-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'
                  >
                    {sending ? 'Envoi...' : 'Envoyer à tous les membres'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Bell className='h-5 w-5 text-[#ffd166]' />
                  Comportement
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm text-muted-foreground'>
                <p>Le message apparaît dans la messagerie de chaque membre, avec un lien direct depuis la cloche de notification.</p>
                <p>Les membres peuvent répondre dans le fil de conversation admin, même sans match accepté.</p>
                <p>Les comptes bannis ou désactivés sont exclus automatiquement.</p>
                <p>Les préférences email ne sont pas concernées, car aucun email n'est envoyé.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
