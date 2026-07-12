'use client'

import React from 'react'
import Link from 'next/link'

interface Participant {
  id: string
  name: string
  avatar: string
  joined_at: string
}

interface ParticipantProfilePopupProps {
  participant: Participant
  children: React.ReactNode
}

export function ParticipantProfilePopup({ participant, children }: ParticipantProfilePopupProps) {
  return (
    <Link href={`/profile/${participant.id}`} aria-label={`Voir le profil de ${participant.name}`}>
      {children}
    </Link>
  )
}
