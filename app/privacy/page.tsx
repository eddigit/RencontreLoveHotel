import MainLayout from '@/components/layout/main-layout'

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

function Table ({ head, rows }: { head: [string, string], rows: Array<[string, string]> }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-left text-sm'>
        <thead>
          <tr className='border-b border-white/15 text-white'>
            <th className='py-2 pr-4 font-bold'>{head[0]}</th>
            <th className='py-2 font-bold'>{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className='border-b border-white/10 align-top'>
              <td className='py-2 pr-4 text-white'>{label}</td>
              <td className='py-2'>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PrivacyPage () {
  return (
    <MainLayout>
      <main className='mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-white sm:px-6'>
        <h1 className='text-4xl font-black'>Politique de confidentialité — Joug</h1>
        <p className='mt-3 text-sm text-white/55'>
          Version provisoire. Responsable de traitement en cours d’immatriculation. Dernière mise à jour : 28 novembre 2026
        </p>
        <div className='mt-8 space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 leading-7 sm:p-9'>
          <Section title='1. Qui traite vos données'>
            <p>
              Joug Limited, société irlandaise en cours d’immatriculation, bureau enregistré Unit 3D North
              Point House, North Point Business Park, New Mallow Road, Cork, T23 AT2P, Ireland.
            </p>
            <p>Contact pour toute question ou demande : <Contact />.</p>
          </Section>
          <Section title='2. Données collectées'>
            <Table
              head={['Catégorie', 'Détail']}
              rows={[
                ['Identification', 'Pseudo, adresse e-mail, mot de passe (stocké haché)'],
                ['Profil', 'Date de naissance, genre, préférences de rencontre, ville ou zone géographique approximative'],
                ['Contenu', 'Photos, textes de présentation, messages échangés, signalements'],
                ['Technique', 'Adresse IP, type d’appareil et de navigateur, journaux de connexion']
              ]}
            />
            <p>Aucune donnée bancaire n’est collectée à ce jour, le site étant gratuit.</p>
            <p>
              Point particulier : les préférences de rencontre et l’orientation relèvent de la vie sexuelle
              au sens de l’article 9 du RGPD. Elles sont traitées sur la base de votre consentement
              explicite, recueilli à la création du profil.
            </p>
          </Section>
          <Section title='3. Pourquoi ces données sont traitées'>
            <ul className='list-disc space-y-1 pl-5'>
              <li>Créer et gérer votre compte, vous permettre d’être découvert et de contacter d’autres membres : exécution des CGU.</li>
              <li>Afficher vos préférences et votre orientation : consentement explicite.</li>
              <li>Sécurité, prévention des faux comptes et du spam, modération : intérêt légitime.</li>
              <li>Mesure d’audience agrégée et sans cookies : intérêt légitime. Tout cookie non essentiel serait soumis à votre consentement, révocable à tout moment.</li>
              <li>Informations par e-mail sur le service : intérêt légitime, désinscription en un clic.</li>
            </ul>
            <p>Aucune donnée n’est vendue.</p>
          </Section>
          <Section title='4. Durées de conservation'>
            <Table
              head={['Donnée', 'Durée']}
              rows={[
                ['Compte et profil', 'Tant que le compte est actif'],
                ['Compte inactif', '12 mois sans connexion, après e-mail d’avertissement, puis suppression'],
                ['Messages', 'Supprimés avec le compte'],
                ['Journaux techniques', '12 mois'],
                ['Preuves de consentement', '5 ans à compter du retrait']
              ]}
            />
          </Section>
          <Section title='5. Qui a accès'>
            <ul className='list-disc space-y-1 pl-5'>
              <li>Vercel Inc. (États-Unis) : hébergement du site, stockage des photos et vidéos, mesure d’audience agrégée et sans cookies.</li>
              <li>Neon (base de données hébergée à Francfort, Allemagne) : comptes, profils et messages.</li>
              <li>Brevo (France) : envoi des e-mails du service.</li>
              <li>Cloudflare (États-Unis) : résolution du nom de domaine.</li>
              <li>GoDaddy.com, LLC (États-Unis) : enregistrement du nom de domaine.</li>
              <li>Google (Gmail) : messagerie de contact.</li>
              <li>Google ou Facebook, uniquement si vous choisissez de vous connecter par leur intermédiaire.</li>
              <li>Tout nouveau prestataire est listé ici avant activation.</li>
            </ul>
            <p>Les membres voient ce que vous publiez sur votre profil. Votre adresse e-mail n’est jamais publique.</p>
          </Section>
          <Section title='6. Transferts hors Union européenne'>
            <p>
              La base de données est hébergée en Allemagne. L’hébergement du site et la messagerie de
              contact sont assurés par des prestataires établis aux États-Unis. Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou,
              le cas échéant, par la décision d’adéquation applicable. Une copie des garanties peut être
              obtenue à <Contact />.
            </p>
          </Section>
          <Section title='7. Vos droits'>
            <p>
              Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition
              et de portabilité, ainsi que du droit de retirer votre consentement à tout moment. Écrivez à{' '}
              <Contact /> ; réponse sous un mois.
            </p>
            <p>
              Vous pouvez saisir la Data Protection Commission irlandaise (21 Fitzwilliam Square South,
              Dublin 2, D02 RD28, Irlande) ou, si vous résidez en France, la CNIL (3 place de Fontenoy, TSA
              80715, 75334 Paris Cedex 07).
            </p>
          </Section>
          <Section title='8. Mineurs'>
            <p>
              Le service est réservé aux personnes de 18 ans révolus. L’âge est déclaré à l’inscription ;
              tout compte dont l’âge s’avère inférieur est suspendu.
            </p>
          </Section>
          <Section title='9. Sécurité'>
            <p>
              Mots de passe hachés, connexions chiffrées (HTTPS), accès administrateur restreint,
              sauvegardes régulières. En cas de violation de données susceptible d’engendrer un risque
              élevé, vous êtes informé et la DPC est notifiée sous 72 heures.
            </p>
          </Section>
          <Section title='10. Cookies'>
            <p>
              Seuls des cookies strictement nécessaires (session, sécurité) sont posés sans consentement.
              La mesure d’audience fonctionne sans cookie. Aucun cookie de mesure d’audience ou de réseau
              social n’est déposé à ce jour ; s’il en était ajouté, il serait soumis à votre accord
              préalable et ce document serait mis à jour.
            </p>
          </Section>
          <Section title='11. Modifications'>
            <p>
              Toute évolution substantielle est notifiée par e-mail ou bandeau, avec la date de mise à jour
              en tête du présent document.
            </p>
          </Section>
          <Section title='12. Précisions par fonctionnalité'>
            <p><b className='text-white'>Détection anti-sollicitation.</b> Joug analyse localement des signaux contextuels au moment de l’envoi afin de prévenir les sollicitations sexuelles contre rémunération ou avantage. Aucun message n’est transmis à une intelligence artificielle externe. Un terme ambigu isolé ne suffit pas à une sanction et les décisions graves sont réexaminées humainement.</p>
            <p><b className='text-white'>Photos et vidéos de galerie.</b> Pour chaque nouvelle photo ou vidéo, vous choisissez qui peut la voir. Vous pouvez aussi publier sur le mur un média que vous rendez visible aux membres. Les membres autorisés à consulter votre profil peuvent ouvrir les médias de la galerie membres. Pour ouvrir votre album privé, chaque personne doit obtenir votre accord. Son accès dure une heure à compter de votre accord et vous pouvez le retirer plus tôt. Il est interdit de copier les photos ou d’en prendre une capture. Un appareil peut toutefois conserver une image affichée à l’écran.</p>
            <p><b className='text-white'>Vérification volontaire du profil.</b> Si vous demandez la vérification de votre profil, votre photo avec le pseudo manuscrit est transmise à l’administration pour examen. Elle est séparée de la galerie et supprimée du dossier à la décision. Les autres membres voient uniquement le badge lorsque votre demande est approuvée.</p>
            <p><b className='text-white'>Mots après rencontre.</b> Un mot envoyé à un autre membre reste en attente de son accord. Après confirmation, les membres qui consultent sa fiche peuvent y lire le texte et le pseudo de son auteur. Chacun des deux membres peut retirer le mot.</p>
            <p><b className='text-white'>Visites de votre profil.</b> Quand un membre connecté ouvre votre fiche, vous pouvez retrouver son profil dans votre accueil pendant 30 jours après sa dernière visite. Plusieurs visites du même membre donnent une seule entrée. Les profils masqués ou bloqués sont exclus de cette liste.</p>
            <p><b className='text-white'>Dossiers de modération.</b> Seules les personnes nominativement habilitées accèdent au contenu strictement nécessaire d’un dossier. Les adhérents-modérateurs voient une identité pseudonymisée. Chaque consultation est journalisée. Durées provisoires : 90 jours pour un dossier classé sans suite ou un avertissement simple ; 12 mois pour une restriction, une sanction ou un recours ; plus longtemps uniquement sous gel juridique documenté.</p>
          </Section>
        </div>
      </main>
    </MainLayout>
  )
}
