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
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { signIn } from 'next-auth/react'
import MainLayout from '@/components/layout/main-layout'

export default function LoginPage (props: any) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })
      if (result && result.ok) {
        toast({
          title: 'Connexion réussie',
          description: 'Bienvenue !',
          variant: 'default'
        })
        // Attendre un peu pour que la session soit mise à jour
        setTimeout(() => {
          router.push('/discover')
        }, 100)
      } else {
        toast({
          title: 'Erreur de connexion',
          description: 'Email ou mot de passe incorrect.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Une erreur s'est produite lors de la connexion",
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <div className='min-h-screen flex flex-col'>
        <header className='py-4 border-b'>
          <div className='container flex items-center'>
            <Link href='/' className='flex items-center gap-2'>
              <ArrowLeft className='h-5 w-5' />
              <span className='text-sm font-medium'>Retour</span>
            </Link>
          </div>
        </header>

        <main className='flex-1 flex items-center justify-center p-4'>
          <div className='w-full max-w-md'>
            <Card>
              <CardHeader className='space-y-1'>
                <CardTitle className='text-2xl font-bold text-center'>
                  Connexion
                </CardTitle>
                <CardDescription className='text-center'>
                  Entrez vos identifiants pour accéder à votre compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email</Label>
                    <div className='relative'>
                      <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <Input
                        id='email'
                        type='email'
                        placeholder='exemple@email.com'
                        className='pl-10'
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <Label htmlFor='password'>Mot de passe</Label>
                      <Link
                        href='/forgot-password'
                        className='text-xs text-primary hover:underline'
                      >
                        Mot de passe oublié?
                      </Link>
                    </div>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <Input
                        id='password'
                        type={showPassword ? 'text' : 'password'}
                        placeholder='••••••••'
                        className='pl-10'
                        value={password}
                        onChange={e => setPassword(e.target.value)}
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
                  <Button
                    type='submit'
                    className='w-full h-11'
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
                  </Button>
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
                      signIn('google', { callbackUrl: '/discover' })
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
                  Vous n&apos;avez pas de compte?{' '}
                  <Link
                    href='/register'
                    className='text-primary hover:underline'
                  >
                    Inscrivez-vous
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </div>
        </main>

        <footer className='py-6 border-t'>
          <div className='container mx-auto px-4 text-center text-sm text-muted-foreground'>
            &copy; {new Date().getFullYear()} Love Hotel Rencontres. Tous droits
            réservés.
          </div>
        </footer>
      </div>
    </MainLayout>
  )
}
