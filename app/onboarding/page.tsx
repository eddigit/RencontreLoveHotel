'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  OnboardingForm,
  type OnboardingData
} from '@/components/onboarding-form'
import { useAuth } from '@/contexts/auth-context'
import { saveUserPreferences } from '@/app/actions'
import { toast } from '@/components/ui/use-toast'
import MainLayout from '@/components/layout/main-layout'

export default function OnboardingPage () {
  const { user, isLoading, completeOnboarding } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!isLoading && user && user.email_verified === false) {
      router.push(
        '/verify-email-pending?email=' + encodeURIComponent(user.email)
      )
    }
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      setIsSubmitting(true)

      if (!user?.id) throw new Error('Session utilisateur indisponible.')
      const result = await saveUserPreferences(user.id, data)
      if (!result.success) throw new Error(result.error || "Impossible d'enregistrer les préférences.")
      await completeOnboarding()

      toast({
        title: 'Profil complété avec succès !',
        description: 'Vos préférences ont été enregistrées.',
        variant: 'default'
      })

      router.refresh()
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des préférences:", error)
      toast({
        title: 'Une erreur est survenue',
        description:
          "Impossible d'enregistrer vos préférences. Veuillez réessayer.",
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]'>
          <div className='animate-pulse text-white text-center'>
            <div className='h-8 w-32 bg-purple-800/50 rounded-md mx-auto mb-4'></div>
            <div className='h-4 w-48 bg-purple-800/30 rounded-md mx-auto'></div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className='min-h-screen flex flex-col bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]'>
        <div className='container py-8 md:py-12 flex-1 flex flex-col items-center justify-center'>
          <div className='w-full max-w-lg mb-6 text-center'>
            <h1 className='text-2xl md:text-3xl font-bold text-white mb-2'>
              Bienvenue sur Love Hôtel Rencontre
            </h1>
            <p className='text-purple-200/80'>
              Complétez votre profil pour trouver des personnes qui vous
              correspondent
            </p>
          </div>

          <OnboardingForm onComplete={handleOnboardingComplete} />
        </div>
      </div>
    </MainLayout>
  )
}
