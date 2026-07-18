import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Check, Clock3, DoorOpen, MapPin, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ParticipationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | null

interface EventCardProps {
  id: string
  title: string
  location: string
  date: string
  image?: string | null
  attendees: number
  maxParticipants?: number
  venue?: string
  experienceType?: string
  creatorName?: string
  bookingConfirmed?: boolean
  participationStatus?: ParticipationStatus
  isOwner?: boolean
  loading?: boolean
  onRequest?: () => void
  onWithdraw?: () => void
}

const experienceImages: Record<string, string> = {
  jacuzzi: '/apero-jacuzzi-rencontre.jpg',
  open_curtains: '/rideaux-ouverts-rencontre.jpg'
}

const experienceLabels: Record<string, string> = {
  jacuzzi: 'Apéro jacuzzi',
  open_curtains: 'Rideaux ouverts'
}

const venueLabels: Record<string, string> = {
  pigalle: 'Pigalle',
  chatelet: 'Châtelet'
}

export function EventCard ({
  id,
  title,
  location,
  date,
  image,
  attendees,
  maxParticipants,
  venue,
  experienceType,
  creatorName,
  bookingConfirmed,
  participationStatus,
  isOwner,
  loading,
  onRequest,
  onWithdraw
}: EventCardProps) {
  const remaining = maxParticipants == null
    ? null
    : Math.max(0, Number(maxParticipants) - Number(attendees || 0))
  const isFull = remaining === 0
  const cover = image || experienceImages[experienceType || ''] || '/placeholder.svg'
  const detailHref = `/events/${id}`

  return (
    <article className='overflow-hidden rounded-lg border border-white/10 bg-[#260633] shadow-lg shadow-black/20'>
      <Link href={detailHref} className='relative block aspect-[16/9] overflow-hidden'>
        <Image src={cover} alt={title} fill sizes='(max-width: 768px) 100vw, 33vw' className='object-cover transition duration-300 hover:scale-[1.02]' />
        <span className='absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white'>
          {experienceLabels[experienceType || ''] || 'Événement'}
        </span>
        {experienceType === 'open_curtains' && (
          <span className={`absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-bold ${bookingConfirmed ? 'bg-[#94ffc9] text-[#10241b]' : 'bg-[#ffd166] text-[#352600]'}`}>
            {bookingConfirmed ? 'Chambre réservée' : 'Chambre à confirmer'}
          </span>
        )}
      </Link>

      <div className='space-y-4 p-4'>
        <div>
          <Link href={detailHref} className='text-lg font-black text-white hover:text-[#ff9dce]'>
            {title}
          </Link>
          <p className='mt-1 text-sm text-white/55'>Organisé par {creatorName || 'un membre'}</p>
        </div>

        <div className='grid gap-2 text-sm text-white/75'>
          <span className='flex items-center gap-2'><CalendarDays className='h-4 w-4 text-[#ff8cc8]' />{date}</span>
          <span className='flex items-center gap-2'><MapPin className='h-4 w-4 text-[#94ffc9]' />{venueLabels[venue || ''] || location}</span>
          <span className='flex items-center gap-2'><UsersRound className='h-4 w-4 text-[#ffd166]' />{remaining == null ? `${attendees} participant${attendees > 1 ? 's' : ''}` : `${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`}</span>
        </div>

        {isOwner ? (
          <div className='flex h-11 items-center justify-center gap-2 rounded-md border border-[#94ffc9]/25 bg-[#94ffc9]/10 text-sm font-bold text-[#94ffc9]'>
            <DoorOpen className='h-4 w-4' />Vous organisez
          </div>
        ) : participationStatus === 'accepted' ? (
          <div className='space-y-2'>
            <div className='flex h-11 items-center justify-center gap-2 rounded-md bg-[#94ffc9] text-sm font-bold text-[#10241b]'>
              <Check className='h-4 w-4' />Participation acceptée
            </div>
            <button type='button' onClick={onWithdraw} className='w-full text-xs text-white/50 underline hover:text-white'>Se retirer de l’événement</button>
          </div>
        ) : participationStatus === 'pending' ? (
          <div className='space-y-2'>
            <Button disabled className='h-11 w-full bg-[#ffd166]/18 text-[#ffe7a3]'>
              <Clock3 className='mr-2 h-4 w-4' />Demande envoyée
            </Button>
            <button type='button' onClick={onWithdraw} className='w-full text-xs text-white/50 underline hover:text-white'>Retirer ma demande</button>
          </div>
        ) : participationStatus === 'rejected' ? (
          <div className='space-y-2'>
            <p className='text-center text-xs text-red-200'>Demande refusée</p>
            <Button onClick={onRequest} disabled={loading || isFull} className='h-11 w-full bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>Redemander à participer</Button>
          </div>
        ) : (
          <Button onClick={onRequest} disabled={loading || isFull} className='h-11 w-full bg-[#ff4fa3] font-bold text-white hover:bg-[#ff6cb4]'>
            {loading ? 'Envoi...' : isFull ? 'Événement complet' : 'Demander à participer'}
          </Button>
        )}
      </div>
    </article>
  )
}
