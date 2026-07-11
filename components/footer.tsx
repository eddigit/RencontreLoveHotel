import Link from 'next/link'
import { Heart } from 'lucide-react'
import { DeploymentStamp } from './deployment-stamp'

export function Footer () {
  return (
    <footer className='border-t py-6 md:py-8'>
      <div className='container'>
        <div className='flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8'>
          <div className='flex items-center gap-2'>
            <Heart className='h-5 w-5 text-primary' />
            <span className='font-bold text-lg'>Love Hotel Rencontres</span>
          </div>

          <nav className='flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground'>
            <Link
              href='/about'
              className='hover:text-foreground transition-colors'
            >
              À propos
            </Link>
            <Link
              href='/privacy'
              className='hover:text-foreground transition-colors'
            >
              Confidentialité
            </Link>
            <Link
              href='/terms'
              className='hover:text-foreground transition-colors'
            >
              Conditions d'utilisation
            </Link>
            {/*<Link href='#' className='hover:text-foreground transition-colors'>
              Aide & Support
            </Link>
            <Link href='#' className='hover:text-foreground transition-colors'>
              Contact
            </Link>*/}
          </nav>

          <div className='flex flex-col items-center gap-1 text-sm text-muted-foreground md:items-end'>
            <span>
              &copy; {new Date().getFullYear()} Love Hotel Rencontres. Tous droits
              réservés.
            </span>
            <DeploymentStamp />
          </div>
        </div>
      </div>
    </footer>
  )
}
