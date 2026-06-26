'use client'

import MainLayout from '@/components/layout/main-layout'
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
    <MainLayout>
      <div className='min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]'>
        <div className='bg-white/10 rounded-lg p-8 shadow-lg max-w-md w-full text-center'>
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
      </div>
    </MainLayout>
  )
}
