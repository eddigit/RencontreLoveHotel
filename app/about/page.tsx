'use client'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'

export default function AboutPage () {
  const { user } = useAuth()
  return (
    <MainLayout user={user}>
      <div className='container max-w-screen-md mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-4'>À propos</h1>
        <p className='mb-4'>Bienvenue sur Joug !</p>
        <p className='mb-4'>
          Joug est une plateforme de rencontres moderne conçue pour
          favoriser des connexions authentiques et respectueuses. Notre mission
          est de créer un espace sécurisé et inclusif où chacun peut faire de
          nouvelles rencontres, partager des expériences et, peut-être, trouver
          l'amour.
        </p>
        <p className='mb-4'>
          Si vous avez des questions, suggestions ou souhaitez en savoir plus,
          n'hésitez pas à nous contacter.
        </p>
        <p className='text-muted-foreground text-sm'>
          &copy; {new Date().getFullYear()} Joug. Tous droits
          réservés.
        </p>
      </div>
    </MainLayout>
  )
}
