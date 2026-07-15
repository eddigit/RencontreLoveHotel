import Link from 'next/link'
import MainLayout from '@/components/layout/main-layout'

export default function CommunitySafetyPage () {
  return (
    <MainLayout>
      <main className='mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-white sm:px-6'>
        <p className='text-xs font-black uppercase tracking-[0.24em] text-[#ff8cc8]'>
          Communauté adulte · liberté · consentement
        </p>
        <h1 className='mt-4 text-4xl font-black'>Charte de sécurité communautaire</h1>
        <div className='mt-8 space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 leading-7 sm:p-9'>
          <section>
            <h2 className='text-2xl font-bold'>Aucune prestation sexuelle rémunérée</h2>
            <p className='mt-3 text-white/72'>
              LHR est une communauté de rencontres entre adultes, pas une place de marché de services sexuels.
              Il est interdit de proposer, demander, promouvoir ou négocier un acte ou un rendez-vous sexuel
              contre argent, cadeau, hébergement, transport, service ou avantage quelconque.
            </p>
          </section>
          <section>
            <h2 className='text-2xl font-bold'>Des services officiels clairement séparés</h2>
            <p className='mt-3 text-white/72'>
              Les tarifs officiels des événements, Love Rooms et services de conciergerie rémunèrent uniquement
              les prestations annoncées par LHR ou le Love Hôtel. Ils ne rémunèrent jamais la présence, le consentement
              ou les actes d’un autre membre.
            </p>
          </section>
          <section>
            <h2 className='text-2xl font-bold'>Une modération proportionnée</h2>
            <p className='mt-3 text-white/72'>
              Des signaux automatisés peuvent créer une alerte confidentielle. Aucun bannissement permanent ne repose
              uniquement sur un mot-clé ou une décision automatisée. Les adhérents-modérateurs habilités accèdent au seul
              contenu nécessaire, et toute mesure grave bénéficie d’un réexamen humain et d’une possibilité de recours.
            </p>
          </section>
          <section>
            <h2 className='text-2xl font-bold'>Signaler et protéger</h2>
            <p className='mt-3 text-white/72'>
              Chaque membre peut bloquer immédiatement un compte et signaler une sollicitation. LHR peut préserver les
              éléments strictement nécessaires et les transmettre aux autorités compétentes lorsque la loi l’exige ou
              l’autorise. Aucun partenariat institutionnel n’est revendiqué sans convention réelle.
            </p>
          </section>
          <p className='rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50'>
            Projet de charte au 15 juillet 2026 — validation juridique par un professionnel du droit ou un DPO requise
            avant publication définitive.
          </p>
        </div>
        <div className='mt-8 flex flex-wrap gap-3'>
          <Link href='/register' className='rounded-full bg-[#ff3b8b] px-6 py-3 font-bold'>Rejoindre la communauté</Link>
          <Link href='/terms' className='rounded-full border border-white/15 px-6 py-3 font-bold'>Lire les CGU</Link>
        </div>
      </main>
    </MainLayout>
  )
}
