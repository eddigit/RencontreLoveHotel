'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, FileText, ShieldCheck, Trash2, Upload, UserRoundCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export type PhotoVerificationStatus = 'pending' | 'approved' | 'rejected' | 'removed' | 'expired'
export type PhotoVerificationIdentityKind = 'solo' | 'couple'

export type OwnPhotoVerificationRequest = {
  id: string
  status: PhotoVerificationStatus
  identityKind: PhotoVerificationIdentityKind
  pseudonymSnapshot?: string | null
  submittedAt: string
  expiresAt?: string | null
  decidedAt?: string | null
  decisionNote?: string | null
  evidenceAvailable?: boolean
} | null

type Props = {
  request: OwnPhotoVerificationRequest
  identityKind: PhotoVerificationIdentityKind | null
  pseudonym: string
  onWithdraw: () => Promise<unknown>
}

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' })

export function PhotoVerificationRequest ({ request, identityKind, pseudonym, onWithdraw }: Props) {
  const router = useRouter()
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = Boolean(identityKind) && (!request || ['rejected', 'removed', 'expired'].includes(request.status))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!consent) {
      setError('Votre accord explicite est nécessaire avant l’envoi.')
      return
    }
    setSubmitting(true)
    setMessage(null)
    setError(null)
    try {
      const formData = new FormData(event.currentTarget)
      formData.set('consent', 'yes')
      const response = await fetch('/api/photo-verifications', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      })
      if (!response.ok) throw new Error('submission_failed')
      setMessage('Votre demande a été envoyée. Elle reste privée pendant son examen.')
      router.refresh()
    } catch {
      setError('La demande n’a pas pu être envoyée. Vérifiez la photo puis réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const withdraw = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await onWithdraw()
      setMessage('Votre demande a été retirée. La preuve associée n’est plus disponible à l’examen.')
      router.refresh()
    } catch {
      setError('Le retrait n’a pas pu être enregistré. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section aria-labelledby='photo-verification-title' className='rounded-2xl border border-[#6c5735] bg-[#121317] p-5 text-[#ecebe7]'>
      <div className='flex gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-graphite'>
          <UserRoundCheck className='h-5 w-5 text-[#d6bc87]' />
        </div>
        <div>
          <h3 id='photo-verification-title' className='font-black'>Faire vérifier mon profil</h3>
          <p className='mt-1 text-sm leading-5 text-[#c9c7c2]'>Une vérification humaine, privée et facultative pour confirmer que votre photo correspond bien à votre profil.</p>
        </div>
      </div>

      {request && <VerificationStatus request={request} onWithdraw={withdraw} busy={submitting} />}

      {!identityKind && <div role='alert' className='mt-5 rounded-xl border border-[#d6bc87]/30 bg-graphite p-4 text-sm leading-6 text-[#f3e4bd]'>Complétez d’abord votre type de profil (solo ou couple) pour demander une vérification. <Link href='/profile?tab=profile' className='font-bold underline'>Compléter mon profil</Link></div>}
      {canSubmit && (
        <form onSubmit={handleSubmit} className='mt-5 space-y-4'>
          <div className='rounded-xl border border-[#d6bc87]/25 bg-graphite p-4 text-sm leading-6 text-[#e6dfd0]'>
            <strong className='block text-[#f3e4bd]'>Consigne de photo privée</strong>
            Prenez une photo récente de vous, tenant une feuille avec « {pseudonym} » écrit à la main. Pour un couple, les deux personnes doivent apparaître avec la feuille. Cette image ne sera jamais publiée sur votre profil ni dans la galerie.
          </div>
          <p className='rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm'>Vérification demandée pour : <strong>{identityKind === 'couple' ? 'votre couple' : 'votre profil solo'}</strong>.</p>
          <label className='block rounded-xl border border-dashed border-white/25 bg-[#04070b] p-4'>
            <span className='flex items-center gap-2 font-bold'><Upload className='h-4 w-4 text-[#d6bc87]' />Photo de vérification</span>
            <span className='mt-1 block text-xs leading-5 text-[#c9c7c2]'>Image JPG, PNG ou WebP, 3 Mo maximum à l’envoi. Aucun aperçu ne sera affiché dans cet espace.</span>
            <input required name='evidence' type='file' accept='image/jpeg,image/png,image/webp' className='mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-graphite file:px-3 file:py-2 file:font-bold file:text-graphite-ink' />
          </label>
          <label className='flex cursor-pointer gap-3 rounded-xl border border-white/10 p-4 text-sm leading-5'>
            <Checkbox checked={consent} onCheckedChange={value => setConsent(value === true)} />
            <span>J’accepte que cette photo soit consultée uniquement par les administrateurs autorisés afin de traiter cette demande. Elle n’est pas publique. La photo est supprimée après décision ou retrait. Une demande sans décision expire après 30 jours et sa photo devient inaccessible.</span>
          </label>
          {error && <p role='alert' className='rounded-xl border border-rose-300/30 bg-rose-950/40 p-3 text-sm text-rose-100'>{error}</p>}
          {message && <p role='status' className='rounded-xl border border-emerald-300/30 bg-emerald-950/30 p-3 text-sm text-emerald-100'>{message}</p>}
          <Button type='submit' disabled={submitting || !consent} className='bg-graphite text-graphite-ink hover:bg-graphite-hover'>
            <ShieldCheck className='mr-2 h-4 w-4' />{submitting ? 'Envoi…' : 'Envoyer la demande privée'}
          </Button>
        </form>
      )}
    </section>
  )
}

function VerificationStatus ({ request, onWithdraw, busy }: { request: Exclude<OwnPhotoVerificationRequest, null>, onWithdraw: () => void, busy: boolean }) {
  const submittedAt = dateTime.format(new Date(request.submittedAt))
  if (request.status === 'approved') return <div className='mt-5 rounded-xl border border-emerald-300/30 bg-emerald-950/30 p-4 text-sm text-emerald-100'><ShieldCheck className='mr-2 inline h-4 w-4' />Profil vérifié le {request.decidedAt ? dateTime.format(new Date(request.decidedAt)) : submittedAt}. La preuve privée a été supprimée.<Button type='button' variant='outline' disabled={busy} onClick={onWithdraw} className='ml-3 h-8 border-emerald-300/40 bg-transparent text-emerald-100 hover:bg-emerald-950/50'><Trash2 className='mr-1 h-3.5 w-3.5' />Retirer la vérification</Button></div>
  if (request.status === 'pending') return <div className='mt-5 rounded-xl border border-[#d6bc87]/30 bg-graphite p-4 text-sm text-[#f3e4bd]'><FileText className='mr-2 inline h-4 w-4' />Demande envoyée le {submittedAt}. Votre preuve reste privée pendant l’examen.<Button type='button' variant='outline' disabled={busy} onClick={onWithdraw} className='ml-3 h-8 border-[#d6bc87]/40 bg-transparent text-[#f3e4bd] hover:bg-graphite'><Trash2 className='mr-1 h-3.5 w-3.5' />Retirer</Button></div>
  return <div className='mt-5 rounded-xl border border-rose-300/30 bg-rose-950/30 p-4 text-sm text-rose-100'><AlertTriangle className='mr-2 inline h-4 w-4' />{request.status === 'rejected' ? 'La vérification nécessite une nouvelle photo.' : 'Cette demande n’est plus active.'}{request.decisionNote ? <span className='mt-2 block text-rose-50'>Message : {request.decisionNote}</span> : null}</div>
}
