import { unstable_cache } from 'next/cache'
import { connection } from 'next/server'
import { sql } from '@/lib/db'
import { ensurePresenceSchema, onlinePresenceCondition } from '@/lib/presence'

const readActivity = unstable_cache(async () => {
  const hasPresence = await ensurePresenceSchema()
  const online = hasPresence ? onlinePresenceCondition('u.last_seen_at') : 'FALSE'
  const [activity] = await sql.query<Array<{ profiles: number; online: number; recent: number }>>(`
    SELECT COUNT(*)::int AS profiles,
      COUNT(*) FILTER (WHERE ${online})::int AS online,
      COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '7 days')::int AS recent
    FROM users u JOIN user_profiles up ON up.user_id = u.id
    WHERE up.display_profile IS TRUE AND u.onboarding_completed IS TRUE
      AND NOT COALESCE(u.is_banned, FALSE) AND COALESCE(u.status, 'active') <> 'banned'
  `, [])
  return activity
}, ['public-community-activity-v1'], { revalidate: 60 })

export async function PublicCommunityActivity() {
  await connection()
  try {
    const { profiles, online, recent } = await readActivity()
    if (!profiles) return null
    const metrics = [
      [profiles, profiles === 1 ? 'profil visible' : 'profils visibles'],
      ...(online > 0 ? [[online, 'en ligne']] : []),
      ...(recent > 0 ? [[recent, recent === 1 ? 'inscription en 7 jours' : 'inscriptions en 7 jours']] : [])
    ] as const
    return (
      <dl aria-label='Activité de la communauté' className='mt-6 flex flex-wrap gap-x-6 gap-y-3 border-l-2 border-[#ff8cc8] pl-4'>
        {metrics.map(([value, label]) => (
          <div key={label} className='flex flex-col-reverse'>
            <dt className='text-xs text-white/70'>{label}</dt>
            <dd className='text-xl font-semibold tabular-nums'>{Number(value).toLocaleString('fr-FR')}</dd>
          </div>
        ))}
      </dl>
    )
  } catch {
    return null
  }
}
