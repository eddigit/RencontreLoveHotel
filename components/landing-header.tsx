'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function LandingHeader () {
  const pathname = usePathname()

  return (
    <header className='py-4'>
      <div className='container mx-auto px-4 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='bg-[#ff3b8b] p-2 rounded-lg'>
            <Heart className='h-5 w-5 text-white' />
          </div>
          <span className='font-bold text-xl text-white'>
            Joug
          </span>
        </div>

        <nav className='hidden md:flex items-center gap-8'>
          <Link
            href='/'
            className={`text-white hover:text-[#ff3b8b] transition-colors ${
              pathname === '/' ? 'text-[#ff3b8b]' : ''
            }`}
          >
            Accueil
          </Link>
          <Link
            href='/concept'
            className={`text-white hover:text-[#ff3b8b] transition-colors ${
              pathname === '/concept' ? 'text-[#ff3b8b]' : ''
            }`}
          >
            Concept
          </Link>
          <Link
            href='/rencontres'
            className={`text-white hover:text-[#ff3b8b] transition-colors ${
              pathname === '/rencontres' ? 'text-[#ff3b8b]' : ''
            }`}
          >
            Rencontres
          </Link>
          <Link
            href='/en-direct'
            className={`text-white hover:text-[#ff3b8b] transition-colors ${
              pathname === '/en-direct' ? 'text-[#ff3b8b]' : ''
            }`}
          >
            En direct
          </Link>
          <Link
            href='/premium'
            className={`text-white hover:text-[#ff3b8b] transition-colors ${
              pathname === '/premium' ? 'text-[#ff3b8b]' : ''
            }`}
          >
            Premium
          </Link>
        </nav>

        <div className='flex items-center gap-3'>
          <Button
            asChild
            variant='ghost'
            className='text-white hover:text-white hover:bg-white/10'
          >
            <Link href='/login'>Se connecter</Link>
          </Button>
          <Button
            asChild
            className='bg-[#ff3b8b] hover:bg-[#ff3b8b]/90 text-white rounded-full px-6'
          >
            <Link href='/register'>Devenir membre</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
