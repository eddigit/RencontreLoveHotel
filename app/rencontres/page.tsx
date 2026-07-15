import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarHeart, HeartHandshake, MapPin, ShieldCheck, UsersRound } from 'lucide-react'

const steps = [
  {
    icon: UsersRound,
    title: 'Faites connaissance',
    description: 'Créez votre profil, découvrez les personnes compatibles et échangez avant tout rendez-vous.'
  },
  {
    icon: CalendarHeart,
    title: 'Choisissez une expérience',
    description: 'Rejoignez une date proposée ou imaginez un format en petit groupe avec la communauté.'
  },
  {
    icon: HeartHandshake,
    title: 'Rencontrez-vous vraiment',
    description: 'Passez du virtuel au réel à Pigalle ou Châtelet, dans un cadre identifié et choisi ensemble.'
  }
]

export default function RencontresPage() {
  return (
    <div className='min-h-screen bg-[#120821] text-white'>
      <section className='relative isolate overflow-hidden'>
        <Image
          src='/paris-event-limousine.png'
          alt='Paris de nuit, cadre des rencontres Love Hôtel'
          fill
          priority
          className='-z-20 object-cover opacity-40'
          sizes='100vw'
        />
        <div className='absolute inset-0 -z-10 bg-[linear-gradient(90deg,#120821_4%,rgba(18,8,33,0.88)_46%,rgba(18,8,33,0.4)),linear-gradient(0deg,#120821,transparent_45%)]' />
        <div className='mx-auto flex min-h-[640px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-10'>
          <div className='max-w-3xl'>
            <p className='text-xs font-black uppercase tracking-[0.24em] text-[#ff8cc8]'>Rencontres Love Hôtel</p>
            <h1 className='mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-7xl'>
              Une conversation en ligne. Une vraie rencontre à Paris.
            </h1>
            <p className='mt-6 max-w-2xl text-lg leading-8 text-white/72'>
              Love Hôtel réunit une communauté libre et curieuse autour de deux adresses parisiennes et d’événements imaginés ensemble.
            </p>
            <div className='mt-8 flex flex-wrap gap-3'>
              <Link href='/register' className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] px-6 py-3.5 font-black'>
                Rejoindre la communauté <ArrowRight className='h-4 w-4' />
              </Link>
              <Link href='/events' className='rounded-full border border-white/20 bg-black/20 px-6 py-3.5 font-black'>
                Voir les événements
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className='mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24'>
        <div className='max-w-3xl'>
          <p className='text-xs font-black uppercase tracking-[0.24em] text-[#ff8cc8]'>Du profil au rendez-vous</p>
          <h2 className='mt-4 text-3xl font-black sm:text-5xl'>Un parcours simple, lisible et consenti</h2>
        </div>
        <div className='mt-10 grid gap-5 md:grid-cols-3'>
          {steps.map(step => {
            const Icon = step.icon
            return (
              <article key={step.title} className='rounded-3xl border border-white/10 bg-white/[0.045] p-7'>
                <Icon className='h-8 w-8 text-[#ff8cc8]' />
                <h3 className='mt-6 text-xl font-black'>{step.title}</h3>
                <p className='mt-3 leading-7 text-white/62'>{step.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className='border-y border-white/8 bg-white/[0.025]'>
        <div className='mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-10 lg:py-24'>
          {[
            ['Pigalle', 'Paris 9e, pour les rendez-vous et expériences Love Hôtel au nord de Paris.'],
            ['Châtelet', 'Au cœur de Paris, un second point de rencontre facile d’accès pour la communauté.']
          ].map(([place, description]) => (
            <article key={place} className='rounded-3xl border border-[#ff8cc8]/18 bg-[linear-gradient(135deg,rgba(255,59,139,0.15),rgba(124,58,237,0.12))] p-8'>
              <MapPin className='h-8 w-8 text-[#ff8cc8]' />
              <h2 className='mt-7 text-3xl font-black'>Love Hôtel {place}</h2>
              <p className='mt-4 leading-7 text-white/64'>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className='mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-24'>
        <div className='relative min-h-96 overflow-hidden rounded-3xl'>
          <Image src='/paris-event-masquerade.png' alt='Ambiance d’une soirée parisienne Love Hôtel' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 42vw' />
        </div>
        <div>
          <ShieldCheck className='h-9 w-9 text-[#ff8cc8]' />
          <h2 className='mt-6 text-3xl font-black sm:text-5xl'>Vos limites restent au centre</h2>
          <p className='mt-5 text-lg leading-8 text-white/66'>
            Chaque échange, invitation et expérience repose sur un consentement clair. Vous choisissez votre visibilité, vos affinités et le rythme auquel vous souhaitez rencontrer.
          </p>
          <Link href='/register' className='mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-black text-[#1b0926]'>
            Créer mon profil <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </section>
    </div>
  )
}
