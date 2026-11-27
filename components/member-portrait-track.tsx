'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { nextMemberPortraits } from '@/actions/member-portraits'
import type { MemberPortrait } from '@/lib/member-portraits'
import { MemberAvatarImage } from './member-avatar-image'
import { displayMemberName } from '@/lib/display-member-name'
import styles from './site-shell.module.css'

export function MemberPortraitTrack({ initial, visitSeed }: { initial: MemberPortrait[], visitSeed: string }) {
  const [members, setMembers] = useState(initial)
  const track = useRef<HTMLUListElement>(null)
  const offset = useRef(initial.length)
  const more = useRef(initial.length === 36)
  const busy = useRef(false)
  const [error, setError] = useState(false)

  async function load() {
    if (busy.current || !more.current) return
    busy.current = true
    setError(false)
    try {
      const batch = await nextMemberPortraits(offset.current, visitSeed)
      offset.current += batch.length
      more.current = batch.length === 36
      setMembers(previous => {
        const seen = new Set(previous.map(member => member.id))
        return [...previous, ...batch.filter(member => !seen.has(member.id))]
      })
    } catch {
      setError(true)
    } finally {
      busy.current = false
    }
  }
  function nearEnd() {
    const el = track.current
    if (el && el.scrollWidth - el.scrollLeft - el.clientWidth < el.clientWidth / 2) void load()
  }
  function slide(direction: number) {
    const el = track.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' })
    if (direction > 0) nearEnd()
  }
  return <div className='relative'>
    <div className='absolute bottom-full right-24 mb-3 hidden gap-2 sm:flex'>
      <button type='button' aria-label='Membres précédents' onClick={() => slide(-1)}><ChevronLeft size={20} /></button>
      <button type='button' aria-label='Membres suivants' onClick={() => slide(1)}><ChevronRight size={20} /></button>
    </div>
      <ul ref={track} tabIndex={0} aria-label="Parcourir les membres" onScroll={nearEnd} className={`flex snap-x gap-2 overflow-x-auto py-1 ${styles.portraitList}`}>
        {members.map(member => (
          <li key={member.id} className={`shrink-0 snap-start ${styles.portraitItem}`}>
            <Link href={`/profile/${member.id}`} className={`group block text-center rounded-lg focus-visible:outline focus-visible:outline-2 ${styles.portraitCard}`}>
              <div className={`relative mx-auto flex size-12 items-center justify-center overflow-hidden rounded-full border sm:size-14 ${styles.portraitPhoto}`}>
                <MemberAvatarImage src={member.image} gender={member.gender} profileStatus={member.profile_status}
                  alt='' className='h-full w-full object-cover transition-transform motion-safe:group-hover:scale-105' />
              </div>
              <span title={displayMemberName(member.name)} className={`mt-1 text-[11px] font-semibold ${styles.portraitName}`}>{displayMemberName(member.name)}</span>
              <span className={`flex min-h-3 items-center justify-center gap-1 text-[10px] ${styles.portraitMeta}`}>
                {member.online && <span aria-hidden className={`size-2 rounded-full ${styles.onlineDot}`} />}
                {member.online ? 'En ligne' : member.joined_this_week ? 'Nouveau profil' : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    {error && <button type='button' onClick={load} className='mt-3 max-w-full whitespace-normal break-words rounded-md px-3 py-2 text-sm font-medium'>Réessayer de charger les membres</button>}
  </div>
}
