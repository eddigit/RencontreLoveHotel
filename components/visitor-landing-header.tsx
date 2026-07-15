'use client'

import Link from 'next/link'
import { ArrowRight, LogIn } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'

export function VisitorLandingHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className='sticky top-0 z-50 border-b border-white/10 bg-[#120821]/92 backdrop-blur-xl'>
      <div className='mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-10'>
        <Link href='/' aria-label='Accueil Love Hotel Rencontre' className='min-w-0 max-w-[min(48vw,230px)] shrink'>
          <BrandLogo compact priority />
        </Link>

        <nav className='hidden items-center gap-6 text-sm font-semibold text-white/70 lg:flex' aria-label='Navigation accueil'>
          <Link href='#concept' className='transition hover:text-white'>Le concept</Link>
          <Link href='#hotels' className='transition hover:text-white'>Nos hôtels</Link>
          <Link href='#experiences' className='transition hover:text-white'>Expériences</Link>
          <Link href='#communaute' className='transition hover:text-white'>La communauté</Link>
        </nav>

        {isAuthenticated ? (
          <Link
            href='/discover'
            className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#ff3b8b]/15'
          >
            Mon espace
            <ArrowRight className='h-4 w-4' />
          </Link>
        ) : (
          <div className='flex items-center gap-2 sm:gap-3'>
            <Link
              href='/login'
              className='inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-white/8 sm:px-4'
            >
              <LogIn className='h-4 w-4' />
              <span className='hidden sm:inline'>Connexion</span>
            </Link>
            <Link
              href='/register'
              className='rounded-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#ff3b8b]/15 sm:px-5'
            >
              Inscription
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
