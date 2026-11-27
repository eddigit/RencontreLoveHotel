import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { listMemberPortraits } from '@/lib/member-portraits'
import { MemberPortraitTrack } from './member-portrait-track'
import styles from './site-shell.module.css'

export async function CommunityPortraits({ viewerId }: { viewerId: string }) {
  const members = await listMemberPortraits(viewerId, 0).catch(() => [])
  if (!members.length) return null

  return (
    <section aria-labelledby='community-portraits-title' className={`overflow-hidden px-4 py-4 sm:px-6 lg:px-8 ${styles.communityStrip} ${styles.stitchCommunityStrip}`}>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${styles.onlineDot}`} />
          <h2 id='community-portraits-title' className={`truncate text-base tracking-tight sm:text-xl ${styles.stripTitle}`}>Membres du cercle</h2>
        </div>
        <Link href='/members' className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline ${styles.stripLink}`}>
          Explorer <ArrowUpRight aria-hidden className='size-4' />
        </Link>
      </div>
      <MemberPortraitTrack initial={members} />
    </section>
  )
}
