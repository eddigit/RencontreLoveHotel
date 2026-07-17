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
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { registerUser } from '@/app/actions'
import { AuthPageShell } from '@/components/auth-page-shell'
import { LEGAL_POLICY_VERSIONS } from '@/lib/legal-policy'

export default function RegisterPage () {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    adult: false,
    agreeTerms: false,
    antiSolicitation: false
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

    try {
      // Enregistrer l'utilisateur dans la base de données
      const result = await registerUser(
        formData.email,
        formData.password,
        formData.name,
        {
          adult: formData.adult,
          terms: formData.agreeTerms,
          antiSolicitation: formData.antiSolicitation,
          versions: LEGAL_POLICY_VERSIONS
        }
      )

      if (result.success) {
        const signInResult = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false
        })

        router.push(signInResult?.ok ? '/onboarding' : '/login')
      } else {
        // Gérer l'erreur ici (afficher un message, etc.)
        console.error("Erreur lors de l'inscription:", result.error)
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error)
    }
  }

  return (
    <AuthPageShell>
            <Card className='border-white/10 bg-[#130d18]/92 shadow-2xl shadow-black/35 backdrop-blur-xl'>
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
                  <div className='rounded-xl border border-[#ff8cc8]/20 bg-[#ff3b8b]/8 p-4 text-sm leading-6'>
                    <strong>Aucune prestation sexuelle rémunérée.</strong>{' '}
                    LHR est une communauté adulte encadrée par des adhérents-modérateurs.
                    <Link href='/community-safety' className='ml-1 text-primary hover:underline'>Lire la charte</Link>
                  </div>
                  <div className='flex items-start space-x-2'>
                    <Checkbox
                      id='adult'
                      checked={formData.adult}
                      onCheckedChange={checked => setFormData({ ...formData, adult: checked === true })}
                    />
                    <label htmlFor='adult' className='text-sm leading-5'>Je certifie avoir au moins 18 ans.</label>
                  </div>
                  <div className='flex items-start space-x-2'>
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
                  <div className='flex items-start space-x-2'>
                    <Checkbox
                      id='antiSolicitation'
                      checked={formData.antiSolicitation}
                      onCheckedChange={checked => setFormData({ ...formData, antiSolicitation: checked === true })}
                    />
                    <label htmlFor='antiSolicitation' className='text-sm leading-5'>
                      J’accepte l’interdiction de toute sollicitation sexuelle contre argent, cadeau, service ou avantage.
                    </label>
                  </div>
                  <Button
                    type='submit'
                    className='w-full h-11'
                    disabled={!formData.adult || !formData.agreeTerms || !formData.antiSolicitation}
                  >
                    S&apos;inscrire
                  </Button>
                </form>

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
    </AuthPageShell>
  )
}
