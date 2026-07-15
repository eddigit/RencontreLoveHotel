'use client'

import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'

export default function TermsPage () {
  const { user } = useAuth()
  return (
    <MainLayout user={user}>
      <div className='min-h-screen flex flex-col items-center justify-center py-12 px-4'>
        <h1 className='text-3xl md:text-5xl font-bold text-white mb-8 text-center'>
          Conditions d&apos;utilisation
        </h1>
        <div className='w-full max-w-3xl shadow-lg p-6 md:p-10 prose prose-pink prose-lg'>
          <h2 className='text-2xl font-bold mb-4'>
            Conditions Générales d’Utilisation (CGU) – Love Hôtel rencontre
          </h2>
          <h3 className='text-2xl my-1'>Mentions juridiques</h3>
          <ul className='pb-4'>
            <li><b>Éditeur</b> : SARL L’HORA, RCS 902 899 723</li>
            <li><b>Adresse</b> : 88 rue Saint-Denis, 75001 Paris</li>
            <li>
              <b>Site de référence</b> :{' '}
              <a href='https://lovehotelaparis.fr' target='_blank' rel='noopener noreferrer'>
                lovehotelaparis.fr
              </a>
            </li>
            <li>
              <b>Contact juridique</b> :{' '}
              <a href='mailto:lovehotelaparis@gmail.com'>lovehotelaparis@gmail.com</a>
            </li>
            <li>Directrice de la publication : Aïna M.</li>
          </ul>
          <h3 className='text-2xl my-1'>1. Définitions</h3>
          <ul className='pb-4'>
            <li>
              <b>Application</b> : Love Hôtel rencontre, plateforme de rencontre
              en ligne.
            </li>
            <li>
              <b>Utilisateur</b> : toute personne physique majeure inscrite et
              ayant accepté les présentes CGU.
            </li>
            <li>
              <b>Service</b> : ensemble des fonctionnalités proposées par
              l’application.
            </li>
            <li>
              <b>Éditeur</b> : SARL L’HORA, société responsable de
              l’exploitation de l’Application.
            </li>
            <li>
              <b>CGU</b> : présentes conditions générales d’utilisation.
            </li>
          </ul>
          <h3 className='text-2xl my-1'>2. Description du service</h3>
          <p className='pb-4'>
            Love Hôtel rencontre est une application hybride et responsive
            permettant à ses utilisateurs de se connecter, discuter et organiser
            des rencontres à caractère social ou personnel. Elle est développée
            par{' '}
            <b>
              <a href='http://eddigit.com/'>eddigit.com</a>
            </b>
            , 102 avenue des Champs-Élysées, Paris 75008, et exploitée par{' '}
            <b>SARL L’HORA</b>, RCS 902 899 723.
          </p>
          <h3 className='text-2xl my-1'>3. Services gratuits et payants</h3>
          <p className='pb-4'>
            L’inscription est gratuite. Certaines fonctionnalités avancées (mise
            en avant de profil, filtres avancés, crédits de message) peuvent
            être payantes. Le paiement est sécurisé et traité via des
            prestataires conformes au RGPD. Aucun terme relatif à l’activité
            n’apparaît sur les relevés bancaires.
          </p>
          <h3 className='text-2xl my-1'>4. Inscription et accès</h3>
          <p className='pb-4'>
            L’inscription est réservée aux personnes majeures (18+).
            L’utilisateur s’engage à fournir des informations exactes. Une
            vérification de l’âge peut être requise. Un seul compte est autorisé
            par personne.
          </p>
          <h3 className='text-2xl my-1'>5. Obligations de l’utilisateur</h3>
          <p>L’utilisateur s’engage à :</p>
          <ul className='pb-4'>
            <li>Respecter les autres utilisateurs et les lois en vigueur</li>
            <li>
              Ne publier aucun contenu haineux, illégal, ou à caractère
              pornographique
            </li>
            <li>
              Ne pas utiliser l’application à des fins commerciales sans
              autorisation
            </li>
          </ul>
          <h3 className='text-2xl my-1'>6. Modération et signalement</h3>
          <p className='pb-4'>
            Les comptes peuvent être suspendus ou supprimés en cas de
            non-respect des CGU. Un bouton de signalement permet d’alerter les
            modérateurs en cas d’abus ou de comportements inappropriés. Toute
            sollicitation sexuelle rémunérée, ou proposée contre un cadeau,
            un service, un hébergement ou un autre avantage, est formellement
            interdite. Les tarifs officiels des chambres, événements et services
            LHR ne constituent pas une rémunération entre membres.
          </p>
          <p className='pb-4'>
            Des outils automatisés proportionnés peuvent produire une alerte,
            mais aucune sanction permanente ne repose uniquement sur un mot-clé
            ou une décision automatisée. Les personnes habilitées accèdent aux
            seuls éléments nécessaires. Toute décision grave est motivée et peut
            faire l’objet d’un réexamen humain. Voir la{' '}
            <a href='/community-safety'>charte de sécurité communautaire</a>.
          </p>
          <h3 className='text-2xl my-1'>
            7. Protection des données personnelles
          </h3>
          <p className='pb-4'>
            Les données sont traitées par SARL L’HORA conformément au RGPD.
            L’application est hébergée sur Ionos/Cloudflare, développée avec{' '}
            <b>Next.js</b>, et protège les données par chiffrement,
            journalisation et pare-feu. L’utilisateur peut exercer ses droits à
            :{' '}
            <a href='mailto:lovehotelaparis@gmail.com'>
              lovehotelaparis@gmail.com
            </a>
          </p>
          <h3 className='text-2xl my-1'>8. Responsabilité</h3>
          <p className='pb-4'>
            Love Hôtel rencontre n’est pas responsable des contenus ou
            comportements des utilisateurs. L’utilisateur est seul responsable
            de ses actes. L’éditeur s’engage à maintenir l’accessibilité du
            service mais ne garantit pas l’absence de bugs.
          </p>
          <h3 className='text-2xl my-1'>9. Propriété intellectuelle</h3>
          <p className='pb-4'>
            Tous les contenus (design, textes, code, photos) sont la propriété
            exclusive de SARL L’HORA et ne peuvent être copiés sans autorisation
            écrite préalable.
          </p>
          <h3 className='text-2xl my-1'>
            10. Résiliation et suppression de compte
          </h3>
          <p className='pb-4'>
            L’utilisateur peut supprimer son compte à tout moment. L’éditeur
            peut résilier l’accès pour non-respect des CGU, fraude, ou
            comportement abusif.
          </p>
          <h3 className='text-2xl my-1'>11. Modification des CGU</h3>
          <p className='pb-4'>
            Les présentes CGU peuvent être modifiées à tout moment.
            L’utilisateur sera notifié via l’application ou par e-mail.
          </p>
          <h3 className='text-2xl my-1'>12. Droit applicable – litiges</h3>
          <p className='pb-4'>
            Les présentes CGU sont soumises au droit français. En cas de litige,
            une solution amiable sera privilégiée. À défaut, les juridictions de
            Paris seront compétentes.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}
