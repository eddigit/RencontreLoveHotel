import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { sql } from '@/lib/db'
import { ensurePresenceSchema, onlinePresenceCondition } from '@/lib/presence'
import { photoPriority } from '@/lib/discovery-ranking'

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
    <section aria-labelledby='community-portraits-title' className='overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#301229] via-[#211020] to-[#170d20] px-4 pb-5 pt-6 sm:px-6 lg:px-8'>
      <div className='mb-4 flex items-end justify-between gap-3'>
        <h2 id='community-portraits-title' className='text-2xl font-semibold tracking-tight text-white sm:text-3xl'>Les visages de la communauté</h2>
        <Link href='/members' className='inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#ffc4df] hover:underline'>
          Tous les membres <ArrowUpRight aria-hidden className='size-4' />
        </Link>
      </div>
      <ul className='flex snap-x gap-3 overflow-x-auto pb-1 sm:gap-4 xl:grid xl:grid-cols-6'>
        {members.map(member => (
          <li key={member.id} className='w-28 shrink-0 snap-start sm:w-36 lg:w-40 xl:w-auto'>
            <Link href={`/profile/${member.id}`} className='group block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-300'>
              <div className='relative flex aspect-[5/4] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#54304c] to-[#28182d]'>
                {member.image && photoPriority(member) > 0 ? (
                  <img src={member.image} alt='' className='h-full w-full object-cover transition-transform motion-safe:group-hover:scale-105' />
                ) : (
                  <span aria-hidden className='text-4xl font-light text-[#f7cde2]'>{member.name.trim().slice(0, 2).toLocaleUpperCase('fr')}</span>
                )}
              </div>
              <span className='mt-2 block truncate font-semibold text-white'>{member.name}</span>
              <span className='flex items-center gap-1.5 text-xs text-white/70'>
                {member.online && <span aria-hidden className='size-2 rounded-full bg-emerald-300' />}
                {member.online ? 'En ligne' : member.joined_this_week ? 'Nouveau profil' : 'Voir le profil'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
