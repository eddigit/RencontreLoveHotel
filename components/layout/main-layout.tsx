"use client"

import type React from "react"
import { usePathname } from 'next/navigation'

interface MainLayoutProps {
  children: React.ReactNode
  session?: any
  user?: any
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()

  if (!pathname.startsWith('/admin')) {
    return <>{children}</>
  }

  return (
    <div className='admin-shell min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(255,59,139,0.18),transparent_28%),linear-gradient(145deg,#12051d,#220a33_55%,#13051f)] text-white'>
      <main>{children}</main>
    </div>
  )
}
