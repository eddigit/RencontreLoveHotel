import Link from 'next/link'
import { Heart, MessageCircle } from 'lucide-react'
import type { ConversationSummary } from '@/lib/member-relationship-service'
import { MemberAvatarImage } from '@/components/member-avatar-image'
import { displayMemberName } from '@/lib/display-member-name'

type CardMember = { id: string; name: string; avatar: string | null; gender?: string | null; profileStatus?: string | null }

function Portrait({ name, avatar, gender, profileStatus }: Pick<CardMember, 'name' | 'avatar' | 'gender' | 'profileStatus'>) {
  return <MemberAvatarImage src={avatar} gender={gender} profileStatus={profileStatus} alt='' className='size-9 shrink-0 rounded-full object-cover' />
}

export function CircleActivityCards({ threads, matches, loading, unread }: {
  threads: ConversationSummary[] | null
  matches: CardMember[]
  loading: boolean
  unread: number
}) {
  const panels = [
    {
      title: 'Messages récents', icon: MessageCircle, href: '/messages', link: 'Ouvrir la messagerie',
      empty: threads === null && !loading ? 'La messagerie reste accessible ci-dessous.' : 'Aucune conversation pour le moment.',
      rows: (threads || []).map(t => ({
        id: t.id, name: t.other_user_name, avatar: t.other_user_avatar, gender: t.other_user_gender, profileStatus: t.other_user_profile_status,
        href: '/messages/' + t.id, detail: t.last_message || 'Ouvrir la conversation', unread: t.has_unread_messages
      }))
    },
    {
      title: 'Matchs et affinités', icon: Heart, href: '/matches', link: 'Voir mes matchs',
      empty: 'Vos matchs apparaîtront ici.',
      rows: matches.map(m => ({ ...m, href: '/profile/' + m.id, detail: 'Voir le profil', unread: false }))
    }
  ]
  return <div aria-label='Messages et affinités' className='grid gap-3 sm:grid-cols-2'>
    {panels.map(panel => <section key={panel.href} className='flex min-w-0 flex-col rounded-xl border border-[#494136] bg-[#0d0e11] p-4'>
      <div className='mb-3 flex items-center gap-2'><panel.icon aria-hidden className='size-4 text-[#d6bc87]' />
        <h2 className='text-base font-semibold'>{panel.title}</h2>
        {panel.href === '/messages' && unread > 0 && <span className='ml-auto text-xs text-[#d6bc87]'>{unread} non lu{unread > 1 ? 's' : ''}</span>}
      </div>
      {panel.rows.length === 0 && <p className='mb-3 text-sm text-[#aaa69e]'>{loading ? 'Chargement…' : panel.empty}</p>}
      {panel.rows.map(row => <Link key={row.id} href={row.href} className='flex min-h-12 items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-[#191b20]'>
        <Portrait name={row.name} avatar={row.avatar} gender={row.gender} profileStatus={row.profileStatus} />
        <span className='min-w-0'><span className='block truncate text-sm font-semibold'>{displayMemberName(row.name)}</span>
          <span className='block truncate text-xs text-[#aaa69e]'>{row.detail}</span></span>
        {row.unread && <span aria-label='Non lu' className='ml-auto size-2 shrink-0 rounded-full bg-[#d6bc87]' />}
      </Link>)}
      <Link href={panel.href} className='mt-auto self-end pt-3 text-xs font-semibold text-[#d6bc87] hover:text-[#e5d1aa] hover:underline'>{panel.link} →</Link>
    </section>)}
  </div>
}
