'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthPageShell } from '@/components/auth-page-shell'

export default function VerifyEmailPage () {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>(
    'pending'
  )
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token manquant.')
      return
    }
    fetch(`/api/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success')
          setMessage(
            'Votre email a bien été vérifié. Vous pouvez maintenant vous connecter.'
          )
        } else {
          setStatus('error')
          setMessage(data.error || 'Erreur lors de la vérification.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Erreur lors de la vérification.')
      })
  }, [token])

  return (
    <AuthPageShell backHref='/login' backLabel='Connexion'>
        <div className='w-full rounded-3xl border border-white/10 bg-black/25 p-8 text-center shadow-2xl shadow-black/25 backdrop-blur-xl'>
          <h1 className='text-2xl font-bold mb-4 text-white'>
            Vérification de l'email
          </h1>
          {status === 'pending' && (
            <p className='text-purple-200'>Vérification en cours...</p>
          )}
          {status !== 'pending' && <p className='text-purple-200'>{message}</p>}
        </div>
    </AuthPageShell>
  )
}
