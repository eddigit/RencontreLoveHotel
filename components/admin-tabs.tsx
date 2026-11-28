'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Vue d’ensemble', href: '/admin' },
  { label: 'Utilisateurs', href: '/admin/users' },
  { label: 'Vérifications photo', href: '/admin/verifications-photo' },
  { label: 'Statistiques', href: '/admin/stats' },
  { label: 'Boîte à idées', href: '/admin/idees' },
  { label: 'Événements', href: '/admin/events' },
  { label: 'Messages', href: '/admin/messages' },
  { label: 'Messages internes', href: '/admin/internal-messages' },
  { label: 'Modération', href: '/admin/moderation' },
  { label: 'Emails', href: '/admin/email-campaigns' },
  { label: 'Conciergerie', href: '/admin/conciergerie' },
  { label: 'Diagnostic', href: '/admin/diagnostic' },
  { label: 'Roadmap', href: '/admin/roadmap' },
  { label: 'Paramètres', href: '/admin/options' }
  // Add more admin sections here as needed
]

export function AdminTabs () {
  const pathname = usePathname()
  return (
    <nav
      className='mb-6 flex gap-1.5 overflow-x-auto md:flex-wrap rounded-2xl border border-white/10 bg-[#15171b] p-2 shadow-lg shadow-black/10 backdrop-blur-xl'
      aria-label='Navigation administration'
    >
      {tabs.map(tab => {
        const isDashboard = tab.href === '/admin'
        const isActive = isDashboard
          ? pathname === '/admin'
          : pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition md:px-4 ${
              isActive
                ? 'bg-graphite text-graphite-ink shadow-md shadow-[#d6bc87]/15'
                : 'text-white/58 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
