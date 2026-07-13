'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Check, Clock3, DoorOpen, MapPin, UsersRound } from 'lucide-react'
import { requestEventParticipation, withdrawEventParticipation } from '@/actions/event-participation-actions'
import MainLayout from '@/components/layout/main-layout'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

type ParticipationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | null

interface EventDetail {
  id: string
  title: string
  description?: string | null
  event_date: string
  event_time?: string | null
  location: string
  max_participants?: number
  participant_count: number
  image?: string | null
  category?: string
  experience_type?: string
  creator_id: string
  creator_name?: string
  creator_avatar?: string | null
  booking_confirmed?: boolean
  participation_status?: ParticipationStatus
  price?: number
  prix_personne_seule?: number
  prix_couple?: number
  participants: Array<{
    id: string
    name: string
    avatar?: string | null
    joined_at: string
  }>
}

const fallbackImages: Record<string, string> = {
  jacuzzi: '/apero-jacuzzi-rencontre.jpg',
  open_curtains: '/rideaux-ouverts-rencontre.jpg'
}

export default function EventDetailPage ({ event }: { event: EventDetail }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [participationStatus, setParticipationStatus] = useState<ParticipationStatus>(event.participation_status || null)
  const [participantCount, setParticipantCount] = useState(Number(event.participant_count || 0))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isLoading) return
    if (!user?.id) router.replace('/login')
  }, [isLoading, router, user?.id])

  const type = event.experience_type || event.category || 'jacuzzi'
  const isOwner = event.creator_id === user?.id
  const remaining = event.max_participants == null
    ? null
    : Math.max(0, Number(event.max_participants) - participantCount)
  const datePart = String(event.event_date).slice(0, 10)
  const timePart = String(event.event_time || '20:00').slice(0, 5)
  const eventDate = new Date(`${datePart}T${timePart}`)
  const isPast = Number.isFinite(eventDate.getTime()) && eventDate < new Date()
  const formattedDate = Number.isFinite(eventDate.getTime())
    ? eventDate.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : `${datePart} à ${timePart}`

  async function handleRequest () {
    setBusy(true)
    setMessage('')
    const result = await requestEventParticipation(event.id)
    setBusy(false)
    if (!result.success) {
      setMessage(result.error || 'La demande n’a pas pu être envoyée.')
      return
    }
    setParticipationStatus(result.status || 'pending')
    setMessage('Votre demande a été envoyée à l’organisateur.')
  }

  async function handleWithdraw () {
    setBusy(true)
    const wasAccepted = participationStatus === 'accepted'
    const result = await withdrawEventParticipation(event.id)
    setBusy(false)
    if (!result.success) {
      setMessage(result.error || 'La participation n’a pas pu être retirée.')
      return
    }
    setParticipationStatus('withdrawn')
    if (wasAccepted) setParticipantCount(current => Math.max(0, current - 1))
    setMessage('Votre participation a été retirée.')
  }

  if (isLoading || !user) return null

  return (
    <MainLayout user={user}>
      <main className='container max-w-6xl py-5 md:py-8'>
        <Button asChild variant='ghost' className='mb-4 px-0 text-white/65 hover:bg-transparent hover:text-white'>
          <Link href='/events'><ArrowLeft className='mr-2 h-4 w-4' />Retour aux événements</Link>
        </Button>

        <div className='grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]'>
          <section>
            <div className='relative aspect-[16/8] overflow-hidden rounded-lg border border-white/10'>
              <Image src={event.image || fallbackImages[type] || '/placeholder.svg'} alt={event.title} fill sizes='(max-width: 768px) 100vw, 50vw' unoptimized className='object-cover' />
              <span className='absolute left-4 top-4 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white'>
                {type === 'open_curtains' ? 'Rideaux ouverts' : 'Apéro jacuzzi'}
              </span>
            </div>

            <h1 className='mt-5 text-3xl font-black md:text-4xl'>{event.title}</h1>
            <div className='mt-4 grid gap-3 text-sm text-white/75 sm:grid-cols-2'>
              <span className='flex items-center gap-2'><CalendarDays className='h-4 w-4 text-[#ff8cc8]' />{formattedDate}</span>
              <span className='flex items-center gap-2'><MapPin className='h-4 w-4 text-[#94ffc9]' />{event.location}</span>
              <span className='flex items-center gap-2'><UsersRound className='h-4 w-4 text-[#ffd166]' />{remaining == null ? `${participantCount} participants` : `${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`}</span>
              {type === 'open_curtains' && <span className='flex items-center gap-2'><DoorOpen className='h-4 w-4 text-[#94ffc9]' />{event.booking_confirmed ? 'Chambre réservée' : 'Chambre à confirmer'}</span>}
            </div>

            <div className='mt-6 border-t border-white/10 pt-5'>
              <h2 className='text-lg font-black'>L’invitation</h2>
              <p className='mt-2 whitespace-pre-wrap leading-7 text-white/70'>{event.description || 'L’organisateur n’a pas ajouté de précision.'}</p>
            </div>

            <div className='mt-6 border-t border-white/10 pt-5'>
              <h2 className='text-lg font-black'>Organisé par</h2>
              <Link href={`/profile/${event.creator_id}`} className='mt-3 inline-flex items-center gap-3 rounded-md p-2 hover:bg-white/5'>
                <Avatar className='h-10 w-10'>
                  <AvatarImage src={event.creator_avatar || ''} />
                  <AvatarFallback>{event.creator_name?.slice(0, 1).toUpperCase() || 'M'}</AvatarFallback>
                </Avatar>
                <span className='font-bold text-white'>{event.creator_name || 'Membre'}</span>
              </Link>
            </div>
          </section>

          <aside className='space-y-4 lg:sticky lg:top-5 lg:self-start'>
            <div className='rounded-lg border border-white/10 bg-[#260633] p-5'>
              <h2 className='text-lg font-black'>Participer</h2>
              <p className='mt-2 text-sm leading-6 text-white/55'>L’organisateur reçoit votre demande et consulte votre profil avant de répondre.</p>

              {message && <p role='status' className='mt-4 rounded-md bg-white/5 p-3 text-sm text-white/75'>{message}</p>}

              <div className='mt-4'>
                {isOwner ? (
                  <div className='flex h-12 items-center justify-center gap-2 rounded-md border border-[#94ffc9]/25 bg-[#94ffc9]/10 font-bold text-[#94ffc9]'><DoorOpen className='h-4 w-4' />Vous organisez</div>
                ) : isPast ? (
                  <Button disabled className='h-12 w-full'>Événement terminé</Button>
                ) : participationStatus === 'accepted' ? (
                  <div className='space-y-3'>
                    <div className='flex h-12 items-center justify-center gap-2 rounded-md bg-[#94ffc9] font-bold text-[#10241b]'><Check className='h-4 w-4' />Participation acceptée</div>
                    <Button variant='ghost' disabled={busy} onClick={() => void handleWithdraw()} className='w-full text-white/55'>Se retirer</Button>
                  </div>
                ) : participationStatus === 'pending' ? (
                  <div className='space-y-3'>
                    <Button disabled className='h-12 w-full bg-[#ffd166]/15 text-[#ffe7a3]'><Clock3 className='mr-2 h-4 w-4' />Demande envoyée</Button>
                    <Button variant='ghost' disabled={busy} onClick={() => void handleWithdraw()} className='w-full text-white/55'>Retirer ma demande</Button>
                  </div>
                ) : (
                  <Button disabled={busy || remaining === 0} onClick={() => void handleRequest()} className='h-12 w-full bg-[#ff4fa3] font-bold text-white hover:bg-[#ff6cb4]'>
                    {busy ? 'Envoi...' : remaining === 0 ? 'Événement complet' : participationStatus === 'rejected' ? 'Redemander à participer' : 'Demander à participer'}
                  </Button>
                )}
              </div>
            </div>

            {event.participants.length > 0 && (
              <div className='rounded-lg border border-white/10 bg-white/[0.03] p-5'>
                <h2 className='font-black'>Participants acceptés ({participantCount})</h2>
                <div className='mt-3 flex flex-wrap gap-2'>
                  {event.participants.slice(0, 8).map(participant => (
                    <Link key={participant.id} href={`/profile/${participant.id}`} title={participant.name}>
                      <Avatar className='h-9 w-9 border border-white/15'><AvatarImage src={participant.avatar || ''} /><AvatarFallback>{participant.name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </MainLayout>
  )
}
