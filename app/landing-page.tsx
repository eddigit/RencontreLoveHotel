import { Suspense } from 'react'
import { PublicCommunityActivity } from '@/components/public-community-activity'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Check,
  Eye,
  HeartHandshake,
  MapPin,
  MessageCircleHeart,
  Sparkles,
  UsersRound,
  Waves,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className='overflow-hidden bg-[#181a1a] text-[#fff8ed] selection:bg-[#cdb984] selection:text-[#1c1018]'>
      <section id='concept' className='relative isolate overflow-hidden border-b border-[#cdb984]/15'>
        <div className='absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_15%,rgba(129,126,110,0.18),transparent_31%),radial-gradient(circle_at_85%_18%,rgba(210,192,148,0.13),transparent_23%),linear-gradient(115deg,#222525,#191b1b_58%,#292a27)]' />
        <div className='absolute left-[8%] top-16 -z-10 h-72 w-72 rounded-full border border-[#cdb984]/15 blur-[1px]' />
        <div className='mx-auto grid w-full max-w-[1440px] items-center gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-12 lg:py-20'>
          <div className='max-w-xl lg:py-6'>
            <p className='text-[11px] font-bold uppercase tracking-[0.32em] text-[#ead29a]'>Paris · Cercle privé de rencontres</p>
            <h1 className='mt-5 max-w-[10ch] font-serif text-[clamp(3.35rem,7vw,6.8rem)] leading-[0.88] tracking-[-0.055em] text-[#fff8ed]'>
              Rencontres <span className='italic text-[#ead29a]'>libertines</span>, à votre façon.
            </h1>
            <p className='mt-7 max-w-lg text-base leading-7 text-[#f6e9df]/75 sm:text-lg sm:leading-8'>
              Célibataire ou en couple, retrouvez les membres du cercle autour d’un verre, d’une soirée ou d’une escapade en Love Room. Découvrez les sorties proposées et inscrivez-vous depuis leur fiche.
            </p>
            <Suspense fallback={null}><PublicCommunityActivity /></Suspense>
            <div className='mt-8 flex flex-wrap gap-3'>
              <Link href='/register' className='inline-flex items-center gap-2 rounded-full bg-[#ead29a] px-6 py-3.5 text-sm font-extrabold text-[#24101d] transition hover:-translate-y-0.5 hover:bg-[#f6e4bc]'>Rejoindre le cercle <ArrowRight className='h-4 w-4' /></Link>
              <Link href='/lieux' className='inline-flex items-center gap-2 rounded-full border border-[#f6e9df]/25 px-6 py-3.5 text-sm font-bold text-[#fff8ed] transition hover:border-[#ead29a]/70 hover:bg-white/[0.06]'>Choisir un type de lieu <MapPin className='h-4 w-4' /></Link>
            </div>
            <p className='mt-3 text-sm text-[#f6e9df]/75'>Inscription libre · Parrainage facultatif</p>
          </div>
          <div className='relative mx-auto w-full max-w-3xl lg:ml-auto'>
            <div className='absolute -inset-5 rounded-[2.4rem] bg-[#d7875f]/20 blur-3xl' />
            <div className='relative aspect-[1.22] overflow-hidden rounded-[2rem] border border-[#f8d29b]/25 shadow-2xl shadow-black/45'>
              <Image
                src='/soiree-masquee.webp'
                alt='Masque doré, invitations et escarpin rouge sur une table de soirée'
                fill
                priority
                className='object-cover'
                sizes='(max-width: 1023px) 100vw, 55vw'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-[#160b12]/80 via-transparent to-[#160b12]/15' />
            </div>
          </div>
        </div>
      </section>

      <section className='border-b border-[#cdb984]/15 bg-[#202222] px-4 py-12 sm:px-6 sm:py-14'>
        <div className='mx-auto max-w-[1280px]'>
          <p className='text-[11px] font-bold uppercase tracking-[0.3em] text-[#ead29a]'>Trouver le bon cadre</p>
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
                <Link key={item.title} href={item.href} className='group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-[#ead29a]/50 hover:bg-white/[0.07]'>
                  <Icon className='h-5 w-5 text-[#ead29a]' />
                  <h2 className='mt-5 text-lg font-bold'>{item.title}</h2>
                  <p className='mt-2 text-sm leading-6 text-white/62'>{item.text}</p>
                  <span className='mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#ead29a]'>Découvrir <ArrowRight className='h-3.5 w-3.5 transition group-hover:translate-x-1' /></span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className='border-b border-[#cdb984]/15 bg-[#252727] px-4 py-5 sm:px-6'>
        <div className='mx-auto flex max-w-[1280px] flex-col gap-3 text-sm text-[#f6e9df]/76 md:flex-row md:items-center md:justify-between'>
          <p><strong className='font-bold text-[#fff8ed]'>Aucune prestation sexuelle rémunérée.</strong> Un billet ou une chambre se paie auprès du lieu. Chaque personne reste libre de la suite de la rencontre.</p>
          <Link href='/community-safety' className='shrink-0 font-semibold text-[#ead29a] underline decoration-[#ead29a]/45 underline-offset-4 hover:text-[#f6e4bc]'>Notre cadre de sécurité</Link>
        </div>
      </section>

      <section id='hotels' className='relative bg-[#f2e4d4] py-16 text-[#25101b] sm:py-20 lg:py-24'>
        <div className='absolute inset-x-0 top-0 h-px bg-[#b97445]/40' />
        <div className='mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10'>
          <div className='flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
            <div className='max-w-2xl'>
              <p className='text-[11px] font-bold uppercase tracking-[0.3em] text-[#8b3d56]'>Des lieux réels, des parcours clairs</p>
              <h2 className='mt-4 font-serif text-4xl leading-none tracking-[-0.04em] sm:text-5xl'>Une chambre peut devenir un point de départ.</h2>
              <p className='mt-5 max-w-xl leading-7 text-[#4a2838]/75'>Les Love Hôtels sont les premières adresses mises en avant. Vous échangez, convenez du cadre, puis réservez directement auprès de l’établissement si cela vous convient.</p>
            </div>
            <Link href='/lieux' className='inline-flex w-fit items-center gap-2 border-b border-[#8b3d56] pb-1 text-sm font-bold text-[#5e203d] transition hover:text-[#b44d64]'>Explorer les catégories de lieux <ArrowRight className='h-4 w-4' /></Link>
          </div>
          <div className='mt-10 grid gap-5 lg:grid-cols-2'>
            <article className='rounded-[1.8rem] bg-[#341827] p-7 text-[#fff8ed] shadow-xl shadow-[#4b2333]/10 sm:p-9'>
              <div className='flex items-start justify-between gap-4'><MapPin className='h-7 w-7 text-[#ead29a]' /><span className='rounded-full border border-[#ead29a]/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ead29a]'>à découvrir</span></div>
              <p className='mt-9 text-xs font-bold uppercase tracking-[0.2em] text-white/50'>72 boulevard de Clichy · Paris 18e</p>
              <h3 className='mt-2 font-serif text-4xl'>Love Hôtel Pigalle</h3>
              <p className='mt-4 max-w-lg leading-7 text-white/70'>Chambre, jacuzzi, rendez-vous à deux ou petit comité : un cadre pour donner une forme concrète à une envie partagée.</p>
              <Link href='/love-rooms' className='mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#ead29a] hover:text-[#f6e4bc]'>Découvrir le parcours <ArrowRight className='h-4 w-4' /></Link>
            </article>
            <article className='rounded-[1.8rem] border border-[#7f4153]/25 bg-[#e5cdbb] p-7 sm:p-9'>
              <div className='flex items-start justify-between gap-4'><MapPin className='h-7 w-7 text-[#8b3d56]' /><span className='rounded-full border border-[#8b3d56]/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b3d56]'>à découvrir</span></div>
              <p className='mt-9 text-xs font-bold uppercase tracking-[0.2em] text-[#5d3342]/60'>Paris 1er</p>
              <h3 className='mt-2 font-serif text-4xl'>Love Hôtel Châtelet</h3>
              <p className='mt-4 max-w-lg leading-7 text-[#4a2838]/75'>Une autre adresse parisienne pour organiser une rencontre et échanger avant de décider du moment, du rythme et des personnes invitées.</p>
              <Link href='/love-rooms' className='mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#6f2947] hover:text-[#a64360]'>Voir les Love Rooms <ArrowRight className='h-4 w-4' /></Link>
            </article>
          </div>
          <p className='mt-5 text-sm leading-6 text-[#4a2838]/65'>Les disponibilités, tarifs et réservations ne sont pas affichés ici : ils se vérifient directement avec chaque établissement.</p>
        </div>
      </section>

      <section id='experiences' className='relative py-16 sm:py-20 lg:py-24'>
        <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_35%,rgba(223,139,77,0.17),transparent_24%),linear-gradient(135deg,#1a0e18,#24101a)]' />
        <div className='mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10'>
          <div className='max-w-3xl'><p className='text-[11px] font-bold uppercase tracking-[0.3em] text-[#ead29a]'>Une communauté en mouvement</p><h2 className='mt-4 font-serif text-4xl leading-none tracking-[-0.04em] sm:text-5xl'>Des expériences à imaginer ensemble.</h2><p className='mt-5 text-lg leading-8 text-[#f6e9df]/70'>Une rencontre ne se résume pas à un profil. LHR permet de discuter, de poser les limites, puis de choisir un format qui correspond vraiment aux personnes concernées.</p></div>
          <div className='mt-10 grid gap-5 lg:grid-cols-3'>
            <article className='overflow-hidden rounded-[1.7rem] border border-[#f6e9df]/10 bg-[#2a1621]'><div className='relative aspect-[16/10]'><Image src='/apero-jacuzzi-rencontre.jpg' alt='Ambiance d’un apéro jacuzzi entre membres' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 33vw' /></div><div className='p-6'><Waves className='h-6 w-6 text-[#ead29a]' /><h3 className='mt-5 font-serif text-3xl'>Apéros jacuzzi</h3><p className='mt-3 leading-7 text-white/64'>Une invitation précise, un groupe choisi et un temps pour faire connaissance sans précipiter la suite.</p></div></article>
            <article className='overflow-hidden rounded-[1.7rem] border border-[#f6e9df]/10 bg-[#2a1621]'><div className='relative aspect-[16/10]'><Image src='/paris-event-limousine.png' alt='Ambiance nocturne d’un événement parisien' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 33vw' /></div><div className='p-6'><CalendarDays className='h-6 w-6 text-[#ead29a]' /><h3 className='mt-5 font-serif text-3xl'>Événements membres</h3><p className='mt-3 leading-7 text-white/64'>Une idée, une date, des personnes intéressées : les rencontres communautaires prennent forme à partir d’un projet partagé.</p></div></article>
            <article className='overflow-hidden rounded-[1.7rem] border border-[#ead29a]/25 bg-[#2a1621]'><div className='relative aspect-[16/10]'><Image src='/rideaux-ouverts-rencontre.jpg' alt='Expérience Rideaux Ouverts dans une chambre' fill className='object-cover' sizes='(max-width: 1024px) 100vw, 33vw' /></div><div className='p-6'><Eye className='h-6 w-6 text-[#ead29a]' /><h3 className='mt-5 font-serif text-3xl'>RIDEAUX OUVERTS</h3><p className='mt-3 leading-7 text-white/64'>Une expérience où regarder ou se montrer est un choix formulé en amont, dans le respect du consentement de chacun.</p></div></article>
          </div>
          <Link href='/events' className='mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#ead29a] underline decoration-[#ead29a]/35 underline-offset-4 hover:text-[#f6e4bc]'>Découvrir les événements <ArrowRight className='h-4 w-4' /></Link>
        </div>
      </section>

      <section id='communaute' className='relative px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24'>
        <div className='mx-auto grid max-w-[1280px] gap-10 rounded-[2rem] border border-[#ead29a]/20 bg-[radial-gradient(circle_at_82%_15%,rgba(229,137,78,0.26),transparent_25%),linear-gradient(120deg,#54203e,#24101d_65%)] p-7 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:p-14'><div><p className='text-[11px] font-bold uppercase tracking-[0.3em] text-[#f6e4bc]'>Vous donnez le rythme</p><h2 className='mt-4 font-serif text-4xl leading-none tracking-[-0.04em] sm:text-5xl'>Une communauté qui se rencontre vraiment.</h2><p className='mt-5 max-w-md leading-7 text-white/72'>Discutez, affinez vos envies, proposez un moment. LHR est là pour transformer une intention commune en rencontre choisie.</p><Link href='/register' className='mt-8 inline-flex items-center gap-2 rounded-full bg-[#ead29a] px-6 py-3.5 text-sm font-extrabold text-[#24101d] transition hover:bg-[#f6e4bc]'>Créer mon profil <ArrowRight className='h-4 w-4' /></Link></div><div className='grid gap-3 sm:grid-cols-2'>{[{ icon: MessageCircleHeart, title: 'Parlez vrai', text: 'Des échanges directs pour poser envies, limites et affinités.' },{ icon: UsersRound, title: 'Choisissez votre cercle', text: 'À deux, en petit comité ou autour d’un événement ouvert.' },{ icon: CalendarDays, title: 'Proposez un moment', text: 'Une date et un cadre clair pour faire émerger une rencontre.' },{ icon: Check, title: 'Décidez ensemble', text: 'Personne ne décide à votre place du rythme ou de la suite.' }].map(item => { const Icon = item.icon; return <article key={item.title} className='rounded-2xl border border-white/10 bg-[#190d16]/35 p-5'><Icon className='h-6 w-6 text-[#f6e4bc]' /><h3 className='mt-5 text-lg font-bold'>{item.title}</h3><p className='mt-2 text-sm leading-6 text-white/65'>{item.text}</p></article> })}</div></div>
      </section>
    </div>
  )
}
