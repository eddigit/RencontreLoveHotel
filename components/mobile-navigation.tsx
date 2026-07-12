'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, MessageCircle, Heart, User, Sparkles, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { NotificationBadge } from '@/components/notification-badge'
import { useNotifications } from '@/contexts/notification-context'

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
    },
    {
      href: '/profile',
      icon: User,
      label: 'Profil',
      active: pathname === '/profile' || pathname.startsWith('/profile/')
    }
  ]

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#1a0d2e] to-[#3d1155] border-t border-purple-900/30 md:hidden'>
      <nav className='flex items-center justify-around'>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex flex-col items-center justify-center py-2 px-3 relative',
              link.active ? 'text-[#ff3b8b]' : 'text-purple-200/70'
            )}
          >
            <div className='relative'>
              <link.icon className='h-6 w-6' />
              {link.badge && <NotificationBadge count={link.badge} />}
            </div>
            <span className='text-xs mt-1'>{link.label}</span>
            {link.active && (
              <motion.div
                layoutId='navigation-indicator'
                className='absolute bottom-0 h-1 w-12 bg-[#ff3b8b] rounded-t-full'
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </nav>
    </div>
  )
}
