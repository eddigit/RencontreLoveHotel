'use client'

import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'

const CONTACT = 'jougworld@gmail.com'

function Contact () {
  return <a className='underline' href={`mailto:${CONTACT}`}>{CONTACT}</a>
}

function Section ({ id, title, children }: { id?: string, title: string, children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className='text-2xl font-bold'>{title}</h2>
      <div className='mt-2 space-y-3 text-white/70'>{children}</div>
    </section>
  )
}

export default function TermsPage () {
  const { user } = useAuth()
  return (
    <MainLayout user={user}>
      <main className='mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-white sm:px-6'>
        <h1 className='text-4xl font-black'>CGU et règlement du cercle — Joug</h1>
        <p className='mt-3 text-sm text-white/55'>Version provisoire. Dernière mise à jour : 28 novembre 2026</p>
        <div className='mt-8 space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 leading-7 sm:p-9'>
          <Section title='1. Objet'>
            <p>
              Joug est un espace de rencontre et de mise en relation à caractère privé, édité par Joug
              Limited. L’inscription vaut acceptation pleine et entière des présentes. L’éditeur, le
              directeur de la publication et l’hébergeur figurent dans les{' '}
              <a className='underline' href='/mentions-legales'>mentions légales</a>.
            </p>
          </Section>
          <Section title='2. Admission'>
            <p>
              L’accès se fait sur invitation ou après acceptation d’une demande. L’admission est
              discrétionnaire et peut être refusée sans justification. Conditions : avoir 18 ans révolus,
              disposer d’une adresse e-mail valide, ne détenir qu’un seul compte.
            </p>
          </Section>
          <Section title='3. Compte'>
            <p>
              Vous êtes responsable de la confidentialité de vos identifiants et de l’activité de votre
              compte. Toute usurpation doit être signalée sans délai.
            </p>
          </Section>
          <Section title='4. Contenu publié'>
            <p>
              Vous garantissez détenir les droits sur les photos et textes que vous publiez, et que les
              personnes y figurant consentent à leur diffusion. Vous concédez à Joug une licence non
              exclusive, gratuite et mondiale d’hébergement, de reproduction et d’affichage, pour la durée
              de publication et pour les besoins techniques du service.
            </p>
          </Section>
          <Section title='5. Règles de conduite'>
            <ul className='list-disc space-y-1 pl-5'>
              <li>Photos vous représentant réellement, récentes, sans texte promotionnel incrusté.</li>
              <li>Pas de propos injurieux, racistes, sexistes ou homophobes.</li>
              <li>Pas de prospection commerciale, de parrainage non autorisé ni de spam.</li>
              <li>Pas d’usurpation d’identité, de faux profil ni de compte multiple.</li>
              <li>Pas de contenu illicite, ni de contenu à caractère sexuel explicite en photo de profil sauf indication contraire de Joug.</li>
              <li>
                Toute sollicitation sexuelle rémunérée, ou proposée contre un cadeau, un service, un
                hébergement ou un autre avantage, est formellement interdite. Voir la{' '}
                <a className='underline' href='/community-safety'>charte de sécurité communautaire</a>.
              </li>
            </ul>
          </Section>
          <Section title='6. Modération et sanctions'>
            <p>
              Joug peut, sans préavis selon la gravité : masquer un contenu, adresser un avertissement,
              suspendre ou exclure un compte. Les décisions sont motivées et peuvent faire l’objet d’un
              recours à <Contact />.
            </p>
            <p>
              Des outils automatisés proportionnés peuvent produire une alerte, mais aucune sanction
              permanente ne repose uniquement sur un mot-clé ou une décision automatisée.
            </p>
          </Section>
          <Section title='7. Propriété intellectuelle'>
            <p>
              La marque, la charte, la structure et la base de données du site sont protégées. Toute
              extraction ou réutilisation non autorisée est interdite.
            </p>
          </Section>
          <Section title='8. Gratuité et évolution'>
            <p>
              Le service est actuellement gratuit. Joug peut introduire des options payantes ; les
              conditions applicables seront alors publiées et soumises à acceptation avant tout engagement.
            </p>
          </Section>
          <Section title='9. Disponibilité et responsabilité'>
            <p>
              Le service est fourni en l’état, sans garantie de disponibilité continue ni de résultat :
              Joug ne garantit pas qu’une rencontre survienne. Joug n’est pas responsable du contenu publié
              par les membres ni du comportement de ceux-ci, y compris lors de rencontres physiques.
            </p>
          </Section>
          <Section title='10. Données personnelles'>
            <p>
              Le traitement est décrit dans la{' '}
              <a className='underline' href='/privacy'>politique de confidentialité</a>, qui fait partie
              intégrante des présentes.
            </p>
          </Section>
          <Section id='contact' title='11. Signalement'>
            <p>
              Tout contenu ou comportement illicite se signale à <Contact />, avec URL et motif. Joug
              accuse réception et informe le signalant de la suite donnée.
            </p>
          </Section>
          <Section title='12. Résiliation'>
            <p>
              Vous pouvez supprimer votre compte à tout moment depuis vos paramètres. La suppression
              entraîne l’effacement des données selon les durées indiquées dans la politique de
              confidentialité.
            </p>
          </Section>
          <Section title='13. Modification des CGU'>
            <p>
              Toute modification substantielle est notifiée 15 jours avant son entrée en vigueur. La
              poursuite de l’utilisation vaut acceptation.
            </p>
          </Section>
          <Section title='14. Droit applicable'>
            <p>
              Droit irlandais. Juridiction irlandaise, sous réserve des règles protectrices applicables aux
              consommateurs résidant dans l’Union européenne.
            </p>
          </Section>
        </div>
      </main>
    </MainLayout>
  )
}
