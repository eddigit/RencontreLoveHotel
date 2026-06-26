'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Utilisateurs', href: '/admin/users' },
  { label: 'Événements', href: '/admin/events' },
  { label: 'Messages', href: '/admin/messages' },
  { label: 'Messages internes', href: '/admin/internal-messages' },
  { label: 'Modération', href: '/admin/moderation' },
  { label: 'Emails', href: '/admin/email-campaigns' },
  { label: 'Conciergerie', href: '/admin/conciergerie' },
  { label: 'Roadmap', href: '/admin/roadmap' },
  { label: 'Paramètres', href: '/admin/options' }
  // Add more admin sections here as needed
  // { label: "Statistiques", href: "/admin/stats" },
]

export function AdminTabs () {
  const pathname = usePathname()
  return (
    <nav className='mb-8 flex gap-2 overflow-x-auto border-b border-muted pb-px md:gap-4'>
      {tabs.map(tab => {
        const isDashboard = tab.href === '/admin'
        const isActive = isDashboard
          ? pathname === '/admin'
          : pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors md:px-4 ${
              isActive
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-primary'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
