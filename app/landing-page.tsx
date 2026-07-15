import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarPlus,
  Eye,
  HeartHandshake,
  MapPin,
  MessageCircleHeart,
  Sparkles,
  UsersRound,
  Waves
} from 'lucide-react'

const heroExperiences = [
  {
    title: 'APÉROS JACUZZI',
    subtitle: 'Des rencontres en petit groupe',
    image: '/apero-jacuzzi-rencontre.jpg',
    alt: 'Apéro jacuzzi entre membres de la communauté'
  },
  {
    title: 'SOPHIA',
    subtitle: 'Une communauté bien réelle',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/public/amethyst-glow-YU11au0rIIGAWH8iymdMmtFrC6ZFIb.png',
    alt: 'Sophia, membre de la communauté Love Hôtel'
  },
  {
    title: 'VOS ÉVÉNEMENTS',
    subtitle: 'Imaginez votre propre format',
    image: '/paris-event-masquerade.png',
    alt: 'Soirée parisienne avec masque, champagne et escarpin rouge'
  },
  {
    title: 'RIDEAUX OUVERTS',
    subtitle: 'Voir ou être vu, toujours consenti',
    image: '/rideaux-ouverts-rencontre.jpg',
    alt: 'Expérience Rideaux Ouverts au Love Hôtel'
  }
]

export default function LandingPage() {
  return (
    <div className='overflow-hidden bg-[#120821] text-white'>
      <section id='concept' className='relative isolate overflow-hidden'>
        <div className='absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_12%,rgba(255,59,139,0.25),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(124,58,237,0.28),transparent_38%),linear-gradient(135deg,#120821_0%,#2d0a43_52%,#14051f_100%)]' />
        <div className='absolute inset-0 -z-10 bg-[url("/purple-glow-pattern.png")] opacity-15 mix-blend-overlay' />

        <div className='mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[1440px] items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-20'>
          <div className='max-w-2xl'>
            <div className='mb-5 inline-flex items-center gap-2 rounded-full border border-[#ff8cc8]/25 bg-[#ff3b8b]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#ff9bce]'>
              <Sparkles className='h-4 w-4' />
              Deux hôtels, une communauté
            </div>
            <h1 className='text-4xl font-black uppercase leading-[0.98] tracking-[-0.045em] sm:text-5xl md:text-6xl xl:text-7xl'>
              Les rencontres en ligne deviennent{' '}
              <span className='bg-gradient-to-r from-[#ff3b8b] to-[#ff9bce] bg-clip-text text-transparent'>
                des expériences réelles
              </span>
            </h1>
            <p className='mt-6 max-w-xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8'>
              Love Hôtel relie une communauté libre et curieuse à deux lieux parisiens, Pigalle et Châtelet.
              Échangez, créez un événement et retrouvez-vous autour d’un jacuzzi ou d’une expérience imaginée ensemble.
            </p>
            <div className='mt-8 flex flex-wrap gap-3'>
              <Link
                href='/register'
                className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] px-6 py-3.5 text-sm font-black shadow-xl shadow-[#ff3b8b]/20 transition hover:-translate-y-0.5'
              >
                Rejoindre la communauté
                <ArrowRight className='h-4 w-4' />
              </Link>
              <Link
                href='#experiences'
                className='inline-flex items-center rounded-full border border-white/18 bg-white/[0.045] px-6 py-3.5 text-sm font-black transition hover:bg-white/[0.09]'
              >
                Découvrir les expériences
              </Link>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3 sm:gap-4'>
            {heroExperiences.map((experience, index) => (
              <article
                key={experience.title}
                className={`group relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/30 ${
                  index % 2 === 1 ? 'translate-y-5' : ''
                }`}
              >
                <Image
                  src={experience.image}
                  alt={experience.alt}
                  fill
                  priority={index < 2}
                  className='object-cover transition duration-700 group-hover:scale-105'
                  sizes='(max-width: 1024px) 50vw, 25vw'
                />
                <div className='absolute inset-0 bg-gradient-to-t from-[#12051c] via-[#12051c]/12 to-transparent' />
                <div className='absolute inset-x-0 bottom-0 p-4 sm:p-5'>
                  <h2 className='text-sm font-black sm:text-lg'>{experience.title}</h2>
                  <p className='mt-1 text-xs text-white/70 sm:text-sm'>{experience.subtitle}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id='hotels' className='relative py-16 sm:py-20 lg:py-24'>
        <div className='mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10'>
          <div className='mx-auto max-w-3xl text-center'>
            <p className='text-xs font-black uppercase tracking-[0.24em] text-[#ff72b5]'>Deux adresses parisiennes</p>
            <h2 className='mt-4 text-3xl font-black sm:text-4xl lg:text-5xl'>Le virtuel prend rendez-vous à l’hôtel</h2>
            <p className='mt-5 text-base leading-7 text-white/62 sm:text-lg'>
              Les conversations ne restent pas derrière un écran. Pigalle et Châtelet deviennent les points de rencontre
              où les membres donnent vie à leurs envies, à leur rythme.
            </p>
          </div>

          <div className='mt-10 grid gap-5 md:grid-cols-2'>
            <article className='relative overflow-hidden rounded-3xl border border-[#ff72b5]/20 bg-[radial-gradient(circle_at_10%_0%,rgba(255,59,139,0.24),transparent_40%),linear-gradient(135deg,#2a0a38,#180622)] p-7 sm:p-9'>
              <MapPin className='h-9 w-9 text-[#ff72b5]' />
              <p className='mt-8 text-xs font-bold uppercase tracking-[0.22em] text-white/48'>Paris 9e</p>
              <h3 className='mt-2 text-3xl font-black'>Love Hôtel Pigalle</h3>
              <p className='mt-4 max-w-lg leading-7 text-white/62'>
                Une adresse intime pour organiser un apéro jacuzzi, prolonger une rencontre et vivre une expérience
                choisie avec d’autres membres.
              </p>
            </article>

            <article className='relative overflow-hidden rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_90%_0%,rgba(124,58,237,0.3),transparent_42%),linear-gradient(135deg,#251038,#16051f)] p-7 sm:p-9'>
              <MapPin className='h-9 w-9 text-violet-300' />
              <p className='mt-8 text-xs font-bold uppercase tracking-[0.22em] text-white/48'>Paris centre</p>
              <h3 className='mt-2 text-3xl font-black'>Love Hôtel Châtelet</h3>
              <p className='mt-4 max-w-lg leading-7 text-white/62'>
                Un second point de rendez-vous au cœur de Paris pour réunir la communauté et multiplier les possibilités
                d’événements en petit comité.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id='experiences' className='border-y border-white/8 bg-white/[0.025] py-16 sm:py-20 lg:py-24'>
        <div className='mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10'>
          <div className='max-w-3xl'>
            <p className='text-xs font-black uppercase tracking-[0.24em] text-[#ff72b5]'>À vivre ensemble</p>
            <h2 className='mt-4 text-3xl font-black sm:text-4xl lg:text-5xl'>Des expériences, pas seulement des profils</h2>
            <p className='mt-5 text-base leading-7 text-white/62 sm:text-lg'>
              Chaque format crée une occasion claire de se rencontrer. Vous choisissez votre niveau d’ouverture et les
              personnes avec qui vous souhaitez le vivre.
            </p>
          </div>

          <div className='mt-10 grid gap-5 lg:grid-cols-3'>
            <article className='overflow-hidden rounded-3xl border border-white/10 bg-[#1b0926]'>
              <div className='relative aspect-[16/10]'>
                <Image src='/apero-jacuzzi-rencontre.jpg' alt='Apéros jacuzzi entre membres' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 33vw' />
              </div>
              <div className='p-6'>
                <Waves className='h-7 w-7 text-[#ff72b5]' />
                <h3 className='mt-5 text-2xl font-black'>Apéros jacuzzi</h3>
                <p className='mt-3 leading-7 text-white/60'>
                  Deux à quatre couples, une invitation précise et un moment chaleureux pour faire connaissance sans
                  brusquer la rencontre.
                </p>
              </div>
            </article>

            <article className='overflow-hidden rounded-3xl border border-white/10 bg-[#1b0926]'>
              <div className='relative aspect-[16/10]'>
                 <Image src='/paris-event-limousine.png' alt='Soirée parisienne en limousine avec vue sur la tour Eiffel' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 33vw' />
              </div>
              <div className='p-6'>
                <CalendarPlus className='h-7 w-7 text-violet-300' />
                <h3 className='mt-5 text-2xl font-black'>Événements communautaires</h3>
                <p className='mt-3 leading-7 text-white/60'>
                  Speed dating, rencontre thématique ou idée spontanée : les membres proposent le format et invitent les
                  personnes qui partagent la même envie.
                </p>
              </div>
            </article>

            <article className='overflow-hidden rounded-3xl border border-[#ff72b5]/18 bg-[#1b0926]'>
              <div className='relative aspect-[16/10]'>
                <Image src='/rideaux-ouverts-rencontre.jpg' alt='Expérience Rideaux Ouverts' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 33vw' />
              </div>
              <div className='p-6'>
                <Eye className='h-7 w-7 text-[#ff72b5]' />
                <h3 className='mt-5 text-2xl font-black'>RIDEAUX OUVERTS</h3>
                <p className='mt-3 leading-7 text-white/60'>
                  Des chambres face à face : certains choisissent de s’exhiber derrière un rideau ouvert, d’autres
                  d’observer. Les envies et les limites sont posées avant l’expérience.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id='communaute' className='relative py-16 sm:py-20 lg:py-24'>
        <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_40%,rgba(255,59,139,0.14),transparent_32%)]' />
        <div className='mx-auto grid w-full max-w-[1280px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-10'>
          <div>
            <p className='text-xs font-black uppercase tracking-[0.24em] text-[#ff72b5]'>La communauté donne le rythme</p>
            <h2 className='mt-4 text-3xl font-black sm:text-4xl lg:text-5xl'>Créez vos propres événements</h2>
            <p className='mt-5 text-base leading-7 text-white/62 sm:text-lg'>
              Love Hôtel fournit les lieux et la plateforme. Les membres imaginent les occasions de se rencontrer,
              échangent avant le rendez-vous et construisent une expérience qui leur ressemble.
            </p>
            <div className='mt-8 flex flex-wrap gap-3'>
              <Link href='/register' className='inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-black text-[#20102b]'>
                Créer mon profil
                <ArrowRight className='h-4 w-4' />
              </Link>
              <Link href='/events' className='rounded-full border border-white/18 px-6 py-3.5 text-sm font-black'>Voir les événements</Link>
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            {[
              { icon: MessageCircleHeart, title: 'Échangez', text: 'Discutez, trouvez les bonnes affinités et posez vos envies clairement.' },
              { icon: CalendarPlus, title: 'Proposez', text: 'Créez un apéro jacuzzi, un speed dating ou votre propre idée.' },
              { icon: UsersRound, title: 'Invitez', text: 'Choisissez un petit groupe et réunissez des personnes réellement intéressées.' },
              { icon: HeartHandshake, title: 'Rencontrez-vous', text: 'Passez du profil au réel à Pigalle ou à Châtelet, dans un cadre identifié.' }
            ].map(step => {
              const Icon = step.icon
              return (
                <article key={step.title} className='rounded-2xl border border-white/10 bg-white/[0.04] p-6'>
                  <Icon className='h-7 w-7 text-[#ff72b5]' />
                  <h3 className='mt-5 text-xl font-black'>{step.title}</h3>
                  <p className='mt-2 leading-6 text-white/58'>{step.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className='px-4 pb-16 sm:px-6 sm:pb-20 lg:px-10 lg:pb-24'>
        <div className='mx-auto max-w-[1280px] overflow-hidden rounded-[2rem] border border-[#ff8cc8]/20 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.12),transparent_25%),linear-gradient(110deg,#7b1b66,#ff3b8b_58%,#ff8cc8)] px-6 py-10 text-center shadow-2xl shadow-[#ff3b8b]/15 sm:px-10 sm:py-14'>
          <h2 className='text-3xl font-black sm:text-4xl lg:text-5xl'>La prochaine rencontre peut commencer ici</h2>
          <p className='mx-auto mt-4 max-w-2xl text-base leading-7 text-white/82 sm:text-lg'>
            Rejoignez la communauté, partagez vos envies et créez une vraie occasion de vous retrouver dans l’un des deux Love Hôtels.
          </p>
          <Link href='/register' className='mt-7 inline-flex items-center gap-2 rounded-full bg-[#17051f] px-7 py-3.5 text-sm font-black text-white'>
            Devenir membre
            <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </section>
    </div>
  )
}
