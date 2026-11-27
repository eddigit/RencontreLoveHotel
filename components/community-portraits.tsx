import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { sql } from '@/lib/db'
import { ensurePresenceSchema, onlinePresenceCondition } from '@/lib/presence'
import { photoPriority } from '@/lib/discovery-ranking'
import styles from './site-shell.module.css'

type MemberPortrait = {
  id: string
  name: string
  image: string | null
  online: boolean
  joined_this_week: boolean
}

export async function CommunityPortraits({ viewerId }: { viewerId: string }) {
  const hasPresence = await ensurePresenceSchema()
  const online = hasPresence ? onlinePresenceCondition('u.last_seen_at') : 'FALSE'
  let members: MemberPortrait[]
  try {
    members = await sql.query<MemberPortrait[]>(`
      SELECT u.id, u.name, u.avatar AS image, ${online} AS online,
        u.created_at >= NOW() - INTERVAL '7 days' AS joined_this_week
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id <> $1 AND up.display_profile IS TRUE AND u.onboarding_completed IS TRUE
        AND NOT COALESCE(u.is_banned, FALSE) AND COALESCE(u.status, 'active') <> 'banned'
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b WHERE
            (b.blocker_id = $1 AND b.blocked_id = u.id) OR
            (b.blocker_id = u.id AND b.blocked_id = $1)
        )
      ORDER BY online DESC, joined_this_week DESC NULLS LAST,
        (u.avatar ILIKE '%blob.vercel-storage.com/%') DESC NULLS LAST,
        u.created_at DESC NULLS LAST, u.id
      LIMIT 12
    `, [viewerId])
  } catch {
    return null
  }
  if (!members.length) return null

  return (
    <section aria-labelledby='community-portraits-title' className={`overflow-hidden px-4 py-3 sm:px-6 lg:px-8 ${styles.communityStrip}`}>
      <div className='mb-2 flex items-end justify-between gap-3'>
        <h2 id='community-portraits-title' className={`text-xl tracking-tight sm:text-2xl ${styles.stripTitle}`}>À découvrir</h2>
        <Link href='/members' className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline ${styles.stripLink}`}>
          Tous les membres <ArrowUpRight aria-hidden className='size-4' />
        </Link>
      </div>
      <ul className={`flex snap-x gap-2 overflow-x-auto py-1 ${styles.portraitList}`}>
        {members.map(member => (
          <li key={member.id} className={`shrink-0 snap-start ${styles.portraitItem}`}>
            <Link href={`/profile/${member.id}`} className={`group block text-center rounded-lg focus-visible:outline focus-visible:outline-2 ${styles.portraitCard}`}>
              <div className={`relative mx-auto flex size-14 items-center justify-center overflow-hidden rounded-full border sm:size-16 ${styles.portraitPhoto}`}>
                {member.image && photoPriority(member) > 0 ? (
                  <img src={member.image} alt='' className='h-full w-full object-cover transition-transform motion-safe:group-hover:scale-105' />
                ) : (
                  <span aria-hidden className={`text-lg font-medium ${styles.portraitInitials}`}>{member.name.trim().slice(0, 2).toLocaleUpperCase('fr')}</span>
                )}
              </div>
              <span className={`mt-1 block truncate text-xs font-semibold ${styles.portraitName}`}>{member.name}</span>
              <span className={`flex items-center justify-center gap-1 text-[11px] ${styles.portraitMeta}`}>
                {member.online && <span aria-hidden className={`size-2 rounded-full ${styles.onlineDot}`} />}
                {member.online ? 'En ligne' : member.joined_this_week ? 'Nouveau profil' : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
