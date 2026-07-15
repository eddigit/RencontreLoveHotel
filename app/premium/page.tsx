import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarHeart, EyeOff, HeartHandshake, Sparkles } from 'lucide-react'

const benefits = [
  {
    icon: CalendarHeart,
    title: 'Expériences à venir',
    description: 'Retrouvez les dates publiées et proposez vos propres formats à la communauté.'
  },
  {
    icon: HeartHandshake,
    title: 'Conciergerie sur demande',
    description: 'Décrivez votre projet privé et recevez une réponse personnalisée de l’équipe.'
  },
  {
    icon: EyeOff,
    title: 'Discrétion maîtrisée',
    description: 'Gardez le contrôle sur votre profil, vos échanges et les personnes que vous souhaitez rencontrer.'
  }
]

export default function PremiumPage() {
  return (
    <div className='min-h-screen bg-[#120821] text-white'>
      <section className='relative isolate overflow-hidden'>
        <Image
          src='/paris-event-masquerade.png'
          alt='Ambiance premium d’une soirée Love Hôtel'
          fill
          priority
          className='-z-20 object-cover opacity-45'
          sizes='100vw'
        />
        <div className='absolute inset-0 -z-10 bg-[linear-gradient(90deg,#120821_4%,rgba(18,8,33,0.9)_52%,rgba(18,8,33,0.35)),linear-gradient(0deg,#120821,transparent_50%)]' />
        <div className='mx-auto flex min-h-[620px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-10'>
          <div className='max-w-3xl'>
            <div className='inline-flex items-center gap-2 rounded-full border border-[#ff8cc8]/25 bg-[#ff3b8b]/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#ff9bce]'>
              <Sparkles className='h-4 w-4' /> Expérience Love Hôtel
            </div>
            <h1 className='mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-7xl'>
              Plus de possibilités pour passer du virtuel au réel.
            </h1>
            <p className='mt-6 max-w-2xl text-lg leading-8 text-white/72'>
              Explorez les événements, les Love Rooms et la conciergerie privée. Les éventuelles formules payantes seront présentées ici avec leurs conditions précises avant leur ouverture.
            </p>
            <div className='mt-8 flex flex-wrap gap-3'>
              <Link href='/events' className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] px-6 py-3.5 font-black'>
                Voir les expériences <ArrowRight className='h-4 w-4' />
              </Link>
              <Link href='/conciergerie' className='rounded-full border border-white/20 bg-black/20 px-6 py-3.5 font-black'>
                Contacter la conciergerie
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className='mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24'>
        <div className='max-w-3xl'>
          <p className='text-xs font-black uppercase tracking-[0.24em] text-[#ff8cc8]'>Ce qui est disponible</p>
          <h2 className='mt-4 text-3xl font-black sm:text-5xl'>Des services concrets, sans promesse floue</h2>
        </div>
        <div className='mt-10 grid gap-5 md:grid-cols-3'>
          {benefits.map(benefit => {
            const Icon = benefit.icon
            return (
              <article key={benefit.title} className='rounded-3xl border border-white/10 bg-white/[0.045] p-7'>
                <Icon className='h-8 w-8 text-[#ff8cc8]' />
                <h3 className='mt-6 text-xl font-black'>{benefit.title}</h3>
                <p className='mt-3 leading-7 text-white/62'>{benefit.description}</p>
              </article>
            )
          })}
        </div>
        <div className='mt-10 rounded-3xl border border-[#ff8cc8]/20 bg-[linear-gradient(135deg,rgba(255,59,139,0.16),rgba(124,58,237,0.13))] p-7 sm:p-10'>
          <h2 className='text-2xl font-black sm:text-3xl'>Les formules Premium ne sont pas encore commercialisées.</h2>
          <p className='mt-4 max-w-3xl leading-7 text-white/66'>
            Aucun tarif ni avantage partenaire n’est annoncé tant qu’il n’est pas réellement disponible. Vous pouvez dès maintenant rejoindre la communauté et utiliser les parcours ouverts.
          </p>
          <Link href='/register' className='mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-black text-[#1b0926]'>
            Rejoindre la communauté <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </section>
    </div>
  )
}
