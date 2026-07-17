import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'

export function AuthPageShell({
  children,
  backHref = '/',
  backLabel = 'Retour'
}: {
  children: ReactNode
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className='mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-7'>
      <header className='grid grid-cols-[1fr_auto_1fr] items-center gap-3'>
        <Link
          href={backHref}
          className='inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white/78 transition hover:border-[#ff8cc8]/35 hover:bg-white/8 hover:text-white'
        >
          <ArrowLeft className='h-4 w-4' />
          <span className='hidden sm:inline'>{backLabel}</span>
        </Link>
        <Link
          href='/'
          aria-label='Retour à l’accueil'
          className='w-20 rounded-2xl border border-white/10 bg-black/45 p-2 shadow-2xl shadow-black/25 sm:w-24'
        >
          <BrandLogo priority />
        </Link>
        <div aria-hidden='true' />
      </header>

      <main className='flex flex-1 items-start justify-center pb-10 pt-6 sm:pt-7'>
        <div className='w-full max-w-md'>{children}</div>
      </main>
    </div>
  )
}
