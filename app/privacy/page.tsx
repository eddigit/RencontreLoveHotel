import Link from 'next/link'
import MainLayout from '@/components/layout/main-layout'

export default function PrivacyPage() {
  return (
    <MainLayout>
      <main className='min-h-screen px-4 py-12'>
        <article className='mx-auto max-w-3xl space-y-6'>
          <div>
            <p className='text-sm font-semibold text-primary'>Love Hotel Rencontres</p>
            <h1 className='mt-2 text-3xl font-bold'>Politique de confidentialité</h1>
            <p className='mt-3 text-muted-foreground'>Dernière mise à jour : 11 juillet 2026</p>
          </div>

          <section className='space-y-3'>
            <h2 className='text-xl font-semibold'>Données traitées</h2>
            <p>Nous traitons les informations nécessaires à la création du compte, au profil, aux échanges, aux événements, à la modération et à la sécurité du service.</p>
          </section>
          <section className='space-y-3'>
            <h2 className='text-xl font-semibold'>Utilisation et confidentialité</h2>
            <p>Ces données servent uniquement au fonctionnement de Love Hotel Rencontres. Les contenus réservés aux membres ne sont pas publiés sur les pages publiques.</p>
          </section>
          <section className='space-y-3'>
            <h2 className='text-xl font-semibold'>Conservation et sécurité</h2>
            <p>Les données sont conservées pendant la durée nécessaire au service et à nos obligations légales. Des mesures d’accès restreint, de journalisation et de sauvegarde protègent les comptes.</p>
          </section>
          <section className='space-y-3'>
            <h2 className='text-xl font-semibold'>Vos droits</h2>
            <p>Vous pouvez demander l’accès, la rectification, l’effacement ou la limitation de vos données depuis votre compte ou en écrivant à <a className='text-primary underline' href='mailto:lovehotelaparis@gmail.com'>lovehotelaparis@gmail.com</a>.</p>
          </section>

          <Link href='/register' className='inline-flex text-sm font-semibold text-primary underline'>Retour à l’inscription</Link>
        </article>
      </main>
    </MainLayout>
  )
}
