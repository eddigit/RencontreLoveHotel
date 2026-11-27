import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const questions = [
  {
    title: 'De quoi avez-vous envie ?',
    text: 'Une première conversation, un flirt en couple ou une rencontre libertine : votre profil et vos échanges permettent de dire ce qui vous attire et de poser vos limites.',
    href: '/rencontres',
    action: 'Découvrir la communauté'
  },
  {
    title: 'Où seriez-vous à l’aise ?',
    text: 'Une table pour faire connaissance, une salle de spectacle ou une chambre pour plus d’intimité. Le carnet distingue les adresses référencées des sélections encore en préparation.',
    href: '/lieux',
    action: 'Ouvrir le carnet des lieux'
  },
  {
    title: 'Qu’avez-vous convenu ensemble ?',
    text: 'Accepter une invitation ou partager le prix d’une chambre ne crée aucune obligation intime. Chaque personne garde la liberté de changer d’avis à tout moment.',
    href: '/community-safety',
    action: 'Lire la charte'
  }
]

export default function ConceptPage() {
  return (
    <article className='min-h-screen bg-[#21151d] px-5 py-12 text-[#f8f1eb] sm:px-10 lg:py-20'>
      <div className='mx-auto max-w-5xl'>
        <h1 className='max-w-3xl font-serif text-5xl leading-[1.04] sm:text-7xl'>Une rencontre que vous choisissez ensemble.</h1>
        <p className='mt-6 max-w-2xl text-lg leading-8 text-white/75'>Love Hotel Rencontre réunit des adultes qui souhaitent explorer le libertinage, en solo ou en couple. Le premier rendez-vous prend la forme qui vous convient.</p>
        <div className='mt-14 divide-y divide-white/15 border-y border-white/15'>
          {questions.map(question => (
            <section key={question.href} className='grid gap-4 py-8 sm:grid-cols-2 sm:gap-12'>
              <h2 className='font-serif text-3xl'>{question.title}</h2>
              <div>
                <p className='leading-7 text-white/75'>{question.text}</p>
                <Link href={question.href} className='mt-4 inline-flex items-center gap-2 font-semibold text-[#ffd29f] underline-offset-4 hover:underline'>{question.action}<ArrowUpRight size={16} aria-hidden='true' /></Link>
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}
