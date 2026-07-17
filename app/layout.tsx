import type React from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import PwaUpdateNotification from '@/components/PwaUpdateNotification'
import { SiteShell } from '@/components/site-shell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://rencontrelovehotel.com'),
  title: 'Love Hotel Rencontre',
  description:
    'Rencontrez la communauté Love Hotel à Paris, découvrez les événements, Love Rooms et services de conciergerie.'
}

export const viewport: Viewport = {
  themeColor: '#120821'
}

export default function RootLayout ({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='fr' suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]`}
        suppressHydrationWarning
      >
        <Providers>
          <SiteShell>{children}</SiteShell>
          <PwaUpdateNotification />
        </Providers>
      </body>
    </html>
  )
}
