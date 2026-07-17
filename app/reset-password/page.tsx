'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { AuthPageShell } from '@/components/auth-page-shell'

function ResetPasswordForm () {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const tokenFromQuery = searchParams.get('token')
    if (tokenFromQuery) {
      setToken(tokenFromQuery)
    } else {
      setError('Token de réinitialisation manquant ou invalide.')
      // Optionally redirect or show a more prominent error
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas.',
        variant: 'destructive'
      })
      return
    }
    if (!token) {
      toast({
        title: 'Erreur',
        description: 'Token de réinitialisation invalide ou manquant.',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/account/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Succès',
          description:
            'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
          variant: 'default'
        })
        setMessage(
          'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
        )
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        toast({
          title: 'Erreur',
          description:
            data.message ||
            'Impossible de réinitialiser le mot de passe. Veuillez réessayer.',
          variant: 'destructive'
        })
        setError(
          data.message ||
            'Impossible de réinitialiser le mot de passe. Veuillez réessayer.'
        )
      }
    } catch (err) {
      toast({
        title: 'Erreur',
        description: "Une erreur s'est produite. Veuillez réessayer.",
        variant: 'destructive'
      })
      setError("Une erreur s'est produite. Veuillez réessayer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (error && !token) {
    // If token was invalid from the start
    return (
        <Card className='w-full border-white/10 bg-[#130d18]/92 shadow-2xl shadow-black/35 backdrop-blur-xl'>
          <CardHeader>
            <CardTitle className='text-center text-2xl font-bold'>
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-center text-red-500'>{error}</p>
            <Button
              onClick={() => router.push('/login')}
              className='w-full mt-4'
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
    )
  }

  if (message) {
    // If password reset was successful
    return (
        <Card className='w-full border-white/10 bg-[#130d18]/92 shadow-2xl shadow-black/35 backdrop-blur-xl'>
          <CardHeader>
            <CardTitle className='text-center text-2xl font-bold'>
              Succès
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-center text-green-500'>{message}</p>
            <Button
              onClick={() => router.push('/login')}
              className='w-full mt-4'
            >
              Se connecter
            </Button>
          </CardContent>
        </Card>
    )
  }

  return (
      <Card className='w-full border-white/10 bg-[#130d18]/92 shadow-2xl shadow-black/35 backdrop-blur-xl'>
        <CardHeader>
          <CardTitle className='text-center text-2xl font-bold'>
            Réinitialiser le mot de passe
          </CardTitle>
          <CardDescription className='text-center'>
            Entrez votre nouveau mot de passe ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='password'>Nouveau mot de passe</Label>
                <Input
                  id='password'
                  type='password'
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>
                  Confirmer le mot de passe
                </Label>
                <Input
                  id='confirmPassword'
                  type='password'
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className='text-sm text-red-500'>{error}</p>}
              <Button
                type='submit'
                className='w-full h-11'
                disabled={isSubmitting || !password || !confirmPassword}
              >
                {isSubmitting
                  ? 'Réinitialisation en cours...'
                  : 'Réinitialiser le mot de passe'}
              </Button>
            </form>
          ) : (
            <p className='text-center'>Chargement du token...</p> // Or a spinner component
          )}
        </CardContent>
      </Card>
  )
}

export default function ResetPasswordPage () {
  return (
    <AuthPageShell backHref='/login' backLabel='Connexion'>
      <Suspense fallback={<div className='text-center text-white/70'>Chargement...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageShell>
  )
}
