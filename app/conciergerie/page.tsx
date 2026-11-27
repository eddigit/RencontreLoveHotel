import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import {
  CalendarHeart,
  Hotel,
  Sparkles,
  Waves
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import ConciergerieForm from '@/components/ConciergerieForm'
import MainLayout from '@/components/layout/main-layout'
import { authOptions } from '@/lib/auth'

const possibilities = [
  {
    title: 'Love Room préparée',
    text: 'Chambre, ambiance, champagne, surprise, arrivée discrète ou plus scénarisée.',
    icon: Hotel
  },
  {
    title: 'Apéro jacuzzi privé',
    text: 'Un format en petit comité, de 2 à 4 couples maximum selon le cadre souhaité.',
    icon: Waves
  },
  {
    title: 'Rideaux ouverts',
    text: 'Initiation douce ou expérience plus assumée entre chambres, toujours cadrée.',
    icon: Sparkles
  },
  {
    title: 'Soirée ou week-end sur mesure',
    text: 'Organisation romantique, coquine ou libertine avec options extérieures sur étude.',
    icon: CalendarHeart
  }
]

const conciergerieImageUrl = '/conciergerie-service.jpg'

export default async function ConciergeriePage() {
  const session = await getServerSession(authOptions)
  const user = session?.user

  return (
    <MainLayout session={session} user={user}>
      <div className='container py-4 md:py-6'>
        <div className='space-y-7'>
          <section className='overflow-hidden rounded-2xl border border-[#2b3040] bg-[#16181f] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.55)]'>
            <div className='grid min-h-[260px] md:grid-cols-[0.9fr_1.1fr]'>
              <div className='relative min-h-[220px] overflow-hidden'>
                  <img
                    src={conciergerieImageUrl}
                    alt='Conciergerie privée Love Hotel'
                    className='absolute inset-0 h-full w-full object-cover'
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-[#0d0e13] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#16181f]' />
              </div>
              <div className='flex flex-col justify-center p-6 sm:p-8'>
                <h1 className='max-w-xl text-3xl font-semibold leading-tight text-[#f8fafc] sm:text-4xl'>
                  Conciergerie coquine
                </h1>
                <p className='mt-3 max-w-xl text-sm leading-6 text-[#c1c6da]'>
                  Préparer une Love Room, organiser un apéro jacuzzi entre couples ou découvrir les chambres à rideaux ouverts. Décrivez à l’équipe le lieu, la date et l’ambiance que vous imaginez.
                </p>
                <div className='mt-5'>
                  <Button asChild className='rounded-xl bg-[#ff334b] text-white shadow-[0_0_16px_rgba(255,51,75,0.25)] hover:bg-[#cc001a]'>
                    <Link href='#demande-conciergerie'>Faire une demande</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div id='demande-conciergerie' className='scroll-mt-20'>
            <ConciergerieForm />
          </div>

          <section aria-labelledby='possibilites-conciergerie'>
            <div className='mb-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-[#ffb3b2]'>Points de départ</p>
              <h2 id='possibilites-conciergerie' className='mt-2 text-2xl font-semibold text-[#f8fafc]'>Les possibilités de la conciergerie</h2>
            </div>
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            {possibilities.map(item => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className='rounded-xl border border-[#2b3040] bg-[#16181f] p-5'
                >
                  <Icon className='h-5 w-5 text-[#ff525d]' />
                  <h3 className='mt-4 font-semibold text-[#f8fafc]'>{item.title}</h3>
                  <p className='mt-2 text-sm leading-6 text-[#94a3b8]'>
                    {item.text}
                  </p>
                </div>
              )
            })}
            </div>
          </section>

        </div>
      </div>
    </MainLayout>
  )
}
