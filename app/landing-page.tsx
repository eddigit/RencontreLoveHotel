import { InstallJoug } from '@/components/install-joug'
import { Suspense } from 'react'
import { PublicCommunityActivity } from '@/components/public-community-activity'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  LockKeyhole,
  Eye,
  HeartHandshake,
  MapPin,
  MessageCircleHeart,
  Sparkles,
  UsersRound,
  BadgeCheck,
  Waves,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className='overflow-hidden bg-[#04070b] text-[#ecebe7] selection:bg-[#cdb984] selection:text-[#04070b]'>
      <section id='concept' className='relative isolate overflow-hidden border-b border-[#cdb984]/15'>
        <div className='absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_48%_0%,rgba(112,125,148,0.29),transparent_48%),radial-gradient(circle_at_85%_18%,rgba(86,93,105,0.13),transparent_23%),linear-gradient(115deg,#0a0f15,#04070b_58%,#111821)]' />
        <div className='absolute left-[8%] top-16 -z-10 h-72 w-72 rounded-full border border-[#cdb984]/15 blur-[1px]' />
        <div className='mx-auto grid w-full max-w-[1440px] items-center gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-12 lg:py-20'>
          <div className='max-w-xl lg:py-6'>
            <p className='text-[11px] font-bold uppercase tracking-[0.32em] text-[#ecebe7]'>Joug Rencontre · Cercle privé pour adultes</p>
            <h1 className='mt-5 max-w-[13ch] font-serif text-[clamp(3.35rem,7vw,6.8rem)] leading-[0.88] tracking-[-0.055em] text-[#ecebe7]'>
              Une affinité. <span className='italic text-[#dfc590]'>Un rendez-vous.</span>
            </h1>
            <p className='mt-7 max-w-lg text-base leading-7 text-[#c9c7c2]/75 sm:text-lg sm:leading-8'>
              En solo ou en couple, explorez vos affinités libertines, échangez en privé et proposez une rencontre à Paris. Un verre, un jacuzzi ou une Love Room à rideaux ouverts : à vous de choisir le lieu et le rythme.
            </p>
            <Suspense fallback={null}><PublicCommunityActivity /></Suspense>
            <div className='mt-8 flex flex-wrap gap-3'>
              <Link href='/register' className='inline-flex items-center gap-2 rounded-full border border-[#d6bc87]/45 bg-graphite px-6 py-3.5 text-sm font-extrabold text-graphite-ink transition hover:-translate-y-0.5 hover:bg-graphite-hover'>Rejoindre le cercle <ArrowRight className='h-4 w-4' /></Link>
              <Link href='/login' className='inline-flex items-center gap-2 rounded-full border border-[#c9c7c2]/25 px-6 py-3.5 text-sm font-bold text-[#ecebe7] transition hover:border-[#ecebe7]/70 hover:bg-white/[0.06]'>Retrouver mon compte <ArrowRight className='h-4 w-4' /></Link>
            </div>
            <p className='mt-3 text-sm text-[#c9c7c2]/75'>Inscription libre · Parrainage facultatif</p>
          </div>
          <div className='relative mx-auto w-full max-w-3xl lg:ml-auto'>
            <div className='absolute -inset-5 rounded-[2.4rem] bg-graphite blur-3xl' />
            <div className='relative aspect-[1.22] overflow-hidden rounded-[2rem] border border-[#f8d29b]/25 shadow-2xl shadow-black/45'>
              <Image
                src='/soiree-masquee.webp'
                alt='Masque doré, invitations et escarpin rouge sur une table de soirée'
                fill
                priority
                className='object-cover'
                sizes='(max-width: 1023px) 100vw, 55vw'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-[#141416]/80 via-transparent to-[#141416]/15' />
            </div>
          </div>
        </div>
      </section>

      <section id='communaute' aria-labelledby='application-title' className='bg-[#121317] px-5 py-12 sm:px-8 lg:py-16'>
        <div className='mx-auto grid max-w-[1280px] gap-9 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16'>
          <div>
            <div className='flex items-center gap-3 text-sm font-semibold text-[#e2c997]'>
              <Image src='/icons/joug-192.png' width={44} height={44} alt='' className='rounded-xl' /> L’application Joug Rencontre
            </div>
            <h2 id='application-title' className='my-5 max-w-[17ch] font-serif text-4xl leading-[1.05] sm:text-5xl'>Une communauté qui se rencontre vraiment.</h2>
            <p className='mb-6 max-w-md leading-7 text-stone-300'>Gardez le cercle à portée de main. Vous y retrouvez vos conversations, vos albums et les invitations aux prochaines sorties.</p>
            <InstallJoug />
          </div>
          <div className='grid gap-x-8 gap-y-6 sm:grid-cols-2'>
            {[
              { icon: UsersRound, title: 'Des envies partagées', text: 'Précisez vos affinités et découvrez les profils compatibles avec votre recherche.' },
              { icon: MessageCircleHeart, title: 'Une conversation à deux', text: 'Après un match, échangez en privé et retrouvez les réponses dans le même fil.' },
              { icon: LockKeyhole, title: 'Vos albums, vos choix', text: 'Partagez photos et vidéos avec les membres ou accordez à une personne un accès privé d’une heure.' },
              { icon: BadgeCheck, title: 'Un profil vérifié', text: 'Demandez une vérification volontaire de votre profil. Le cercle voit le badge et votre justificatif reste privé.' }
            ].map(({icon: Icon, title, text}) => (
              <article key={title} className='border-t border-[#d6bc87]/25 pt-4'>
                <Icon size={20} strokeWidth={1.6} className='text-[#d6bc87]' />
                <h3 className='mb-1 mt-3 font-semibold'>{title}</h3>
                <p className='text-sm leading-6 text-stone-300'>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className='border-b border-[#cdb984]/15 bg-[#0a0f15] px-4 py-12 sm:px-6 sm:py-14'>
        <div className='mx-auto max-w-[1280px]'>
          <p className='text-[11px] font-bold uppercase tracking-[0.3em] text-[#ecebe7]'>Trouver le bon cadre</p>
          <div className='mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {[
              { href: '/lieux?categorie=love-hotel', title: 'Love Hôtel', text: 'Chambre, jacuzzi et rendez-vous à deux ou en petit comité.', icon: HeartHandshake },
              { href: '/lieux?categorie=love-rooms-privees', title: 'Love Rooms privées', text: 'Jacuzzi privatif ou suite pour deux. Sélection indépendante à venir.', icon: MapPin },
              { href: '/lieux?categorie=restaurants', title: 'Restaurants', text: 'Premières tables partenaires en préparation pour faire connaissance autour d’un verre.', icon: CalendarDays },
              { href: '/lieux?categorie=clubs', title: 'Clubs', text: 'Clubs libertins et soirées à découvrir. Sélection en préparation.', icon: UsersRound },
              { href: '/lieux?categorie=espaces-bdsm', title: 'Espaces BDSM', text: 'À Châtelet, découvrez le salon « 50 nuances de rouge » du Love Hôtel.', icon: Sparkles },
              { href: '/lieux?categorie=theatre-erotique', title: 'Théâtre érotique', text: 'Spectacles sur billet, avec participation facultative. Programmation à venir.', icon: Eye },
              { href: '/events', title: 'Événements', text: 'Imaginer une rencontre et voir les formats proposés par la communauté.', icon: CalendarDays },
            ].map(item => {
              const Icon = item.icon
              return (
                <Link key={item.title} href={item.href} className='group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-[#ecebe7]/50 hover:bg-white/[0.07]'>
                  <Icon className='h-5 w-5 text-[#ecebe7]' />
                  <h2 className='mt-5 text-lg font-bold'>{item.title}</h2>
                  <p className='mt-2 text-sm leading-6 text-white/62'>{item.text}</p>
                  <span className='mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#ecebe7]'>Découvrir <ArrowRight className='h-3.5 w-3.5 transition group-hover:translate-x-1' /></span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className='border-b border-[#cdb984]/15 bg-[#111821] px-4 py-5 sm:px-6'>
        <div className='mx-auto flex max-w-[1280px] flex-col gap-3 text-sm text-[#c9c7c2]/76 md:flex-row md:items-center md:justify-between'>
          <p><strong className='font-bold text-[#ecebe7]'>Aucune prestation sexuelle rémunérée.</strong> Un billet ou une chambre se paie auprès du lieu. Chaque personne reste libre de la suite de la rencontre.</p>
          <Link href='/community-safety' className='shrink-0 font-semibold text-[#ecebe7] underline decoration-[#ecebe7]/45 underline-offset-4 hover:text-[#ecebe7]'>Notre cadre de sécurité</Link>
        </div>
      </section>

      <section id='hotels' className='relative bg-[#04070b] py-16 text-[#ecebe7] sm:py-20 lg:py-24'>
        <div className='absolute inset-x-0 top-0 h-px bg-[#d6bc87]/35' />
        <div className='mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10'>
          <div className='flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
            <div className='max-w-2xl'>
              <p className='text-[11px] font-bold uppercase tracking-[0.3em] text-[#ecebe7]'>Des lieux réels, des parcours clairs</p>
              <h2 className='mt-4 font-serif text-4xl leading-none tracking-[-0.04em] sm:text-5xl'>Une chambre peut devenir un point de départ.</h2>
              <p className='mt-5 max-w-xl leading-7 text-[#c9c7c2]/75'>Les Love Hôtels sont les premières adresses mises en avant. Vous échangez, convenez du cadre, puis réservez directement auprès de l’établissement si cela vous convient.</p>
            </div>
            <Link href='/lieux' className='inline-flex w-fit items-center gap-2 border-b border-[#ecebe7] pb-1 text-sm font-bold text-[#ecebe7] transition hover:text-[#ecebe7]'>Explorer les catégories de lieux <ArrowRight className='h-4 w-4' /></Link>
          </div>
          <div className='mt-10 grid gap-5 lg:grid-cols-2'>
            <article className='rounded-[1.8rem] bg-[#0a0f15] p-7 text-[#ecebe7] shadow-xl shadow-[#4b2333]/10 sm:p-9'>
              <div className='flex items-start justify-between gap-4'><MapPin className='h-7 w-7 text-[#ecebe7]' /><span className='rounded-full border border-[#ecebe7]/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ecebe7]'>à découvrir</span></div>
              <p className='mt-9 text-xs font-bold uppercase tracking-[0.2em] text-white/50'>72 boulevard de Clichy · Paris 18e</p>
              <h3 className='mt-2 font-serif text-4xl'>Love Hôtel Pigalle</h3>
              <p className='mt-4 max-w-lg leading-7 text-white/70'>Chambre, jacuzzi, rendez-vous à deux ou petit comité : un cadre pour donner une forme concrète à une envie partagée.</p>
              <Link href='/love-rooms' className='mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#ecebe7] hover:text-[#ecebe7]'>Découvrir le parcours <ArrowRight className='h-4 w-4' /></Link>
            </article>
            <article className='rounded-[1.8rem] border border-[#7f4153]/25 bg-[#111821] p-7 sm:p-9'>
              <div className='flex items-start justify-between gap-4'><MapPin className='h-7 w-7 text-[#ecebe7]' /><span className='rounded-full border border-[#ecebe7]/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ecebe7]'>à découvrir</span></div>
              <p className='mt-9 text-xs font-bold uppercase tracking-[0.2em] text-[#c9c7c2]/60'>Paris 1er</p>
              <h3 className='mt-2 font-serif text-4xl'>Love Hôtel Châtelet</h3>
              <p className='mt-4 max-w-lg leading-7 text-[#c9c7c2]/75'>Une autre adresse parisienne pour organiser une rencontre et échanger avant de décider du moment, du rythme et des personnes invitées.</p>
              <Link href='/love-rooms' className='mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#ecebe7] hover:text-[#ecebe7]'>Voir les Love Rooms <ArrowRight className='h-4 w-4' /></Link>
            </article>
          </div>
          <p className='mt-5 text-sm leading-6 text-[#c9c7c2]/65'>Les disponibilités, tarifs et réservations ne sont pas affichés ici : ils se vérifient directement avec chaque établissement.</p>
        </div>
      </section>

      <section id='experiences' className='relative py-16 sm:py-20 lg:py-24'>
        <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_35%,rgba(90,96,108,0.17),transparent_24%),linear-gradient(135deg,#04070b,#0a0f15)]' />
        <div className='mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10'>
          <div className='max-w-3xl'><p className='text-[11px] font-bold uppercase tracking-[0.3em] text-[#ecebe7]'>Une communauté en mouvement</p><h2 className='mt-4 font-serif text-4xl leading-none tracking-[-0.04em] sm:text-5xl'>Des expériences à imaginer ensemble.</h2><p className='mt-5 text-lg leading-8 text-[#c9c7c2]/70'>Une rencontre ne se résume pas à un profil. Joug Rencontre permet de discuter, de poser les limites, puis de choisir un format qui correspond vraiment aux personnes concernées.</p></div>
          <div className='mt-10 grid gap-5 lg:grid-cols-3'>
            <article className='overflow-hidden rounded-[1.7rem] border border-[#c9c7c2]/10 bg-[#202122]'><div className='relative aspect-[16/10]'><Image src='/apero-jacuzzi-rencontre.jpg' alt='Ambiance d’un apéro jacuzzi entre membres' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 33vw' /></div><div className='p-6'><Waves className='h-6 w-6 text-[#ecebe7]' /><h3 className='mt-5 font-serif text-3xl'>Apéros jacuzzi</h3><p className='mt-3 leading-7 text-white/64'>Une invitation précise, un groupe choisi et un temps pour faire connaissance sans précipiter la suite.</p></div></article>
            <article className='overflow-hidden rounded-[1.7rem] border border-[#c9c7c2]/10 bg-[#202122]'><div className='relative aspect-[16/10]'><Image src='/paris-event-limousine.png' alt='Ambiance nocturne d’un événement parisien' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 33vw' /></div><div className='p-6'><CalendarDays className='h-6 w-6 text-[#ecebe7]' /><h3 className='mt-5 font-serif text-3xl'>Événements membres</h3><p className='mt-3 leading-7 text-white/64'>Une idée, une date, des personnes intéressées : les rencontres communautaires prennent forme à partir d’un projet partagé.</p></div></article>
            <article className='overflow-hidden rounded-[1.7rem] border border-[#ecebe7]/25 bg-[#202122]'><div className='relative aspect-[16/10]'><Image src='/rideaux-ouverts-rencontre.jpg' alt='Expérience Rideaux Ouverts dans une chambre' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 33vw' /></div><div className='p-6'><Eye className='h-6 w-6 text-[#ecebe7]' /><h3 className='mt-5 font-serif text-3xl'>RIDEAUX OUVERTS</h3><p className='mt-3 leading-7 text-white/64'>Une expérience où regarder ou se montrer est un choix formulé en amont, dans le respect du consentement de chacun.</p></div></article>
          </div>
          <Link href='/events' className='mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#ecebe7] underline decoration-[#ecebe7]/35 underline-offset-4 hover:text-[#ecebe7]'>Découvrir les événements <ArrowRight className='h-4 w-4' /></Link>
        </div>
      </section>


    </div>
  )
}
