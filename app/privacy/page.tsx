import MainLayout from '@/components/layout/main-layout'

export default function PrivacyPage () {
  return (
    <MainLayout>
      <main className='mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-white sm:px-6'>
        <h1 className='text-4xl font-black'>Politique de confidentialité</h1>
        <p className='mt-3 text-sm text-white/55'>Politique mise à jour le 28 novembre 2026.</p>
        <div className='mt-8 space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 leading-7 sm:p-9'>
          <section><h2 className='text-2xl font-bold'>Responsable</h2><p className='mt-2 text-white/70'>SARL L’HORA, RCS 902 899 723, 88 rue Saint-Denis, 75001 Paris. Droits : lovehotelaparis@gmail.com.</p></section>
          <section><h2 className='text-2xl font-bold'>Détection anti-sollicitation</h2><p className='mt-2 text-white/70'>LHR analyse localement des signaux contextuels au moment de l’envoi afin de prévenir les sollicitations sexuelles contre rémunération ou avantage. Aucun message n’est transmis à une intelligence artificielle externe. Un terme ambigu isolé ne suffit pas à une sanction et les décisions graves sont réexaminées humainement.</p></section>
          <section>
            <h2 className='text-2xl font-bold'>Photos et vidéos de galerie</h2>
            <p className='mt-2 text-white/70'>Pour chaque nouvelle photo ou vidéo, vous choisissez qui peut la voir. Vous pouvez aussi publier sur le mur un média que vous rendez visible aux membres. Les membres autorisés à consulter votre profil peuvent ouvrir les médias de la galerie membres. Pour ouvrir votre album privé, chaque personne doit obtenir votre accord. Son accès dure une heure à compter de votre accord et vous pouvez le retirer plus tôt. Il est interdit de copier les photos ou d’en prendre une capture. Un appareil peut toutefois conserver une image affichée à l’écran.</p>
          </section>
          <section><h2 className='text-2xl font-bold'>Vérification volontaire du profil</h2><p className='mt-2 text-white/70'>Si vous demandez la vérification de votre profil, votre photo avec le pseudo manuscrit est transmise à l’administration pour examen. Elle est séparée de la galerie et supprimée du dossier à la décision. Les autres membres voient uniquement le badge lorsque votre demande est approuvée.</p></section>
          <section><h2 className='text-2xl font-bold'>Mots après rencontre</h2><p className='mt-2 text-white/70'>Un mot envoyé à un autre membre reste en attente de son accord. Après confirmation, les membres qui consultent sa fiche peuvent y lire le texte et le pseudo de son auteur. Chacun des deux membres peut retirer le mot.</p></section>
          <section><h2 className='text-2xl font-bold'>Visites de votre profil</h2><p className='mt-2 text-white/70'>Quand un membre connecté ouvre votre fiche, vous pouvez retrouver son profil dans votre accueil pendant 30 jours après sa dernière visite. Plusieurs visites du même membre donnent une seule entrée. Les profils masqués ou bloqués sont exclus de cette liste.</p></section>
          <section><h2 className='text-2xl font-bold'>Mesure d’audience</h2><p className='mt-2 text-white/70'>Lorsque Web Analytics Vercel est activé, LHR mesure des visites de manière agrégée et sans cookies. Seules des catégories de pages publiques ou une catégorie générique pour l’espace membre sont transmises ; les paramètres, fragments, identifiants, pages d’administration et de modération sont exclus.</p></section>
          <section><h2 className='text-2xl font-bold'>Accès et destinataires</h2><p className='mt-2 text-white/70'>Seules les personnes nominativement habilitées accèdent au contenu strictement nécessaire d’un dossier. Les adhérents-modérateurs voient une identité pseudonymisée. Chaque consultation est journalisée.</p></section>
          <section><h2 className='text-2xl font-bold'>Conservation</h2><p className='mt-2 text-white/70'>Durées provisoires : 90 jours pour un dossier classé sans suite ou un avertissement simple ; 12 mois pour une restriction, une sanction ou un recours ; plus longtemps uniquement sous gel juridique documenté. Ces durées doivent être confirmées dans l’AIPD.</p></section>
          <section><h2 className='text-2xl font-bold'>Vos droits</h2><p className='mt-2 text-white/70'>Vous pouvez demander accès, rectification, effacement, limitation, opposition et portabilité selon les conditions applicables, ainsi qu’un réexamen humain d’une décision de modération.</p></section>
        </div>
      </main>
    </MainLayout>
  )
}
