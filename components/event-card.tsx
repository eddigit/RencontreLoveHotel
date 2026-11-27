import { experienceLabels } from '@/lib/event-presentation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Calendar, MapPin, Sparkles, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getEventImage } from '@/lib/event-presentation'

interface EventCardProps {
  title: string
  location: string
  date: string
  image?: string | null
  attendees: number
  prix_personne_seule?: number
  prix_couple?: number
  price?: number
  isParticipating?: boolean
  isPast?: boolean
  onSubscribeToggle?: () => void
  id?: string
  creatorId?: string
  currentUserId?: string
  isAdmin?: boolean
  venue?: 'pigalle' | 'chatelet' | string
  experienceType?: string
  maxParticipants?: number
  createdByRole?: string
  publicationStatus?: string
  onEdit?: () => void
  onDelete?: () => void
}

const venueLabels: Record<string, string> = {
  pigalle: 'Pigalle',
  chatelet: 'Châtelet'
}



export function EventCard ({
  title,
  location,
  date,
  image,
  attendees,
  prix_personne_seule,
  prix_couple,
  price,
  isParticipating,
  isPast,
  onSubscribeToggle,
  id,
  creatorId,
  currentUserId,
  isAdmin,
  venue,
  experienceType,
  maxParticipants,
  createdByRole,
  publicationStatus,
  onEdit,
  onDelete
}: EventCardProps) {
  const canEdit =
    isAdmin || (creatorId && currentUserId && creatorId === currentUserId)
  const singlePrice = prix_personne_seule ?? 0
  const couplePrice = prix_couple ?? 0
  const eventImage = getEventImage({ image, experience_type: experienceType })
  const experienceLabel = experienceType ? experienceLabels[experienceType] : ''
  const isFull = Boolean(
    maxParticipants && Number(attendees || 0) >= Number(maxParticipants)
  )
  const actionDisabled = Boolean(
    isPast || !onSubscribeToggle || (isFull && !isParticipating)
  )
  const remainingPlaces = maxParticipants
    ? Math.max(0, Number(maxParticipants) - Number(attendees || 0))
    : null

  const attendanceLabel = remainingPlaces !== null
    ? `${remainingPlaces} place${remainingPlaces > 1 ? 's' : ''} restante${remainingPlaces > 1 ? 's' : ''}`
    : `${attendees} participant${attendees > 1 ? 's' : ''}`

  return (
    <Card className='group flex h-full flex-col overflow-hidden border border-[#494136] bg-[#191714] text-[#f4efe5] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)] transition-colors hover:border-[#d6bc87]/70 hover:bg-[#211e1a]'>
      <div className='relative h-48 shrink-0 overflow-hidden sm:h-52'>
        <Image
          src={eventImage}
          alt={title}
          fill
          sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
          className='object-cover transition-transform duration-500 group-hover:scale-105'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-[#0d0e13]/90 via-[#0d0e13]/20 to-transparent' />
        <div className='absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2'>
          {experienceLabel && <span className='inline-flex items-center gap-1 rounded-md bg-[#191714]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e5d1aa] backdrop-blur'><Sparkles className='h-3 w-3' />{experienceLabel}</span>}
          {isPast && <span className='rounded-md bg-[#191714]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#b8ad9e] backdrop-blur'>Terminé</span>}
          {!isPast && isFull && <span className='rounded-md bg-[#191714]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e5d1aa] backdrop-blur'>Complet</span>}
        </div>
        {venue && <span className='absolute bottom-3 left-3 rounded-md bg-[#191714]/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#ded6ca] backdrop-blur'>{venueLabels[venue] || venue}</span>}
      </div>
      <CardContent className='flex flex-1 flex-col p-5'>
        <div className='flex items-center justify-between gap-3 text-xs text-[#ad8887]'>
          <span className='flex min-w-0 items-center gap-1.5 truncate'><MapPin className='h-3.5 w-3.5 shrink-0 text-[#d6bc87]' />{location}</span>
          {createdByRole === 'member' && <span className='shrink-0 text-[#c1c6da]'>Communauté</span>}
        </div>
        <h3 className='mt-3 text-base font-semibold leading-6 text-[#f4efe5] transition-colors group-hover:text-[#e5d1aa]'>{title}</h3>
        <div className='mt-4 space-y-2 border-y border-[#494136] py-3 text-xs'>
          <div className='flex items-center gap-2 text-[#ded6ca]'><Calendar className='h-3.5 w-3.5 shrink-0 text-[#d6bc87]' /><span>{date}</span></div>
          <div className='flex items-center justify-between gap-3'><span className='flex items-center gap-2 text-[#ded6ca]'><Users className='h-3.5 w-3.5 shrink-0 text-[#d6bc87]' />{attendanceLabel}</span>{isFull ? <span className='shrink-0 font-semibold text-[#e5d1aa]'>Complet</span> : null}</div>
        </div>
        {(singlePrice > 0 || couplePrice > 0 || Boolean(price)) && (
          <div className='mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[#e5d1aa]'>
            {singlePrice > 0 && <span>Personne seule : {singlePrice} €</span>}
            {couplePrice > 0 && <span>Couple : {couplePrice} €</span>}
            {singlePrice === 0 && couplePrice === 0 && price ? <span>{price} €</span> : null}
          </div>
        )}
        <div className='mt-auto grid gap-2 pt-5'>
        <Button
          className='w-full rounded-xl bg-[#d6bc87] text-[#191714] shadow-[0_0_16px_rgba(214,188,135,0.18)] hover:bg-[#e5d1aa]'
          variant={isParticipating ? 'secondary' : 'default'}
          onClick={onSubscribeToggle}
          disabled={actionDisabled}
        >
          {isPast
            ? 'Terminé'
            : isParticipating
            ? 'Se désinscrire'
            : isFull
            ? 'Complet'
            : 'Participer'}
        </Button>

        {id && (
          <Button asChild variant='outline' className='w-full rounded-xl border-[#494136] bg-transparent text-[#f4efe5] hover:bg-[#2a261f] hover:text-[#e5d1aa]'>
            <Link href={`/events/${id}`}>Voir les détails <ArrowRight className='h-4 w-4' /></Link>
          </Button>
        )}
        {canEdit && (
          <div className='flex gap-2 mt-2'>
            <Button
              size='sm'
              variant='outline'
              className='w-full'
              onClick={onEdit}
            >
              Modifier
            </Button>
            {onDelete && (
              <Button
                size='sm'
                variant='destructive'
                className='w-full'
                onClick={onDelete}
              >
                Supprimer
              </Button>
            )}
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  )
}
