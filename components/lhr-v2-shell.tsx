'use client'

import type React from 'react'
import Image from 'next/image'
import {
  CalendarDays,
  Heart,
  MessageCircle,
  Search,
  Settings,
  Sparkles,
  UserRound,
  UsersRound
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: string | number
}

const navItems: NavItem[] = [
  { href: '/discover', label: 'Découvrir', icon: Search },
  { href: '/members', label: 'Rechercher', icon: UsersRound },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/matches', label: 'Matches', icon: Heart },
  { href: '/events', label: 'Événements', icon: CalendarDays },
  { href: '/conciergerie', label: 'Conciergerie', icon: Sparkles },
  { href: '/profile', label: 'Profil', icon: UserRound }
]

export function LhrV2Shell ({
  children,
  user,
  eyebrow,
  title,
  subtitle,
  action
}: {
  children: React.ReactNode
  user?: any
  eyebrow?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdmin = user?.role === 'admin'

  return (
    <section className='lhr-v2-shell-root min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(255,59,139,0.22),transparent_28%),linear-gradient(135deg,#170522_0%,#26063a_52%,#13031f_100%)] px-2 py-3 text-white sm:px-3 lg:px-4 2xl:px-5'>
      <div className='lhr-v2-shell-grid grid min-h-[calc(100vh-1.5rem)] w-full gap-4 lg:grid-cols-[220px_minmax(0,1fr)] 2xl:gap-5'>
        <aside className='hidden rounded-2xl border border-white/10 bg-black/24 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl lg:flex lg:flex-col'>
          <Link
            href='/discover'
            className='mb-6 block overflow-hidden rounded-2xl border border-white/10 bg-black'
          >
            <span className='relative block aspect-[1162/1354] w-full'>
              <Image
                src='/lhr-official-logo.png'
                alt='Love Hotel Rencontre'
                fill
                className='object-cover'
                sizes='208px'
                priority
              />
            </span>
          </Link>

          <nav className='space-y-2'>
            {navItems.map(item => {
              const Icon = item.icon
              const active =
                pathname === item.href ||
                (item.href !== '/profile' && pathname.startsWith(`${item.href}/`))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-white/68 transition hover:bg-white/8 hover:text-white',
                    active &&
                      'bg-gradient-to-r from-[#ff3b8b]/24 to-[#7c3aed]/20 text-white ring-1 ring-white/12'
                  )}
                >
                  <span className='flex items-center gap-3'>
                    <Icon className='h-4 w-4' />
                    {item.label}
                  </span>
                  {item.count && <span className='text-white/55'>{item.count}</span>}
                </Link>
              )
            })}
            {isAdmin && (
              <Link
                href='/admin'
                className='flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/68 transition hover:bg-white/8 hover:text-white'
              >
                <Settings className='h-4 w-4' />
                Admin
              </Link>
            )}
          </nav>

          <div className='mt-auto rounded-2xl border border-white/10 bg-white/[0.045] p-4'>
            <div className='flex items-center gap-2 text-sm font-bold'>
              <span className='relative h-7 w-7 overflow-hidden rounded-lg bg-black'>
                <Image
                  src='/lhr-official-logo.png'
                  alt=''
                  fill
                  className='object-cover'
                  sizes='28px'
                />
              </span>
              Beta V2
            </div>
            <p className='mt-2 text-xs leading-5 text-white/58'>
              Design premium, données beta et stack VPS2 séparée.
            </p>
          </div>
        </aside>

        <main className='overflow-hidden rounded-2xl border border-white/10 bg-[#180422]/78 shadow-2xl shadow-black/25 backdrop-blur-xl'>
          <header className='flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5'>
            <div>
              {eyebrow && (
                <div className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ff8cc8]'>
                  <Sparkles className='h-3.5 w-3.5' />
                  {eyebrow}
                </div>
              )}
              <h1 className='text-2xl font-black leading-tight sm:text-3xl'>
                {title}
              </h1>
              {subtitle && (
                <p className='mt-1 max-w-3xl text-sm leading-6 text-white/64'>
                  {subtitle}
                </p>
              )}
            </div>
            {action}
          </header>

          <div className='p-3 sm:p-4 lg:p-5'>{children}</div>
        </main>
      </div>
    </section>
  )
}
