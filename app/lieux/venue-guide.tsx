'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  CalendarDays,
  Hotel,
  MapPin,
  Martini,
  ShieldCheck,
  Sparkles,
  Ticket,
  UsersRound,
  UtensilsCrossed
} from 'lucide-react'

type VenueCategory = {
  id: string
  label: string
  eyebrow: string
  title: string
  summary: string
  status: string
  confirmed: boolean
  cta: { label: string; href: string }
  addresses?: { label: string; address: string; mapsUrl: string }[]
  officialUrl?: string
  icon: typeof Hotel
}

const categories: VenueCategory[] = [
  {
    id: 'love-hotel',
    label: 'Love Hôtel',
    eyebrow: 'Lieu référencé',
    title: 'Love Hôtel Paris',
    summary: 'Deux adresses parisiennes pour réserver une chambre à l’heure. Consultez les photos et les équipements du lieu avant de choisir ensemble.',
    status: 'Créneaux et tarifs auprès du Love Hôtel.',
    confirmed: true,
    cta: { label: 'Découvrir les Love Rooms', href: '/love-rooms' },
    officialUrl: 'https://lovehotelaparis.fr',
    addresses: [
      {
        label: 'Châtelet',
        address: '88 rue Saint-Denis, 75001 Paris',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=88+rue+Saint-Denis+75001+Paris'
      },
      {
        label: 'Pigalle',
        address: '72 boulevard de Clichy, 75018 Paris',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=72+boulevard+de+Clichy+75018+Paris'
      }
    ],
    icon: Hotel
  },
  {
    id: 'love-rooms-privees',
    label: 'Love Rooms privées',
    eyebrow: 'Partenariats en préparation',
    title: 'Partenaires & Love Rooms privées',
    summary: 'Jacuzzi privatif, calme, discrétion : quels équipements vous feraient choisir une adresse indépendante ? Les membres peuvent proposer un lieu à l’équipe.',
    status: 'Sélection de Love Rooms indépendantes en préparation.',
    confirmed: false,
    cta: { label: 'Voir le parcours Love Rooms', href: '/love-rooms' },
    icon: MapPin
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    eyebrow: 'Sélection à venir',
    title: 'Dîner, verre & premiers rendez-vous',
    summary: 'Un comptoir pour un premier verre, une table tranquille si la conversation se prolonge. Nous préparons une sélection de restaurants pour ces premiers rendez-vous.',
    status: 'Premières tables partenaires à venir.',
    confirmed: false,
    cta: { label: 'Explorer les rencontres', href: '/rencontres' },
    icon: UtensilsCrossed
  },
  {
    id: 'clubs',
    label: 'Clubs',
    eyebrow: 'Sélection à venir',
    title: 'Clubs & soirées adultes',
    summary: 'Pour sortir à deux ou en groupe, le choix du club dépend de l’ambiance, du dress code et des conditions d’entrée. Ces informations accompagneront chaque adresse publiée.',
    status: 'Sélection de clubs en préparation.',
    confirmed: false,
    cta: { label: 'Consulter les événements', href: '/events' },
    icon: Martini
  },
  {
    id: 'espaces-bdsm',
    label: 'Espaces BDSM',
    eyebrow: 'Love Room à Châtelet',
    title: 'Chambres et espaces BDSM',
    summary: 'À Châtelet, le Love Hôtel présente son salon « 50 nuances de rouge ». Consultez sa fiche pour découvrir la chambre et ses équipements.',
    status: 'Le salon du Love Hôtel est référencé. Les espaces indépendants viendront compléter cette sélection.',
    confirmed: true,
    cta: { label: 'Voir le salon sur le site du Love Hôtel', href: 'https://lovehotelaparis.fr/room/le-salon-50-nuances-de-rouge/' },
    icon: ShieldCheck
  },
  {
    id: 'theatre-erotique',
    label: 'Théâtre participatif',
    eyebrow: 'Billetterie à annoncer',
    title: 'Théâtre érotique participatif',
    summary: 'Le billet donnera accès au spectacle. Vous pourrez rester dans le public ou répondre à une invitation à participer, selon les règles annoncées pour la représentation.',
    status: 'Dates et billetterie à annoncer.',
    confirmed: false,
    cta: { label: 'Voir les événements confirmés', href: '/events' },
    icon: Ticket
  }
]

export default function VenueGuide({ requestedCategory }: { requestedCategory?: string }) {
  const router = useRouter()
  const active = categories.find(category => category.id === requestedCategory) ?? categories[0]
  const ActiveIcon = active.icon

  function selectCategory(categoryId: string) {
    router.push(`/lieux?categorie=${categoryId}`, { scroll: false })
  }

  return (
    <div className='min-h-screen bg-[#120821] text-white'>
      <section className='relative isolate overflow-hidden border-b border-amber-200/10 bg-[radial-gradient(circle_at_12%_8%,rgba(245,158,11,0.22),transparent_27%),radial-gradient(circle_at_85%_18%,rgba(190,24,93,0.3),transparent_28%),linear-gradient(135deg,#19051e_0%,#35102c_52%,#13051e_100%)]'>
        <div className='absolute inset-y-0 right-0 hidden w-1/2 opacity-35 lg:block'>
          <Image src='/guide-love-rooms.webp' alt='' fill priority className='object-cover object-center mix-blend-screen' sizes='50vw' />
          <div className='absolute inset-0 bg-gradient-to-r from-[#2b0826] via-[#2b0826]/40 to-transparent' />
        </div>
        <div className='relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24'>
          <p className='inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-100'>
            <MapPin className='h-3.5 w-3.5' /> Guide d’adresses à Paris
          </p>
          <h1 className='mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight text-white sm:text-6xl'>
            Les lieux qui donnent envie de se rencontrer.
          </h1>
          <p className='mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg'>
            Retrouvez les Love Rooms de Pigalle et de Châtelet. Explorez aussi les prochaines sélections pour dîner, sortir en club ou assister à un spectacle entre adultes.
          </p>

        </div>
      </section>

      <div className='mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14'>
        <div className='max-w-2xl'>
          <p className='text-xs font-bold uppercase tracking-[0.2em] text-amber-300'>Explorer par envie</p>
          <h2 className='mt-2 text-2xl font-semibold sm:text-3xl'>Choisissez une catégorie</h2>
          
        </div>

        <label className='mt-7 block md:hidden'>
          <span className='sr-only'>Choisir une catégorie de lieux</span>
          <select value={active.id} onChange={event => selectCategory(event.target.value)} className='w-full rounded-xl border border-amber-200/25 bg-[#2b102d] px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-300'>
            {categories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
        </label>

        <nav className='mt-7 hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3' aria-label='Catégories de lieux'>
          {categories.map(category => {
            const Icon = category.icon
            const isActive = active.id === category.id
            return (
              <Link
                key={category.id}
                href={`/lieux?categorie=${category.id}`}
                scroll={false}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex min-h-28 items-start gap-4 rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  isActive
                    ? 'border-amber-200/50 bg-gradient-to-br from-amber-300/15 to-fuchsia-500/15 shadow-lg shadow-amber-950/20'
                    : 'border-white/10 bg-white/[0.035] hover:border-amber-200/25 hover:bg-white/[0.07]'
                }`}
              >
                <span className={`rounded-xl p-2.5 ${isActive ? 'bg-amber-200 text-[#35102c]' : 'bg-white/8 text-amber-200'}`}><Icon className='h-5 w-5' /></span>
                <span className='min-w-0'>
                  <span className='block text-sm font-bold text-white'>{category.label}</span>
                  <span className='mt-1 block text-xs leading-5 text-white/55'>{category.confirmed ? 'Référencé' : 'À confirmer'}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        <section id='venue-details' aria-label={active.label} className='mt-6 overflow-hidden rounded-3xl border border-amber-100/15 bg-[linear-gradient(135deg,rgba(102,28,70,0.82),rgba(29,8,40,0.96))] shadow-2xl shadow-black/20'>
          <div className='grid lg:grid-cols-[1.15fr_.85fr]'>
            <div className='p-6 sm:p-9'>
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${active.confirmed ? 'text-amber-200' : 'text-white/50'}`}>{active.eyebrow}</p>
              <div className='mt-4 flex items-start gap-4'>
                <span className='rounded-2xl bg-amber-200 p-3 text-[#35102c]'><ActiveIcon className='h-7 w-7' /></span>
                <div>
                  <h3 className='text-2xl font-semibold sm:text-3xl'>{active.title}</h3>
                  <p className='mt-3 max-w-xl text-sm leading-7 text-white/70 sm:text-base'>{active.summary}</p>
                </div>
              </div>
              <div className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${active.confirmed ? 'border-amber-200/25 bg-amber-200/10 text-amber-50' : 'border-white/10 bg-black/15 text-white/65'}`}>
                {active.status}
              </div>
              {active.addresses ? (
                <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                  {active.addresses.map(location => (
                    <a key={location.label} href={location.mapsUrl} target='_blank' rel='noopener noreferrer' className='rounded-2xl border border-white/12 bg-black/15 p-4 transition hover:border-amber-200/45 hover:bg-white/[0.06]'>
                      <span className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-amber-200'><MapPin className='h-3.5 w-3.5' /> {location.label}</span>
                      <span className='mt-2 block text-sm font-semibold text-white'>{location.address}</span>
                    </a>
                  ))}
                </div>
              ) : null}
              {active.officialUrl ? (
                <a href={active.officialUrl} target='_blank' rel='noopener noreferrer' className='mt-4 inline-flex items-center gap-2 text-sm font-bold text-amber-200 hover:text-amber-100'>
                  Site officiel du Love Hôtel <ArrowUpRight className='h-4 w-4' />
                </a>
              ) : null}
              <Link href={active.cta.href} className='mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-200 px-5 py-3 text-sm font-extrabold text-[#35102c] transition hover:bg-amber-100'>
                {active.cta.label}<ArrowUpRight className='h-4 w-4' />
              </Link>
            </div>
            <aside className='border-t border-white/10 bg-black/20 p-6 sm:p-9 lg:border-l lg:border-t-0'>
              <Sparkles className='h-6 w-6 text-amber-200' />
              <h3 className='mt-4 text-lg font-bold'>Préparer votre sortie</h3>
              <p className='mt-3 text-sm leading-6 text-white/60'>Découvrez les événements déjà publiés par Love Hotel Rencontre et retrouvez les détails de participation sur chaque fiche.</p>
              <Link href='/events' className='mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-200 hover:text-amber-100'>
                <CalendarDays className='h-4 w-4' /> Voir les événements publiés
              </Link>
              <Link href='/discover#boite-a-idees' className='mt-4 inline-flex items-center gap-2 text-sm font-bold text-fuchsia-200 hover:text-fuchsia-100'>
                <Sparkles className='h-4 w-4' /> Membre : suggérer une adresse
              </Link>
              <div className='mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-white/45'>
                <UsersRound className='mr-2 inline h-4 w-4 text-fuchsia-200' /> Réservé aux adultes. Le respect, le consentement et les règles propres à chaque lieu restent essentiels.
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  )
}
