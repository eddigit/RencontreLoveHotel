'use client'

import { ExternalLink, Sparkles } from 'lucide-react'
import type { JougPilotConfig } from '@/lib/joug-pilot'

const JOUG_WORLD_URL = 'https://joug.world'

type Props = {
  pilot: JougPilotConfig
}

export function JougPilotInvitation({ pilot }: Props) {
  if (pilot.state !== 'active' || !pilot.endAt) return null

  const endLabel = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeZone: 'Europe/Paris'
  }).format(new Date(pilot.endAt))

  const recordVoluntaryClick = () => {
    // The request carries no member id, referrer, profile data, or destination data.
    // It only increments the pilot's aggregate daily counter for authenticated members.
    navigator.sendBeacon?.('/api/joug-pilot/click')
  }

  return (
    <section className='rounded-2xl border border-[#ff3b8b]/30 bg-gradient-to-br from-[#ff3b8b]/10 via-white/[0.045] to-[#94ffc9]/10 p-5'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex gap-3'>
          <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff3b8b]/15 text-[#ff62a8]'>
            <Sparkles className='h-5 w-5' aria-hidden='true' />
          </div>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#ff62a8]'>Invitation facultative · pilote 30 jours</p>
            <h2 className='mt-1 text-xl font-black text-white'>Découvrir Joug.World</h2>
            <p className='mt-1 max-w-2xl text-sm text-white/65'>
              Joug propose un parcours BDSM pour adultes. Vous choisissez librement de le découvrir. Joug.World est un service distinct : aucun compte, profil, message ou historique LHR n’est transmis.
            </p>
            <p className='mt-2 text-xs text-white/45'>Invitation disponible jusqu’au {endLabel}. LHR reste accessible normalement.</p>
          </div>
        </div>
        <a
          href={JOUG_WORLD_URL}
          target='_blank'
          rel='noreferrer'
          onClick={recordVoluntaryClick}
          className='inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff3b8b] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#ff62a8] focus:outline-none focus:ring-2 focus:ring-[#94ffc9] focus:ring-offset-2 focus:ring-offset-[#1a0d2e]'
        >
          Visiter Joug.World <ExternalLink className='h-4 w-4' aria-hidden='true' />
        </a>
      </div>
    </section>
  )
}
