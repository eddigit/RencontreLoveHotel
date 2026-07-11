'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CalendarCheck, ExternalLink, Headphones, Plus, Sparkles } from 'lucide-react'
import { LoveHotelBookingWidget } from '@/components/love-hotel-booking'
import MainLayout from '@/components/layout/main-layout'
import { MobileNavigation } from '@/components/mobile-navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'

const experiences = [
  {
    title: 'Love Room sur mesure',
    detail: 'Préparation personnalisée',
    image: '/couple-love-room-red-curtain.png',
    href: '/conciergerie',
    action: 'Demander à la conciergerie'
  },
  {
    title: 'Apéro jacuzzi',
    detail: '2 à 4 couples',
    image: '/jacuzzi-champagne.avif',
    href: '/events/new',
    action: 'Créer un apéro jacuzzi'
  },
  {
    title: 'Rideaux ouverts',
    detail: '2 ou 3 chambres',
    image: '/rideaux-ouverts-rencontre.jpg',
    href: '/events/new',
    action: 'Organiser des rideaux ouverts'
  }
]

export default function LoveRoomsPage () {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user?.id) router.replace('/login')
  }, [router, user?.id])

  if (!user?.id) return null

  return (
    <MainLayout user={user}>
      <div className='min-h-screen pb-20 md:pb-8'>
        <main className='container py-4 md:py-7'>
          <header className='mb-5 flex flex-wrap items-center justify-between gap-3'>
            <div className='flex min-w-0 items-center gap-3'>
              <img src='/logo-web-love-hotel.png' alt='Love Hotel' className='h-12 w-12 shrink-0 object-contain' />
              <div>
                <div className='flex items-center gap-2 text-xs font-bold uppercase text-[#ff8cc8]'>
                  <CalendarCheck className='h-4 w-4' /> Réservation officielle Love Hotel
                </div>
                <h1 className='mt-1 text-2xl font-black md:text-3xl'>Réserver une Love Room</h1>
              </div>
            </div>
            <div className='flex gap-2'>
              <Button asChild variant='outline' className='border-white/15 bg-white/5 text-white'>
                <a href='tel:+33144826305'><Headphones className='mr-2 h-4 w-4' />01 44 82 63 05</a>
              </Button>
              <Button asChild variant='outline' size='icon' className='border-white/15 bg-white/5 text-white' title='Voir le site Love Hotel'>
                <a href='https://lovehotelaparis.fr' target='_blank' rel='noreferrer'><ExternalLink className='h-4 w-4' /></a>
              </Button>
            </div>
          </header>

          <section aria-label='Réserver une chambre' className='overflow-hidden rounded-lg border border-white/12 bg-white shadow-2xl shadow-black/20'>
            <LoveHotelBookingWidget />
          </section>

          <section className='mt-7'>
            <div className='mb-4 flex items-center justify-between gap-3'>
              <div>
                <p className='flex items-center gap-2 text-xs font-bold uppercase text-[#94ffc9]'><Sparkles className='h-4 w-4' /> Communauté</p>
                <h2 className='mt-1 text-xl font-black'>Prolonger l’expérience</h2>
              </div>
              <Button asChild variant='outline' size='sm' className='border-white/15 bg-white/5 text-white'>
                <Link href='/events'><CalendarCheck className='mr-2 h-4 w-4' />Voir les événements</Link>
              </Button>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {experiences.map(experience => (
                <article key={experience.title} className='overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]'>
                  <div className='relative aspect-[16/8] overflow-hidden'>
                    <img src={experience.image} alt={experience.title} className='h-full w-full object-cover' />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent' />
                    <div className='absolute inset-x-0 bottom-0 p-4'>
                      <h3 className='font-black text-white'>{experience.title}</h3>
                      <p className='mt-0.5 text-xs text-white/70'>{experience.detail}</p>
                    </div>
                  </div>
                  <div className='p-3'>
                    <Button asChild className='w-full bg-[#ff4fa3] text-white hover:bg-[#ff6cb4]'>
                      <Link href={experience.href}><Plus className='mr-2 h-4 w-4' />{experience.action}</Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
        <MobileNavigation />
      </div>
    </MainLayout>
  )
}
