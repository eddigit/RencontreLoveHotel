import MainLayout from '@/components/layout/main-layout'

export default function PrivacyPage () {
  return (
    <MainLayout>
      <main className='mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-white sm:px-6'>
        <h1 className='text-4xl font-black'>Politique de confidentialité</h1>
        <p className='mt-3 text-sm text-white/55'>Politique en vigueur — version du 15 juillet 2026.</p>
        <div className='mt-8 space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 leading-7 sm:p-9'>
          <section><h2 className='text-2xl font-bold'>Responsable</h2><p className='mt-2 text-white/70'>SARL L’HORA, RCS 902 899 723, 88 rue Saint-Denis, 75001 Paris. Droits : lovehotelaparis@gmail.com.</p></section>
          <section><h2 className='text-2xl font-bold'>Détection anti-sollicitation</h2><p className='mt-2 text-white/70'>LHR analyse localement des signaux contextuels au moment de l’envoi afin de prévenir les sollicitations sexuelles contre rémunération ou avantage. Aucun message n’est transmis à une intelligence artificielle externe. Un terme ambigu isolé ne suffit pas à une sanction et les décisions graves sont réexaminées humainement.</p></section>
          <section><h2 className='text-2xl font-bold'>Accès et destinataires</h2><p className='mt-2 text-white/70'>Seules les personnes nominativement habilitées accèdent au contenu strictement nécessaire d’un dossier. Les adhérents-modérateurs voient une identité pseudonymisée. Chaque consultation est journalisée.</p></section>
          <section><h2 className='text-2xl font-bold'>Conservation</h2><p className='mt-2 text-white/70'>Durées provisoires : 90 jours pour un dossier classé sans suite ou un avertissement simple ; 12 mois pour une restriction, une sanction ou un recours ; plus longtemps uniquement sous gel juridique documenté. Ces durées doivent être confirmées dans l’AIPD.</p></section>
          <section><h2 className='text-2xl font-bold'>Vos droits</h2><p className='mt-2 text-white/70'>Vous pouvez demander accès, rectification, effacement, limitation, opposition et portabilité selon les conditions applicables, ainsi qu’un réexamen humain d’une décision de modération.</p></section>
        </div>
      </main>
    </MainLayout>
  )
}
