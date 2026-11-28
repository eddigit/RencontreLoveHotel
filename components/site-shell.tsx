'use client'

import { useEffect, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Bug,
  MapPin,
  Heart,
  Home,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
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
import { defaultMemberImage } from '@/lib/default-member-image'
import { displayMemberName } from '@/lib/display-member-name'
import styles from './site-shell.module.css'

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
  { href: '/lieux', label: 'Lieux', icon: MapPin },
  { href: '/conciergerie', label: 'Conciergerie', icon: Sparkles },
  { href: '/community-safety', label: 'Règles', icon: ShieldCheck },
  { href: '/profile', label: 'Profil', icon: UserRound }
]

const visitorNavItems: NavigationItem[] = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/concept', label: 'Concept', icon: Sparkles },
  { href: '/rencontres', label: 'Rencontres', icon: Heart },
  { href: '/events', label: 'Événements', icon: CalendarDays },
  { href: '/lieux', label: 'Lieux', icon: MapPin },
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
  '/lieux',
  '/premium',
  '/privacy',
  '/publicite',
  '/rencontres',
  '/tarifs-publicite',
  '/terms'
])

function anonymizeFeedbackPath(pathname: string) {
  return pathname.split('/').map(segment => {
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(segment) || /^\d+$/.test(segment)) return ':id'
    return segment
  }).join('/') || '/'
}

function NavigationLink({
  item,
  pathname,
  onNavigate,
  discoverShell = false
}: {
  item: NavigationItem
  pathname: string
  onNavigate?: () => void
  discoverShell?: boolean
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
        discoverShell && styles.navigationLink,
        active &&
          (discoverShell
            ? styles.navigationLinkActive
            : 'bg-[#d6bc87]/15 text-white ring-1 ring-white/12')
      )}
    >
      <Icon className='h-4 w-4 shrink-0' />
      <span>{item.label}</span>
    </Link>
  )
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, logout, isLoading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigationItems = user ? memberNavItems : visitorNavItems
  const isMemberShell = Boolean(user)
  const isCircleShell = Boolean(user && (pathname === '/discover' || pathname === '/events' || pathname === '/members' || pathname === '/conciergerie' || pathname === '/messages' || pathname.startsWith('/messages/')))

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [mobileOpen])

  if (pathname.startsWith('/admin')) {
    return children
  }

  // Never use the visitor shell as a provisional state. On a hard reload the
  // browser does not know the session yet, so keep the initial frame neutral
  // until NextAuth has resolved it.
  if (isLoading && pathname !== '/' && !publicStandaloneRoutes.has(pathname)) {
    return (
      <div className={styles.authResolvingFrame} aria-busy='true'>
        <p role='status'>Chargement de la navigation…</p>
      </div>
    )
  }

  const isPublicPresentation = [...publicPresentationRoutes].some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (pathname === '/' || (!user && isPublicPresentation)) {
    return (
      <div className='visitor-landing-shell min-h-screen overflow-x-hidden bg-[#0d0e11] text-white'>
        <VisitorLandingHeader isAuthenticated={Boolean(user)} />
        <main>{children}</main>
        <Footer />
      </div>
    )
  }

  if (publicStandaloneRoutes.has(pathname)) {
    return (
      <div className='auth-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(86,92,104,0.08),transparent_34%),linear-gradient(135deg,#121315_0%,#191919_52%,#101113_100%)] text-white'>
        {children}
      </div>
    )
  }

  const navigation = (
    <>
      <nav className={cn('space-y-2', isMemberShell && styles.nav)} aria-label='Navigation principale'>
        {navigationItems.map(item => (
          <NavigationLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
            discoverShell={isMemberShell}
          />
        ))}
        {user ? <NavigationLink
          item={{
            href: `/discover?feedback=bug&from=${encodeURIComponent(anonymizeFeedbackPath(pathname))}#boite-a-idees`,
            label: 'Signaler un bug',
            icon: Bug
          }}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          discoverShell={isMemberShell}
        /> : null}
        {user?.role === 'admin' ? (
          <NavigationLink
            item={{ href: '/admin', label: 'Administration', icon: Settings }}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
            discoverShell={isMemberShell}
          />
        ) : null}
      </nav>

      <div className='mt-auto space-y-3 pt-5'>
        {user ? (
          <>
            <Link
              href='/profile'
              onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-3 rounded-xl bg-white/[0.045] p-3 transition hover:bg-white/[0.08]', isMemberShell && styles.profileLink)}
            >
              <span className='relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black/40'>
                <Image
                  src={defaultMemberImage({ avatar: user.avatar, profile_status: user.profile_status, gender: user.gender })}
                  alt='Photo de profil'
                  fill
                  className='object-cover'
                  sizes='40px'
                />
              </span>
              <span className='min-w-0'>
                <span className='block truncate text-sm font-bold text-white'>{displayMemberName(user.name)}</span>
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
              className='flex items-center justify-center gap-2 rounded-xl bg-[#d6bc87] px-3 py-2.5 text-sm font-bold text-[#191714]'
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
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
    <div data-chat-thread={/^\/messages\/[^/]+\/?$/.test(pathname) || undefined} className={cn('site-shell min-h-screen overflow-x-hidden bg-[#0d0e11] text-white', isMemberShell && styles.discoverShell, isCircleShell && styles.stitchDiscoverShell)}>
      <div className={cn('mx-auto grid min-h-screen w-full max-w-[1920px] gap-4 px-2 py-2 sm:px-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-4 lg:py-4', isCircleShell && styles.stitchDiscoverGrid)}>
          <aside className={cn('sticky top-4 hidden h-[calc(100vh-2rem)] flex-col overflow-y-auto rounded-2xl border border-white/10 bg-black/24 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl lg:flex', isMemberShell && styles.rail, isCircleShell && styles.stitchRail)}>
          <Link href={user ? '/discover' : '/'} className={cn('mb-5 rounded-2xl p-3', isMemberShell && styles.logoLockup, isCircleShell && styles.stitchLogoLockup)}>
            <BrandLogo priority />
          </Link>
          {navigation}
        </aside>

        <div data-site-panel className={cn('min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#171819]/78 shadow-2xl shadow-black/25 backdrop-blur-xl', isMemberShell && styles.panel, isCircleShell && styles.stitchPanel)}>
          {isCircleShell && user ? (
            <header className={`sticky top-0 z-40 hidden h-16 items-center justify-between px-6 lg:flex ${styles.discoverHeader}`}>
              <form action='/members' className={styles.searchForm} role='search'>
                <Search aria-hidden className='size-[18px] shrink-0' />
                <label className='sr-only' htmlFor='discover-member-search'>Rechercher un membre</label>
                <input
                  id='discover-member-search'
                  name='search'
                  type='search'
                  placeholder='Rechercher un membre...'
                  className={styles.searchInput}
                />
              </form>
              <div className='flex items-center gap-4'>
                <Link href='/discover#boite-a-idees' className={styles.feedbackLink}>Boîte à idées</Link>
                <Link href='/community-safety' aria-label='Ouvrir les règles de la communauté' title='Règles de la communauté' className='rounded-xl p-2 text-[#d6bc87] transition hover:bg-white/10 hover:text-[#e5d1aa]'>
                  <ShieldCheck className='size-5' aria-hidden />
                </Link>
                <NotificationsButton />
                <Link href='/profile' className={styles.headerProfile} aria-label='Ouvrir mon profil'>
                  <span className='hidden text-right xl:block'>
                    <span className='block text-sm font-semibold text-[#f8fafc]'>{displayMemberName(user.name)}</span>
                    <span className='block text-xs text-[#94a3b8]'>Mon profil</span>
                  </span>
                  <span className='relative size-9 overflow-hidden rounded-full border border-[#3b4257] bg-[#1e222d]'>
                    <Image
                      src={defaultMemberImage({ avatar: user.avatar, profile_status: user.profile_status, gender: user.gender })}
                      alt='Photo de profil'
                      fill
                      className='object-cover'
                      sizes='36px'
                    />
                  </span>
                </Link>
              </div>
            </header>
          ) : null}
          <header className={cn('sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#171819]/95 px-3 backdrop-blur-xl sm:px-4 lg:hidden', styles.compactHeader, isMemberShell && styles.mobileHeader, isCircleShell && styles.stitchMobileHeader)}>
            <Link href={user ? '/discover' : '/'} className='min-w-0 max-w-[min(60vw,230px)]'>
              <BrandLogo compact inline priority />
            </Link>
            <div className='flex items-center gap-2'>
              {user ? <Link href='/community-safety' aria-label='Ouvrir les règles de la communauté' className='rounded-xl border border-white/12 bg-white/[0.06] p-2 text-[#d6bc87]'><ShieldCheck className='h-5 w-5' aria-hidden /></Link> : null}
              {user ? <NotificationsButton /> : null}
              <Dialog.Trigger asChild>
              <button
                type='button'
                aria-label='Ouvrir le menu'
                className='rounded-xl border border-white/12 bg-white/[0.06] p-2 text-white'
              >
                <Menu className='h-5 w-5' />
              </button>
              </Dialog.Trigger>
            </div>
          </header>

          <main className='min-h-[calc(100vh-2rem)] min-w-0'>{children}</main>
          <Footer />
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm' />
        <Dialog.Content aria-describedby={undefined} className={styles.menuSheet}>
          <div className={styles.menuBar}>
            <Dialog.Title className='text-xl font-bold'>Menu</Dialog.Title>
            <Dialog.Close aria-label='Fermer le menu' className='grid size-11 place-items-center rounded-full bg-white/[0.07]'>
              <X className='h-5 w-5' />
            </Dialog.Close>
          </div>
          <div className={styles.menuLinks}>{navigation}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </div>
    </Dialog.Root>
  )
}
