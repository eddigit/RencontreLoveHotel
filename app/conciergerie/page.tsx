import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import {
  CalendarHeart,
  HeartHandshake,
  Hotel,
  Sparkles,
  Waves
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import ConciergerieForm from '@/components/ConciergerieForm'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { MobileNavigation } from '@/components/mobile-navigation'
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
      <LhrV2Shell
        user={user}
        eyebrow='Service privé Love Hotel'
        title='Conciergerie coquine'
        subtitle='Une demande unique, confidentielle et structurée pour organiser une expérience romantique, coquine ou libertine autour des Love Rooms, jacuzzis et rideaux ouverts.'
        action={
          <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>
            <Link href='#demande-conciergerie'>Faire une demande</Link>
          </Button>
        }
      >
        <div className='space-y-6'>
          <section className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]'>
            <div className='overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,59,139,0.18),rgba(20,2,28,0.92))]'>
              <div className='grid min-h-[430px] lg:grid-cols-[0.95fr_1.05fr]'>
                <div className='relative min-h-[320px] overflow-hidden'>
                  <img
                    src={conciergerieImageUrl}
                    alt='Conciergerie privée Love Hotel'
                    className='absolute inset-0 h-full w-full object-cover'
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-[#16031f] via-[#16031f]/28 to-transparent' />
                </div>
                <div className='flex flex-col justify-center p-5 md:p-8'>
                  <div className='mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[#ff8cc8]/35 bg-[#ff3b8b]/18 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ffb4d8]'>
                    <HeartHandshake className='h-4 w-4' />
                    Service confidentiel
                  </div>
                  <h2 className='max-w-2xl text-3xl font-black leading-tight md:text-5xl'>
                    Une envie privée, un cadre réel, une organisation maîtrisée.
                  </h2>
                  <p className='mt-4 max-w-2xl text-sm leading-7 text-white/68'>
                    La conciergerie transforme une idée en moment concret :
                    Love Room préparée, jacuzzi, rideaux ouverts, week-end,
                    demande surprise, arrivée scénarisée ou soirée plus
                    libertine. La demande passe uniquement par le formulaire et
                    arrive directement à l’équipe opérationnelle.
                  </p>
                </div>
              </div>
            </div>

            <aside className='space-y-4'>
              <div className='rounded-2xl border border-[#94ffc9]/20 bg-[#94ffc9]/10 p-5'>
                <h3 className='font-black'>Ce que la conciergerie clarifie</h3>
                <p className='mt-3 text-sm leading-6 text-white/64'>
                  Le lieu, la période, le nombre de personnes, l’ambiance, les
                  limites, le budget et le niveau de discrétion attendu.
                </p>
              </div>
              <div className='rounded-2xl border border-[#ff8cc8]/20 bg-[#ff3b8b]/12 p-5'>
                <h3 className='font-black'>Canal unique</h3>
                <p className='mt-3 text-sm leading-6 text-white/64'>
                  Pas de demande dispersée : tout est envoyé par formulaire à
                  l’adresse opérationnelle de conciergerie.
                </p>
              </div>
            </aside>
          </section>

          <section className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            {possibilities.map(item => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'
                >
                  <Icon className='h-5 w-5 text-[#ff8cc8]' />
                  <h3 className='mt-4 font-black'>{item.title}</h3>
                  <p className='mt-2 text-sm leading-6 text-white/58'>
                    {item.text}
                  </p>
                </div>
              )
            })}
          </section>

          <div id='demande-conciergerie'>
            <ConciergerieForm />
          </div>
        </div>
        <MobileNavigation />
      </LhrV2Shell>
    </MainLayout>
  )
}
