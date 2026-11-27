'use client'

import Link from 'next/link'
import { Eye, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getProfileVisitors } from '@/actions/profile-visit-actions'
import type { ProfileVisitor } from '@/actions/profile-visit-actions'
import { MemberAvatarImage } from '@/components/member-avatar-image'
import { displayMemberName } from '@/lib/display-member-name'

/** Client component ready to be placed directly in the client-side discover home. */
export function ProfileVisitors({ limit = 8 }: { limit?: number }) {
  const [visitors, setVisitors] = useState<ProfileVisitor[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (window.location.hash === '#visites') document.getElementById('visites')?.scrollIntoView()
    let active = true
    void getProfileVisitors(limit)
      .then(rows => {
        if (!active) return
        setVisitors(rows)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => { active = false }
  }, [limit])

  return (
    <section id='visites' aria-labelledby='profile-visitors-title' className='scroll-mt-24 rounded-2xl border border-[#111821] bg-[#111821] p-5 text-[#ecebe7]'>
      <div className='flex items-center gap-2'>
        <Eye className='h-5 w-5 text-[#d6bc87]' aria-hidden />
        <div>
          <h2 id='profile-visitors-title' className='font-black'>Ils ont consulté votre profil</h2>
          <p className='mt-1 text-sm text-[#c9c7c2]'>Visites des 30 derniers jours, de la plus récente à la plus ancienne.</p>
        </div>
      </div>
      {status === 'loading' && <p className='mt-4 text-sm text-[#c9c7c2]'>Chargement de vos visites…</p>}
      {status === 'error' && <p className='mt-4 text-sm text-[#f3b5b5]'>Impossible de charger votre historique de visites pour le moment.</p>}
      {status === 'ready' && visitors.length === 0 && <p className='mt-4 text-sm text-[#c9c7c2]'>Vos prochains visiteurs apparaîtront ici.</p>}
      {status === 'ready' && visitors.length > 0 && <ul className='mt-4 grid gap-3 sm:grid-cols-2'>
        {visitors.map(visitor => {
          const name = displayMemberName(visitor.name)
          return (
            <li key={visitor.id}>
              <Link href={`/profile/${visitor.id}`} className='flex items-center gap-3 rounded-xl border border-[#242d39] bg-[#0a0f15] p-3 transition-colors hover:border-[#d6bc87]/60'>
                <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#242d39]'>
                  <MemberAvatarImage src={visitor.avatar} gender={visitor.gender} profileStatus={visitor.profile_status} alt='' className='h-full w-full object-cover' />
                </div>
                <div className='min-w-0'>
                  <p className='truncate font-semibold'>{name}{visitor.age ? `, ${visitor.age}` : ''}</p>
                  {visitor.location && <p className='mt-1 flex items-center gap-1 truncate text-xs text-[#c9c7c2]'><MapPin className='h-3 w-3 text-[#d6bc87]' />{visitor.location}</p>}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>}
    </section>
  )
}
