import type React from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import PwaUpdateNotification from '@/components/PwaUpdateNotification'
import { SiteShell } from '@/components/site-shell'
import { MemberPhotoGuard } from '@/components/member-photo-guard'
import { PublicAnalytics } from '@/components/public-analytics'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://rencontrelovehotel.com'),
  referrer: 'origin',
  applicationName: 'Joug Rencontre',
  appleWebApp: { capable: true, title: 'Joug Rencontre', statusBarStyle: 'default' },
  icons: { icon: '/favicon.ico', apple: [{ url: '/icons/joug-180.png', sizes: '180x180', type: 'image/png' }] },
  title: 'Joug',
  description:
    'Rencontres libertines entre adultes à Paris. En solo ou en couple, découvrez la communauté, les Love Rooms et les idées de sorties pour un premier rendez-vous.'
}

export const viewport: Viewport = {
  themeColor: '#0d0e11'
}

export default function RootLayout ({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='fr' suppressHydrationWarning>
      <body
        className={`${inter.className} bg-[#0d0e11] text-[#f1eee8]`}
        suppressHydrationWarning
      >
        <Providers>
          <SiteShell>{children}</SiteShell>
          <PwaUpdateNotification />
          <PublicAnalytics />
          <MemberPhotoGuard />
        </Providers>
      </body>
    </html>
  )
}
