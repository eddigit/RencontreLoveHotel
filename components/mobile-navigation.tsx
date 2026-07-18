'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, MessageCircle, Heart, Sparkles, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { NotificationBadge } from '@/components/notification-badge'
import { useNotifications } from '@/contexts/notification-context'
import { MemberAccountMenu } from '@/components/member-account-menu'

export function MobileNavigation () {
  const pathname = usePathname()
  const { counts } = useNotifications()

  const links = [
    {
      href: '/discover',
      icon: Search,
      label: 'Découvrir',
      active: pathname === '/discover'
    },
    {
      href: '/members',
      icon: UsersRound,
      label: 'Membres',
      active: pathname === '/members'
    },
    {
      href: '/matches',
      icon: Heart,
      label: 'Matchs',
      active: pathname === '/matches'
    },
    {
      href: '/conciergerie',
      icon: Sparkles,
      label: 'Conciergerie',
      active: pathname === '/conciergerie'
    },
    {
      href: '/messages',
      icon: MessageCircle,
      label: 'Messages',
      active: pathname === '/messages' || pathname.startsWith('/messages/'),
      badge: counts.messages
    }
  ]

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#1a0d2e] to-[#3d1155] border-t border-purple-900/30 md:hidden'>
      <nav className='grid grid-cols-6 items-stretch'>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'relative flex min-w-0 flex-col items-center justify-center px-1 py-2',
              link.active ? 'text-[#ff3b8b]' : 'text-purple-200/70'
            )}
          >
            <div className='relative'>
              <link.icon className='h-6 w-6' />
              {link.badge && <NotificationBadge count={link.badge} />}
            </div>
            <span className='mt-1 max-w-full truncate text-[10px] leading-none'>
              {link.label}
            </span>
            {link.active && (
              <motion.div
                layoutId='navigation-indicator'
                className='absolute bottom-0 h-1 w-10 rounded-t-full bg-[#ff3b8b]'
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        ))}
        <MemberAccountMenu variant='mobile' />
      </nav>
    </div>
  )
}
