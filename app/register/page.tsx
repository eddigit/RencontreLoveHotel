'use client'

import type React from 'react'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { registerUser } from '@/app/actions'
import MainLayout from '@/components/layout/main-layout'

export default function RegisterPage () {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    agreeTerms: false,
    activityEmailConsent: false
  })

  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Enregistrer l'utilisateur dans la base de données
      const result = await registerUser(
        formData.email,
        formData.password,
        formData.name,
        formData.activityEmailConsent
      )

      if (result.success) {
        const signInResult = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false
        })

        router.push(signInResult?.ok ? '/onboarding' : '/login')
      } else {
        setError(result.error || "L'inscription n'a pas pu être finalisée.")
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error)
      setError('Une erreur est survenue. Réessayez dans quelques instants.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <div className='min-h-screen flex flex-col'>
        <header className='py-4 border-b'>
          <div className='container flex items-center justify-between'>
            <Link href='/' className='flex items-center gap-2'>
              <ArrowLeft className='h-5 w-5' />
              <span className='text-sm font-medium'>Retour</span>
            </Link>
          </div>
        </header>

        <main className='flex-1 flex items-center justify-center p-4 py-6'>
          <div className='w-full max-w-md'>
            <Card>
              <CardHeader className='space-y-1'>
                <CardTitle className='text-2xl font-bold text-center'>
                  Créer un compte
                </CardTitle>
                <CardDescription className='text-center'>
                  Inscrivez-vous pour accéder à toutes les fonctionnalités
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='name'>Nom complet</Label>
                    <div className='relative'>
                      <User className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <Input
                        id='name'
                        name='name'
                        autoComplete='name'
                        placeholder='John Doe'
                        className='pl-10'
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email</Label>
                    <div className='relative'>
                      <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <Input
                        id='email'
                        name='email'
                        type='email'
                        autoComplete='email'
                        placeholder='exemple@email.com'
                        className='pl-10'
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='password'>Mot de passe</Label>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <Input
                        id='password'
                        name='password'
                        type={showPassword ? 'text' : 'password'}
                        autoComplete='new-password'
                        minLength={8}
                        placeholder='••••••••'
                        className='pl-10'
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type='button'
                        onClick={() => setShowPassword(!showPassword)}
                        className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground'
                      >
                        {showPassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className='text-xs text-muted-foreground'>8 caractères minimum.</p>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='terms'
                      name='agreeTerms'
                      checked={formData.agreeTerms}
                      onCheckedChange={checked =>
                        setFormData({
                          ...formData,
                          agreeTerms: checked as boolean
                        })
                      }
                    />
                    <label
                      htmlFor='terms'
                      className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                    >
                      J&apos;accepte les{' '}
                      <Link
                        href='/terms'
                        className='text-primary hover:underline'
                      >
                        conditions d&apos;utilisation
                      </Link>{' '}
                      et la{' '}
                      <Link
                        href='/privacy'
                        className='text-primary hover:underline'
                      >
                        politique de confidentialité
                      </Link>
                    </label>
                  </div>
                  <div className='flex items-start space-x-3 rounded-md border border-border/70 p-3'>
                    <Checkbox
                      id='activity-email-consent'
                      checked={formData.activityEmailConsent}
                      onCheckedChange={checked =>
                        setFormData({
                          ...formData,
                          activityEmailConsent: checked === true
                        })
                      }
                    />
                    <label
                      htmlFor='activity-email-consent'
                      className='space-y-1 text-sm leading-snug'
                    >
                      <span className='block font-medium'>
                        Recevoir par e-mail les nouveaux messages, matchs et événements
                      </span>
                      <span className='block text-xs text-muted-foreground'>
                        Facultatif. Vous pourrez choisir chaque catégorie ou désactiver ces e-mails à tout moment.
                      </span>
                    </label>
                  </div>
                  <Button
                    type='submit'
                    className='w-full h-11'
                    disabled={!formData.agreeTerms || isSubmitting}
                  >
                    {isSubmitting ? 'Création du compte...' : "S'inscrire"}
                  </Button>
                  {error && (
                    <p role='alert' className='text-sm text-destructive text-center'>
                      {error}
                    </p>
                  )}
                </form>

                <div className='relative my-6'>
                  <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t'></div>
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-background px-2 text-muted-foreground'>
                      Ou continuer avec
                    </span>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4'>
                  <Button
                    variant='outline'
                    className='w-full h-11'
                    onClick={() =>
                      signIn('google', { callbackUrl: '/onboarding' })
                    }
                  >
                    <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
                      <path
                        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                        fill='#4285F4'
                      />
                      <path
                        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                        fill='#34A853'
                      />
                      <path
                        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                        fill='#FBBC05'
                      />
                      <path
                        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                        fill='#EA4335'
                      />
                    </svg>
                    Google
                  </Button>
                </div>
              </CardContent>
              <CardFooter className='flex flex-col space-y-2'>
                <div className='text-center text-sm text-muted-foreground'>
                  Vous avez déjà un compte?{' '}
                  <Link href='/login' className='text-primary hover:underline'>
                    Connectez-vous
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </MainLayout>
  )
}
