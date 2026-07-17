'use client'

import { useState } from 'react'
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
import { AuthPageShell } from '@/components/auth-page-shell'

export default function ForgotPasswordPage () {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/account/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        toast({
          title: 'Email envoyé',
          description:
            'Un email de réinitialisation a été envoyé à votre adresse.',
          variant: 'default'
        })
        setEmail('')
      } else {
        toast({
          title: 'Erreur',
          description: "Impossible d'envoyer l'email. Veuillez réessayer.",
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Une erreur s'est produite. Veuillez réessayer.",
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell backHref='/login' backLabel='Connexion'>
        <Card className='border-white/10 bg-[#130d18]/92 shadow-2xl shadow-black/35 backdrop-blur-xl'>
          <CardHeader>
            <CardTitle className='text-center text-2xl font-bold'>
              Mot de passe oublié
            </CardTitle>
            <CardDescription className='text-center'>
              Entrez votre adresse email pour recevoir un lien de
              réinitialisation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='exemple@email.com'
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                  }}
                  required
                />
              </div>
              <Button
                type='submit'
                className='w-full h-11'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
              </Button>
            </form>
          </CardContent>
        </Card>
    </AuthPageShell>
  )
}
