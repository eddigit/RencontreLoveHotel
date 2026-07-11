'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Heart,
  Home,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  Sparkles,
  UserPlus,
  UserRound,
  UsersRound,
  X
} from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { Footer } from '@/components/footer'
import { NotificationsButton } from '@/components/notifications-button'
import { VisitorLandingHeader } from '@/components/visitor-landing-header'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

type NavigationItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const memberNavItems: NavigationItem[] = [
  { href: '/discover', label: 'Découvrir', icon: Search },
  { href: '/members', label: 'Rechercher', icon: UsersRound },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/matches', label: 'Matchs', icon: Heart },
  { href: '/events', label: 'Événements', icon: CalendarDays },
  { href: '/conciergerie', label: 'Conciergerie', icon: Sparkles },
  { href: '/profile', label: 'Profil', icon: UserRound }
]

const visitorNavItems: NavigationItem[] = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/concept', label: 'Concept', icon: Sparkles },
  { href: '/rencontres', label: 'Rencontres', icon: Heart },
  { href: '/events', label: 'Événements', icon: CalendarDays },
  { href: '/love-rooms', label: 'Love Rooms', icon: Sparkles },
  { href: '/premium', label: 'Premium', icon: UserPlus }
]

const publicStandaloneRoutes = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/verify-email-pending',
  '/unauthorized',
  '/goodbye'
])

const publicPresentationRoutes = new Set([
  '/about',
  '/community-safety',
  '/concept',
  '/conciergerie',
  '/en-direct',
  '/events',
  '/love-rooms',
  '/premium',
  '/privacy',
  '/publicite',
  '/rencontres',
  '/tarifs-publicite',
  '/terms'
])

function NavigationLink({
  item,
  pathname,
  onNavigate
}: {
  item: NavigationItem
  pathname: string
  onNavigate?: () => void
}) {
  const active = item.href === '/'
    ? pathname === '/'
    : pathname === item.href || pathname.startsWith(`${item.href}/`)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/68 transition hover:bg-white/8 hover:text-white',
        active &&
          'bg-gradient-to-r from-[#ff3b8b]/24 to-[#7c3aed]/20 text-white ring-1 ring-white/12'
      )}
    >
      <Icon className='h-4 w-4 shrink-0' />
      <span>{item.label}</span>
    </Link>
  )
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigationItems = user ? memberNavItems : visitorNavItems

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  if (pathname.startsWith('/admin')) {
    return children
  }

  const isPublicPresentation = [...publicPresentationRoutes].some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (pathname === '/' || (!user && isPublicPresentation)) {
    return (
      <div className='visitor-landing-shell min-h-screen overflow-x-hidden bg-[#120821] text-white'>
        <VisitorLandingHeader isAuthenticated={Boolean(user)} />
        <main>{children}</main>
        <Footer />
      </div>
    )
  }

  if (publicStandaloneRoutes.has(pathname)) {
    return (
      <div className='auth-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(255,59,139,0.22),transparent_34%),linear-gradient(135deg,#170522_0%,#26063a_52%,#13031f_100%)] text-white'>
        {children}
      </div>
    )
  }

  const navigation = (
    <>
      <nav className='space-y-2' aria-label='Navigation principale'>
        {navigationItems.map(item => (
          <NavigationLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}
        {user?.role === 'admin' ? (
          <NavigationLink
            item={{ href: '/admin', label: 'Administration', icon: Settings }}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        ) : null}
      </nav>

      <div className='mt-auto space-y-3 border-t border-white/10 pt-4'>
        {user ? (
          <>
            <Link
              href='/profile'
              onClick={() => setMobileOpen(false)}
              className='flex items-center gap-3 rounded-xl bg-white/[0.045] p-3 transition hover:bg-white/[0.08]'
            >
              <span className='relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black/40'>
                <Image
                  src={user.avatar || '/mystical-forest-spirit.png'}
                  alt='Photo de profil'
                  fill
                  className='object-cover'
                  sizes='40px'
                />
              </span>
              <span className='min-w-0'>
                <span className='block truncate text-sm font-bold text-white'>{user.name}</span>
                <span className='block truncate text-xs text-white/50'>Mon profil</span>
              </span>
            </Link>
            <button
              type='button'
              onClick={logout}
              className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/65 transition hover:bg-white/8 hover:text-white'
            >
              <LogOut className='h-4 w-4' />
              Déconnexion
            </button>
          </>
        ) : (
          <div className='grid gap-2'>
            <Link
              href='/login'
              onClick={() => setMobileOpen(false)}
              className='flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-white/8'
            >
              <LogIn className='h-4 w-4' />
              Connexion
            </Link>
            <Link
              href='/register'
              onClick={() => setMobileOpen(false)}
              className='flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] px-3 py-2.5 text-sm font-bold text-white'
            >
              <UserPlus className='h-4 w-4' />
              Inscription
            </Link>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className='site-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(255,59,139,0.22),transparent_28%),linear-gradient(135deg,#170522_0%,#26063a_52%,#13031f_100%)] text-white'>
      <div className='mx-auto grid min-h-screen w-full max-w-[1920px] gap-4 px-2 py-2 sm:px-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-4 lg:py-4'>
        <aside className='sticky top-4 hidden h-[calc(100vh-2rem)] flex-col rounded-2xl border border-white/10 bg-black/24 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl lg:flex'>
          <Link href={user ? '/discover' : '/'} className='mb-5 rounded-2xl border border-white/10 bg-black/50 p-3'>
            <BrandLogo priority />
          </Link>
          {navigation}
        </aside>

        <div className='min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#180422]/78 shadow-2xl shadow-black/25 backdrop-blur-xl'>
          <header className='sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#180422]/95 px-3 backdrop-blur-xl sm:px-4 lg:hidden'>
            <Link href={user ? '/discover' : '/'} className='min-w-0 max-w-[min(60vw,230px)]'>
              <BrandLogo compact priority />
            </Link>
            <div className='flex items-center gap-2'>
              {user ? <NotificationsButton /> : null}
              <button
                type='button'
                aria-label='Ouvrir le menu'
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
                className='rounded-xl border border-white/12 bg-white/[0.06] p-2 text-white'
              >
                <Menu className='h-5 w-5' />
              </button>
            </div>
          </header>

          <main className='min-h-[calc(100vh-2rem)] min-w-0'>{children}</main>
          <Footer />
        </div>
      </div>

      {mobileOpen ? (
        <div className='fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm lg:hidden'>
          <button
            type='button'
            aria-label='Fermer le menu'
            onClick={() => setMobileOpen(false)}
            className='absolute inset-0 h-full w-full cursor-default'
          />
          <aside className='absolute right-0 top-0 flex h-full w-[min(88vw,360px)] flex-col border-l border-white/10 bg-[#180422] p-4 shadow-2xl'>
            <div className='mb-6 flex items-center justify-between gap-3'>
              <BrandLogo compact />
              <button
                type='button'
                aria-label='Fermer le menu'
                onClick={() => setMobileOpen(false)}
                className='rounded-xl border border-white/12 p-2 text-white'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
