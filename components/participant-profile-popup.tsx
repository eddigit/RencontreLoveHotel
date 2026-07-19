'use client'

import React from 'react'

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
  return <>{children}</>
}