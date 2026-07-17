'use client'

import { AuthPageShell } from '@/components/auth-page-shell'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function VerifyEmailPendingPage () {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleResend = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (data.success) {
        setMessage('Votre demande a été prise en compte.')
      } else {
        setMessage(data.error || "L'envoi automatique de vérification est désactivé.")
      }
    } catch (e) {
      setMessage("L'envoi automatique de vérification est désactivé.")
    }
    setLoading(false)
  }

  return (
    <AuthPageShell backHref='/login' backLabel='Connexion'>
        <div className='w-full rounded-3xl border border-white/10 bg-black/25 p-8 text-center shadow-2xl shadow-black/25 backdrop-blur-xl'>
          <h1 className='text-2xl font-bold mb-4 text-white'>
            Vérification de l'email requise
          </h1>
          <p className='mb-4 text-purple-200'>
            Les emails automatiques de vérification sont désactivés sur cette
            version. Les nouveaux comptes email/mot de passe sont activés
            directement.
          </p>
          <Button
            onClick={handleResend}
            disabled={loading}
            className='w-full mb-2'
          >
            {loading ? 'Contrôle...' : 'Contrôler le statut'}
          </Button>
          {message && <div className='text-purple-100 mt-2'>{message}</div>}
        </div>
    </AuthPageShell>
  )
}
