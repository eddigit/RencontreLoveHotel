'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CalendarDays, ShieldCheck } from 'lucide-react'
import { confirmAdultMembership } from '@/actions/adult-membership-actions'
import { adultBirthDateLimit } from '@/lib/adult-membership'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function safeCallbackPath () {
  if (typeof window === 'undefined') return '/discover'
  const value = new URLSearchParams(window.location.search).get('callbackUrl')
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/age-verification')) {
    return '/discover'
  }
  return value
}

export default function AgeVerificationPage () {
  const router = useRouter()
  const { update } = useSession()
  const { user, isLoading } = useAuth()
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [adultConsent, setAdultConsent] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
    if (!isLoading && user?.adultVerified) router.replace(safeCallbackPath())
  }, [isLoading, router, user])

  async function handleSubmit (event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const result = await confirmAdultMembership({
        dateOfBirth,
        adultConsent,
        termsAccepted
      })
      if (!result.success) {
        setError(result.error || 'La vérification n’a pas pu être enregistrée.')
        return
      }

      await update()
      router.replace(safeCallbackPath())
      router.refresh()
    } catch {
      setError('La vérification n’a pas pu être enregistrée. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-[#180422] px-4 py-8 text-white'>
      <section className='w-full max-w-lg rounded-lg border border-white/12 bg-[#260633] p-5 shadow-2xl sm:p-7'>
        <div className='mb-6 flex items-start gap-3'>
          <span className='rounded-full bg-[#94ffc9]/12 p-2 text-[#94ffc9]'>
            <ShieldCheck className='h-6 w-6' />
          </span>
          <div>
            <p className='text-xs font-bold uppercase tracking-wider text-[#94ffc9]'>Accès réservé aux adultes</p>
            <h1 className='mt-1 text-2xl font-black'>Confirmez votre majorité</h1>
            <p className='mt-2 text-sm leading-6 text-white/65'>
              Love Hotel Rencontre est strictement interdit aux mineurs. Cette confirmation est obligatoire pour accéder à la communauté.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5'>
          <div className='space-y-2'>
            <Label htmlFor='date-of-birth'>Date de naissance</Label>
            <div className='relative'>
              <CalendarDays className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45' />
              <Input
                id='date-of-birth'
                name='dateOfBirth'
                type='date'
                min='1900-01-01'
                max={adultBirthDateLimit()}
                value={dateOfBirth}
                onChange={event => setDateOfBirth(event.target.value)}
                className='h-12 border-white/12 bg-black/20 pl-10 text-white'
                required
              />
            </div>
          </div>

          <label className='flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm leading-5'>
            <Checkbox checked={adultConsent} onCheckedChange={value => setAdultConsent(value === true)} />
            <span>Je certifie sur l’honneur avoir 18 ans ou plus et avoir indiqué ma véritable date de naissance.</span>
          </label>

          <label className='flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm leading-5'>
            <Checkbox checked={termsAccepted} onCheckedChange={value => setTermsAccepted(value === true)} />
            <span>
              J’accepte les <Link href='/terms' className='text-[#ff8cc8] underline'>conditions d’utilisation</Link> et la <Link href='/privacy' className='text-[#ff8cc8] underline'>politique de confidentialité</Link>.
            </span>
          </label>

          {error && <p role='alert' className='text-sm font-medium text-[#ff9fba]'>{error}</p>}

          <Button
            type='submit'
            disabled={!dateOfBirth || !adultConsent || !termsAccepted || submitting}
            className='h-12 w-full bg-[#ff3b8b] font-bold text-white hover:bg-[#e92d79]'
          >
            {submitting ? 'Validation...' : 'Confirmer et accéder à la communauté'}
          </Button>
        </form>
      </section>
    </main>
  )
}
