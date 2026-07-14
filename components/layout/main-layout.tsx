"use client"

import type React from "react"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { usePathname } from 'next/navigation'

interface MainLayoutProps {
  children: React.ReactNode
  session?: any
  user?: any
}

export default function MainLayout({ children, session, user }: MainLayoutProps) {
  const pathname = usePathname()

  if (!pathname.startsWith('/admin')) {
    return <>{children}</>
  }

  return (
    <>
      <Header session={session} user={user} />
      <main>{children}</main>
      <Footer />
    </>
  )
}
