'use client'

import Link from 'next/link'
import { ArrowRight, LogIn } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'

export function VisitorLandingHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className='sticky top-0 z-50 border-b border-[#494136] bg-[#0d0e11]/95 backdrop-blur-xl'>
      <div className='mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-10'>
        <Link href='/' aria-label='Accueil Love Hotel Rencontre' className='min-w-0 max-w-[min(40vw,230px)] shrink max-sm:[&_.truncate]:hidden'>
          <BrandLogo compact priority />
        </Link>

        <nav className='hidden items-center gap-6 text-sm font-semibold text-[#ded6ca] lg:flex' aria-label='Navigation accueil'>
          <Link href='/concept' className='transition hover:text-[#e5d1aa]'>Le concept</Link>
          <Link href='https://lovehotelaparis.fr' target='_blank' rel='noopener noreferrer' className='transition hover:text-[#e5d1aa]'>Love Hôtel Paris</Link>
          <Link href='/lieux' className='transition hover:text-[#e5d1aa]'>Les lieux</Link>
          <Link href='/events' className='transition hover:text-[#e5d1aa]'>Expériences</Link>
          <Link href='/rencontres' className='transition hover:text-[#e5d1aa]'>La communauté</Link>
        </nav>

        {isAuthenticated ? (
          <Link
            href='/discover'
            className='inline-flex items-center gap-2 rounded-full bg-[#d6bc87] px-4 py-2.5 text-sm font-bold text-[#191714] hover:bg-[#e5d1aa]'
          >
            Mon espace
            <ArrowRight className='h-4 w-4' />
          </Link>
        ) : (
          <div className='flex items-center gap-2 sm:gap-3'>
            <Link
              href='/login'
              aria-label='Connexion'
              className='inline-flex items-center gap-2 rounded-full border border-[#494136] px-3 py-2.5 text-sm font-bold text-[#f4efe5] transition hover:bg-[#202228] sm:px-4'
            >
              <LogIn className='h-4 w-4' />
              <span className='min-[381px]:inline max-[380px]:sr-only'>Connexion</span>
            </Link>
            <Link
              href='/register'
              className='rounded-full bg-[#d6bc87] px-4 py-2.5 text-sm font-bold text-[#191714] hover:bg-[#e5d1aa] sm:px-5'
            >
              Inscription
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
