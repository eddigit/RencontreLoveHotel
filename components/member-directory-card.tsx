'use client'

import { VerifiedProfileBadge } from '@/components/verified-profile-badge'
import { PresenceDot } from '@/components/presence-dot'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, MessageCircle } from 'lucide-react'
import { defaultMemberImage } from '@/lib/default-member-image'
import { directoryProfileTypeLabel } from '@/lib/member-profile-types'
import { displayMemberName } from '@/lib/display-member-name'

export type DirectoryMember = {
  id: string
  name?: string
  avatar?: string | null
  age?: number | null
  location?: string | null
  profile_status?: string | null
  gender?: string | null
  orientation?: string | null
  bio?: string | null
  open_to_other_couples?: boolean
  open_curtains?: boolean
  libertine?: boolean
  photo_verified?: boolean
  online?: boolean
}

export function orientationLabel (value?: string | null) {
  const labels: Record<string, string> = {
    hetero: 'Hétéro', straight: 'Hétéro', bi: 'Bi', bisexual: 'Bisexuel',
    homo: 'Homo', gay: 'Gay', lesbian: 'Lesbienne', pansexual: 'Pansexuel'
  }
  return value ? labels[value.toLowerCase()] || value : null
}

export function MemberDirectoryCard ({ member }: { member: DirectoryMember }) {
  const image = defaultMemberImage(member)
  const profileHref = `/profile/${member.id}`
  const name = displayMemberName(member.name)
  const typeLabel = directoryProfileTypeLabel(member)

  return (
    <Link href={profileHref} className='group flex min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6bc87]' aria-label={`Voir le profil de ${name}${member.photo_verified ? ', profil vérifié' : ''}`}>
      <article className='flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#494136] bg-[#0d0e11] shadow-[0_12px_24px_-12px_rgba(0,0,0,0.8)] transition-colors group-hover:border-[#d6bc87]/60 group-hover:bg-[#191b20]'>
      <div className='relative aspect-[5/4] overflow-hidden bg-[#121318]'>
        {image.startsWith('http') ? (
          <img src={image} alt={`Photo de ${name}`} loading='lazy' className='h-full w-full object-cover transition duration-500 group-hover:scale-105' />
        ) : (
          <Image src={image} alt={`Photo de ${name}`} fill sizes='(min-width: 1536px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw' className='object-cover transition duration-500 group-hover:scale-105' />
        )}
        <div className='absolute inset-0 bg-gradient-to-t from-[#0d0e13]/90 via-transparent to-transparent' />
        {member.photo_verified && <span className='absolute left-2.5 top-2.5'><VerifiedProfileBadge compact /></span>}
        {member.online && <PresenceDot className='right-2.5 top-2.5' />}
        <div className='absolute inset-x-3 bottom-3'>
          <h3 className='truncate text-sm font-semibold text-[#f8fafc]'>{name}{member.age ? `, ${member.age}` : ''}</h3>
          <p className='mt-1 flex items-center gap-1 truncate text-xs text-[#aaa69e]'><MapPin className='h-3 w-3 shrink-0 text-[#d6bc87]' />{member.location || 'Localisation non renseignée'}</p>
        </div>
      </div>
      <div className='flex flex-1 flex-col p-3'>
        <div className='flex flex-wrap gap-1.5 text-[11px] leading-4'>
          <span className='rounded-full bg-graphite px-2 py-1 font-medium text-[#e5d1aa]'>{typeLabel}</span>
          {orientationLabel(member.orientation) && <span className='rounded-full bg-[#191b20] px-2 py-1 text-[#c1c6da]'>{orientationLabel(member.orientation)}</span>}
          {member.open_to_other_couples && <span className='rounded-full bg-[#191b20] px-2 py-1 text-[#c1c6da]'>Ouvert aux couples</span>}
          {member.open_curtains && <span className='rounded-full bg-graphite px-2 py-1 text-[#e5d1aa]'>Rideaux ouverts</span>}
          {member.libertine && <span className='rounded-full bg-[#191b20] px-2 py-1 text-[#c1c6da]'>Libertin</span>}
        </div>
        {member.bio && <p className='mt-3 line-clamp-2 text-xs leading-5 text-[#94a3b8]'>{member.bio}</p>}
        <div className='mt-auto flex items-center justify-between pt-3 text-xs'>
          <span className='font-medium text-[#d6bc87] transition-colors group-hover:text-[#e5d1aa]'>Voir le profil</span>
          <span className='flex h-8 w-8 items-center justify-center rounded-lg border border-[#494136] text-[#c1c6da] transition-colors group-hover:bg-[#191b20] group-hover:text-white' title='Voir le profil pour matcher ou écrire'><MessageCircle className='h-4 w-4' /><span className='sr-only'>Après match accepté, ouvrir le profil pour écrire</span></span>
        </div>
      </div>
      </article>
    </Link>
  )
}
