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
    <section className='rounded-2xl border border-[#41454b] bg-[#111821] text-[#ecebe7] p-5'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex gap-3'>
          <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#111821] text-[#ecebe7]'>
            <Sparkles className='h-5 w-5' aria-hidden='true' />
          </div>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#ecebe7]'>Invitation facultative · pilote 30 jours</p>
            <h2 className='mt-1 text-xl font-bold text-[#ecebe7]'>Découvrir Joug.World</h2>
            <p className='mt-1 max-w-2xl text-sm text-[#c9c7c2]'>
              Joug propose un parcours BDSM pour adultes. Vous choisissez librement de le découvrir. Joug.World est un service distinct : aucun compte, profil, message ou historique LHR n’est transmis.
            </p>
            <p className='mt-2 text-xs text-[#c9c7c2]'>Invitation disponible jusqu’au {endLabel}. LHR reste accessible normalement.</p>
          </div>
        </div>
        <a
          href={JOUG_WORLD_URL}
          target='_blank'
          rel='noreferrer'
          onClick={recordVoluntaryClick}
          className='inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c1121f] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#c1121f] focus:outline-none focus:ring-2 focus:ring-[#ecebe7] focus:ring-offset-2 focus:ring-offset-white'
        >
          Visiter Joug.World <ExternalLink className='h-4 w-4' aria-hidden='true' />
        </a>
      </div>
    </section>
  )
}
