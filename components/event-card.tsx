import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MapPin, Sparkles, Users } from 'lucide-react'
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

const experienceLabels: Record<string, string> = {
  jacuzzi: 'Apéro jacuzzi',
  open_curtains: 'Rideaux ouverts'
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

  return (
    <Card className='overflow-hidden card-hover border-0 shadow-lg shadow-purple-900/20'>
      <div className='relative h-48 sm:h-56'>
        <Image
          src={eventImage}
          alt={title}
          fill
          className='object-cover'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-[#1a0d2e] via-[#3d1155]/50 to-transparent flex items-end p-4'>
          <div className='text-white'>
            <h3 className='font-bold text-lg line-clamp-1'>{title}</h3>
            <div className='flex items-center gap-1 text-sm'>
              <MapPin className='h-3 w-3 flex-shrink-0' />
              <span className='line-clamp-1'>{location}</span>
            </div>
          </div>
        </div>
      </div>
      <CardContent className='p-4 space-y-4 bg-gradient-to-br from-[#2d1155]/90 to-[#3d1155]/80'>
        <div className='flex flex-wrap gap-2 text-xs font-semibold'>
          {experienceLabel && (
            <span className='inline-flex items-center gap-1 rounded-full bg-[#ff3b8b]/18 px-3 py-1 text-[#ff8cc8]'>
              <Sparkles className='h-3 w-3' />
              {experienceLabel}
            </span>
          )}
          {venue && (
            <span className='rounded-full bg-white/10 px-3 py-1 text-white/80'>
              {venueLabels[venue] || venue}
            </span>
          )}
          {createdByRole === 'member' && (
            <span className='rounded-full bg-white/10 px-3 py-1 text-white/70'>
              Communauté
            </span>
          )}
        </div>
        <div className='flex items-center justify-between flex-wrap gap-y-2'>
          <div className='flex items-center gap-1 text-sm text-gray-300'>
            <Calendar className='h-3 w-3 flex-shrink-0' />
            <span>{date}</span>
          </div>
          <div className='flex items-center gap-1 text-sm text-gray-300'>
            <Users className='h-3 w-3 flex-shrink-0' />
            <span>
              {remainingPlaces !== null
                ? `${remainingPlaces} place${remainingPlaces > 1 ? 's' : ''} restante${remainingPlaces > 1 ? 's' : ''}`
                : `${attendees} participant${attendees > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
        {(singlePrice > 0 || couplePrice > 0) && (
          <div className='flex flex-col gap-1 text-pink-300 font-semibold'>
            {singlePrice > 0 && <span>Pers. seule : {singlePrice}€</span>}
            {couplePrice > 0 && <span>Couple : {couplePrice}€</span>}
          </div>
        )}
        {singlePrice === 0 && couplePrice === 0 && price && (
          <div className='text-pink-300 font-semibold'>{price}€</div>
        )}
        <Button
          className={`w-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] border-0 hover:opacity-90`}
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

        <Link href={`/events/${id}`}>
          <Button variant="outline" className="w-full mt-2">
            Voir les détails
          </Button>
        </Link>
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
      </CardContent>
    </Card>
  )
}
