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
    <div className='admin-shell min-h-screen bg-[#111214] text-[#f2eee6]'>
      <main>{children}</main>
    </div>
  )
}
