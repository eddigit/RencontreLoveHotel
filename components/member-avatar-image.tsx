'use client'

import { defaultMemberImage } from '@/lib/default-member-image'

type Props = {
  src?: string | null
  gender?: string | null
  profileStatus?: string | null
  alt: string
  className: string
}

export function MemberAvatarImage({ src, gender, profileStatus, alt, className }: Props) {
  const fallback = defaultMemberImage({ gender, profile_status: profileStatus })
  return <img src={src?.trim() || fallback} alt={alt} className={className} loading='lazy'
    onError={({ currentTarget }) => {
      if (currentTarget.getAttribute('src') !== fallback) currentTarget.src = fallback
    }}
  />
}
