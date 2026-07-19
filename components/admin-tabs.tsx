'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Vue d’ensemble', href: '/admin' },
  { label: 'Utilisateurs', href: '/admin/users' },
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
  // { label: "Statistiques", href: "/admin/stats" },
]

export function AdminTabs () {
  const pathname = usePathname()
  return (
    <nav
      className='mb-8 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-2 shadow-lg shadow-black/10 backdrop-blur-xl'
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
            className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition md:px-4 ${
              isActive
                ? 'bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white shadow-md shadow-[#ff3b8b]/15'
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
