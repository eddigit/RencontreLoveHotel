import Image from 'next/image'
import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import {
  CalendarHeart,
  Handshake,
  HeartHandshake,
  Hotel,
  MapPinned,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Waves
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import ConciergerieForm from '@/components/ConciergerieForm'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { MobileNavigation } from '@/components/mobile-navigation'
import { authOptions } from '@/lib/auth'

const networkStrengths = [
  {
    title: 'Des lieux que nous connaissons',
    text: 'Love Rooms, jacuzzis et espaces adaptés : nous savons quel cadre correspond à votre envie.',
    icon: MapPinned,
    color: 'text-[#94ffc9]'
  },
  {
    title: 'Des partenaires et des connexions',
    text: 'Décoration, attentions, restauration et expériences complémentaires peuvent être réunies autour de votre projet.',
    icon: Handshake,
    color: 'text-[#ffb4d8]'
  },
  {
    title: 'Une communauté qui partage les mêmes codes',
    text: 'Discrétion, consentement et respect guident les rencontres et les formats que nous aidons à construire.',
    icon: UsersRound,
    color: 'text-[#d8c7ff]'
  }
]

const possibilities = [
  {
    title: 'Love Room préparée',
    text: 'Ambiance, surprise, champagne ou arrivée discrète.',
    icon: Hotel
  },
  {
    title: 'Apéro jacuzzi privé',
    text: 'Un petit comité réuni dans un cadre adapté.',
    icon: Waves
  },
  {
    title: 'Rideaux ouverts',
    text: 'Une initiation douce ou une expérience plus assumée.',
    icon: Sparkles
  },
  {
    title: 'Soirée ou week-end sur mesure',
    text: 'Une idée romantique, coquine ou libertine à construire.',
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
        eyebrow='Réseau privé Love Hotel'
        title='Conciergerie coquine'
        subtitle='Une idée, même encore floue ? Parlez-nous-en. Nous activons nos lieux, nos partenaires et notre expérience pour construire un moment qui vous ressemble.'
        action={
          <Button asChild className='bg-[#ff3b8b] text-white hover:bg-[#ff5ca3]'>
            <Link href='#demande-conciergerie'>Parler de mon projet</Link>
          </Button>
        }
      >
        <div className='space-y-8 pb-10'>
          <section className='relative min-h-[500px] overflow-hidden rounded-lg border border-white/10 md:min-h-[560px]'>
            <Image
              src={conciergerieImageUrl}
              alt='Conciergerie privée Love Hotel'
              fill
              priority
              sizes='(max-width: 768px) 100vw, 1200px'
              className='object-cover object-center'
            />
            <div className='absolute inset-0 bg-gradient-to-r from-[#130018]/95 via-[#130018]/70 to-[#130018]/20' />
            <div className='absolute inset-0 bg-gradient-to-t from-[#130018] via-transparent to-transparent' />

            <div className='relative flex min-h-[500px] max-w-3xl flex-col justify-end p-5 md:min-h-[560px] md:p-10'>
              <div className='mb-4 inline-flex w-fit items-center gap-2 rounded-md border border-[#94ffc9]/30 bg-[#10251d]/75 px-3 py-2 text-xs font-black uppercase text-[#94ffc9]'>
                <HeartHandshake className='h-4 w-4' />
                Confidentiel et personnel
              </div>
              <h2 className='text-3xl font-black leading-tight text-white md:text-5xl'>
                Vous avez une envie.
                <span className='block text-[#ff8cc8]'>Nous savons qui appeler.</span>
              </h2>
              <p className='mt-5 max-w-2xl text-base leading-7 text-white/82 md:text-lg'>
                Vous n’avez pas besoin d’avoir tout prévu. Racontez-nous le
                moment que vous imaginez, l’ambiance et les personnes avec qui
                vous souhaitez le vivre. Notre rôle est de relier les bons
                lieux, les bonnes personnes et les bonnes attentions.
              </p>
              <div className='mt-6 flex flex-wrap items-center gap-3'>
                <Button asChild className='bg-[#ff3b8b] text-white hover:bg-[#ff5ca3]'>
                  <Link href='#demande-conciergerie'>Construire mon expérience</Link>
                </Button>
                <div className='flex items-center gap-2 text-sm font-bold text-white/78'>
                  <ShieldCheck className='h-4 w-4 text-[#94ffc9]' />
                  Demande privée, réponse personnelle
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby='network-title' className='border-y border-white/10 py-7'>
            <div className='mb-6 max-w-3xl'>
              <p className='text-sm font-black uppercase text-[#94ffc9]'>
                La force du réseau
              </p>
              <h2 id='network-title' className='mt-2 text-2xl font-black md:text-3xl'>
                Nous savons qui appeler
              </h2>
              <p className='mt-3 text-sm leading-6 text-white/65 md:text-base'>
                Une conciergerie utile ne se contente pas de prendre une
                demande. Elle connaît le terrain et sait réunir les bonnes
                ressources au bon moment.
              </p>
            </div>

            <div className='grid gap-6 md:grid-cols-3 md:gap-0'>
              {networkStrengths.map((strength, index) => {
                const Icon = strength.icon
                return (
                  <div
                    key={strength.title}
                    className={`md:px-6 ${index === 0 ? 'md:pl-0' : 'md:border-l md:border-white/10'}`}
                  >
                    <Icon className={`h-6 w-6 ${strength.color}`} />
                    <h3 className='mt-4 text-lg font-black'>{strength.title}</h3>
                    <p className='mt-2 text-sm leading-6 text-white/62'>
                      {strength.text}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className='grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start'>
            <div>
              <p className='text-sm font-black uppercase text-[#ff8cc8]'>
                Un point de départ suffit
              </p>
              <h2 className='mt-2 text-2xl font-black md:text-3xl'>
                Dites-nous simplement : « J’aimerais… »
              </h2>
              <p className='mt-4 text-sm leading-7 text-white/66'>
                Nous vous aidons ensuite à préciser le lieu, la date, le nombre
                de personnes, l’ambiance, les limites et le budget. Rien n’est
                imposé et aucune réservation n’est faite sans votre accord.
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              {possibilities.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.title} className='rounded-lg border border-white/10 bg-white/[0.045] p-4'>
                    <div className='flex items-start gap-3'>
                      <Icon className='mt-0.5 h-5 w-5 shrink-0 text-[#ff8cc8]' />
                      <div>
                        <h3 className='font-black'>{item.title}</h3>
                        <p className='mt-1 text-sm leading-6 text-white/58'>{item.text}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div id='demande-conciergerie' className='scroll-mt-6'>
            <ConciergerieForm
              initialName={user?.name || ''}
              initialEmail={user?.email || ''}
            />
          </div>
        </div>
        <MobileNavigation />
      </LhrV2Shell>
    </MainLayout>
  )
}
