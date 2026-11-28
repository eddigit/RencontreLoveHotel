import type { Metadata } from 'next'
import Link from 'next/link'
import MainLayout from '@/components/layout/main-layout'

export const metadata: Metadata = { title: 'Mentions légales — Joug' }

const CONTACT = 'jougworld@gmail.com'

function Contact () {
  return <a className='underline' href={`mailto:${CONTACT}`}>{CONTACT}</a>
}

function Section ({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section>
      <h2 className='text-2xl font-bold'>{title}</h2>
      <div className='mt-2 space-y-3 text-white/70'>{children}</div>
    </section>
  )
}

export default function LegalNoticePage () {
  return (
    <MainLayout>
      <main className='mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-white sm:px-6'>
        <h1 className='text-4xl font-black'>Mentions légales — Joug</h1>
        <p className='mt-3 text-sm text-white/55'>
          Version provisoire. La société éditrice est en cours d’immatriculation. Le numéro
          d’enregistrement sera ajouté dès délivrance du certificat.
        </p>
        <p className='mt-1 text-sm text-white/55'>Dernière mise à jour : 28 novembre 2026</p>
        <div className='mt-8 space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 leading-7 sm:p-9'>
          <Section title='1. Éditeur du site'>
            <p>Le site Joug est édité par :</p>
            <p>
              Joug Limited<br />
              Société à responsabilité limitée de droit irlandais (private company limited by shares)<br />
              En cours d’immatriculation au Companies Registration Office (CRO), Dublin<br />
              Bureau enregistré : Unit 3D North Point House, North Point Business Park, New Mallow Road, Cork, T23 AT2P, Ireland<br />
              Contact : <Contact />
            </p>
          </Section>
          <Section title='2. Directeur de la publication'>
            <p>Oscar CARRERE<br />Contact : <Contact /></p>
          </Section>
          <Section title='3. Hébergeur'>
            <p>
              Vercel Inc.<br />
              440 N Barranca Avenue #4133, Covina, Californie 91723, États-Unis<br />
              Site : vercel.com
            </p>
            <p>
              Base de données : Neon, hébergée à Francfort (Allemagne). Nom de domaine : GoDaddy.com, LLC,
              2155 E. GoDaddy Way, Tempe, Arizona 85284, États-Unis.
            </p>
          </Section>
          <Section title='4. Objet du site'>
            <p>
              Joug est un espace de rencontre et de mise en relation à caractère privé, accessible sur
              invitation. L’accès et l’utilisation du site sont gratuits à ce jour.
            </p>
          </Section>
          <Section title='5. Propriété intellectuelle'>
            <p>
              La structure générale du site, les textes, les visuels, la charte graphique et les bases de
              données sont la propriété de l’éditeur ou font l’objet d’une licence. Toute reproduction ou
              représentation, totale ou partielle, sans autorisation écrite préalable est interdite.
            </p>
            <p>
              Les contenus publiés par les membres restent leur propriété ; ils concèdent à l’éditeur une
              licence non exclusive d’usage, de reproduction et d’affichage sur le site, pour la durée de
              leur publication.
            </p>
          </Section>
          <Section title='6. Données personnelles'>
            <p>
              Le traitement des données personnelles est décrit dans la{' '}
              <Link className='underline' href='/privacy'>politique de confidentialité</Link>, accessible
              depuis chaque page du site. Responsable de traitement : Joug Limited. Contact pour toute
              demande relative aux données personnelles : <Contact />.
            </p>
          </Section>
          <Section title='7. Cookies et traceurs'>
            <p>
              Les cookies utilisés sont détaillés dans la{' '}
              <Link className='underline' href='/privacy'>politique de confidentialité</Link>. Le site ne
              dépose à ce jour que des cookies strictement nécessaires.
            </p>
          </Section>
          <Section title='8. Point de contact — règlement sur les services numériques (DSA)'>
            <p>
              Point de contact unique pour les autorités, les professionnels et les membres : <Contact />.
              Langues acceptées : français, anglais.
            </p>
          </Section>
          <Section title='9. Signalement de contenu'>
            <p>
              Tout contenu illicite peut être signalé à <Contact />, en précisant l’URL concernée, la
              nature du contenu et le motif du signalement. Un accusé de réception est adressé dans les
              meilleurs délais.
            </p>
          </Section>
          <Section title='10. Litiges'>
            <p>
              Le site étant gratuit, les dispositions relatives à la vente à distance ne s’appliquent pas
              encore. Elles seront ajoutées aux présentes lors de l’introduction d’offres payantes, avec
              les mentions du médiateur de la consommation compétent.
            </p>
            <p>
              Le droit irlandais est applicable. Les tribunaux irlandais sont compétents, sous réserve des
              règles protectrices applicables aux consommateurs résidant dans l’Union européenne.
            </p>
          </Section>
        </div>
      </main>
    </MainLayout>
  )
}
