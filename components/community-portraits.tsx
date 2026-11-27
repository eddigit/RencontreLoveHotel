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
      LIMIT 6
    `, [viewerId])
  } catch {
    return null
  }
  if (!members.length) return null

  return (
    <section aria-labelledby='community-portraits-title' className={`overflow-hidden px-4 pb-5 pt-6 sm:px-6 lg:px-8 ${styles.communityStrip}`}>
      <div className='mb-4 flex items-end justify-between gap-3'>
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.16em] ${styles.stripEyebrow}`}>Communauté</p>
          <h2 id='community-portraits-title' className={`mt-1 text-2xl font-semibold tracking-tight sm:text-3xl ${styles.stripTitle}`}>À découvrir</h2>
        </div>
        <Link href='/members' className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline ${styles.stripLink}`}>
          Tous les membres <ArrowUpRight aria-hidden className='size-4' />
        </Link>
      </div>
      <ul className={`flex snap-x gap-3 overflow-x-auto pb-1 sm:gap-4 xl:grid xl:grid-cols-6 ${styles.portraitList}`}>
        {members.map(member => (
          <li key={member.id} className={`shrink-0 snap-start xl:w-auto ${styles.portraitItem}`}>
            <Link href={`/profile/${member.id}`} className={`group block rounded-xl focus-visible:outline focus-visible:outline-2 ${styles.portraitCard}`}>
              <div className={`relative flex aspect-[5/4] items-center justify-center overflow-hidden rounded-xl border ${styles.portraitPhoto}`}>
                {member.image && photoPriority(member) > 0 ? (
                  <img src={member.image} alt='' className='h-full w-full object-cover transition-transform motion-safe:group-hover:scale-105' />
                ) : (
                  <span aria-hidden className={`text-4xl font-light ${styles.portraitInitials}`}>{member.name.trim().slice(0, 2).toLocaleUpperCase('fr')}</span>
                )}
              </div>
              <span className={`mt-2 block truncate font-semibold ${styles.portraitName}`}>{member.name}</span>
              <span className={`flex items-center gap-1.5 text-xs ${styles.portraitMeta}`}>
                {member.online && <span aria-hidden className={`size-2 rounded-full ${styles.onlineDot}`} />}
                {member.online ? 'En ligne' : member.joined_this_week ? 'Nouveau profil' : 'Voir le profil'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
