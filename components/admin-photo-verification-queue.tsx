'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, ImageOff, ShieldAlert, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PhotoVerificationIdentityKind, PhotoVerificationStatus } from '@/components/photo-verification-request'

export type AdminPhotoVerificationRequest = {
  id: string
  userId: string
  pseudonymSnapshot: string
  identityKind: PhotoVerificationIdentityKind
  status: PhotoVerificationStatus
  submittedAt: string
  expiresAt: string
  decidedAt: string | null
  decisionNote: string | null
  evidenceAvailable: boolean
}

type Props = {
  requests: AdminPhotoVerificationRequest[]
  onReview: (id: string, input: { decision: 'approve' | 'reject' | 'remove', note?: string }) => Promise<unknown>
}

const statusLabel: Record<PhotoVerificationStatus, string> = {
  pending: 'À examiner', approved: 'Approuvée', rejected: 'Nouvelle demande requise', removed: 'Retirée', expired: 'Expirée'
}

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' })

export function AdminPhotoVerificationQueue ({ requests, onReview }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<AdminPhotoVerificationRequest | null>(null)
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null)
  const [evidenceRequestId, setEvidenceRequestId] = useState<string | null>(null)
  const [loadingEvidence, setLoadingEvidence] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const evidenceLoadSequence = useRef(0)

  useEffect(() => () => {
    if (evidenceUrl) URL.revokeObjectURL(evidenceUrl)
  }, [evidenceUrl])

  const closeEvidence = () => {
    evidenceLoadSequence.current += 1
    if (evidenceUrl) URL.revokeObjectURL(evidenceUrl)
    setEvidenceUrl(null)
    setEvidenceRequestId(null)
    setSelected(null)
    setNote('')
    setError(null)
  }

  const inspect = async (request: AdminPhotoVerificationRequest) => {
    evidenceLoadSequence.current += 1
    const sequence = evidenceLoadSequence.current
    if (evidenceUrl) URL.revokeObjectURL(evidenceUrl)
    setSelected(request)
    setEvidenceUrl(null)
    setEvidenceRequestId(null)
    setLoadingEvidence(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/photo-verifications/${encodeURIComponent(request.id)}/evidence`, { cache: 'no-store', credentials: 'same-origin' })
      if (!response.ok) throw new Error('evidence_unavailable')
      const blob = await response.blob()
      if (sequence !== evidenceLoadSequence.current) return
      setEvidenceUrl(URL.createObjectURL(blob))
      setEvidenceRequestId(request.id)
    } catch {
      if (sequence !== evidenceLoadSequence.current) return
      setError('La preuve est indisponible ou a déjà été purgée.')
    } finally {
      if (sequence === evidenceLoadSequence.current) setLoadingEvidence(false)
    }
  }

  const review = async (decision: 'approve' | 'reject' | 'remove') => {
    if (!selected) return
    if (decision !== 'remove' && evidenceRequestId !== selected.id) return
    setReviewing(true)
    setError(null)
    try {
      await onReview(selected.id, { decision, note: note.trim() || undefined })
      closeEvidence()
      router.refresh()
    } catch {
      setError('La décision n’a pas pu être enregistrée. Réessayez.')
    } finally {
      setReviewing(false)
    }
  }

  const removeApprovedBadge = async (request: AdminPhotoVerificationRequest) => {
    if (!window.confirm(`Retirer le badge vérifié de ${request.pseudonymSnapshot || 'ce membre'} ?`)) return
    setReviewing(true)
    setError(null)
    try {
      await onReview(request.id, { decision: 'remove' })
      router.refresh()
    } catch {
      setError('Le retrait du badge n’a pas pu être enregistré. Réessayez.')
    } finally {
      setReviewing(false)
    }
  }

  return (
    <section aria-labelledby='verification-queue-title' className='rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div><h1 id='verification-queue-title' className='text-2xl font-black'>Vérifications photo</h1><p className='mt-1 text-sm text-white/65'>File privée. Les photos ne sont jamais chargées avant l’ouverture explicite d’une demande.</p></div>
        <span className='rounded-full bg-graphite px-3 py-1 text-sm font-bold text-[#f3e4bd]'>{requests.filter(request => request.status === 'pending').length} à examiner</span>
      </div>
      {requests.length === 0 ? <p className='mt-5 rounded-xl border border-dashed border-white/20 p-5 text-sm text-white/65'>Aucune demande à traiter.</p> : <ol className='mt-5 space-y-3'>{requests.map(request => <li key={request.id} className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111821] p-4'><div><h2 className='font-bold'>{request.pseudonymSnapshot || 'Membre'}</h2><p className='mt-1 text-sm text-white/65'>{request.identityKind === 'couple' ? 'Couple' : 'Solo'} · reçue le {dateTime.format(new Date(request.submittedAt))}</p></div><div className='flex items-center gap-3'><span className='text-sm text-[#f3e4bd]'>{statusLabel[request.status]}</span>{request.status === 'pending' && <Button type='button' size='sm' onClick={() => inspect(request)} className='bg-graphite text-graphite-ink hover:bg-graphite-hover'><Eye className='mr-2 h-4 w-4' />Examiner la preuve</Button>}{request.status === 'approved' && <Button type='button' size='sm' variant='outline' disabled={reviewing} onClick={() => removeApprovedBadge(request)} className='border-rose-300/40 text-rose-100 hover:bg-rose-950/40'><Trash2 className='mr-2 h-4 w-4' />Retirer le badge</Button>}</div></li>)}</ol>}

      {selected && <div role='dialog' aria-modal='true' aria-label='Examen de la preuve privée' className='fixed inset-0 z-50 grid place-items-center bg-black/80 p-4'><div className='max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#d6bc87]/30 bg-[#121318] p-5 shadow-2xl'><div className='flex items-start justify-between gap-4'><div><h2 className='text-xl font-black'>Preuve privée · {selected.pseudonymSnapshot || 'Membre'}</h2><p className='mt-1 text-sm text-white/65'>Ne pas télécharger, copier ni diffuser. Cette image sera purgée immédiatement après décision.</p></div><Button type='button' size='icon' variant='ghost' aria-label='Fermer la preuve' onClick={closeEvidence}><X className='h-5 w-5' /></Button></div>{loadingEvidence && <p className='my-8 text-center text-sm text-white/65'>Chargement sécurisé de la preuve…</p>}{error && <p role='alert' className='my-5 rounded-xl border border-rose-300/30 bg-rose-950/30 p-3 text-sm text-rose-100'>{error}</p>}{evidenceUrl && <img src={evidenceUrl} alt='Preuve privée de vérification, visible uniquement pendant cet examen' className='my-5 max-h-[48dvh] w-full rounded-xl object-contain' />}<label className='block text-sm font-bold'>Motif ou note de décision <span className='font-normal text-white/50'>(facultatif)</span><textarea value={note} onChange={event => setNote(event.target.value)} className='mt-2 min-h-20 w-full rounded-xl border border-white/20 bg-[#04070b] p-3 font-normal text-white' placeholder='Message bref et respectueux pour le membre' /></label><div className='mt-4 flex flex-wrap gap-2'><Button disabled={reviewing || evidenceRequestId !== selected.id} onClick={() => review('approve')} className='bg-emerald-500 text-white hover:bg-emerald-400'><Check className='mr-2 h-4 w-4' />Approuver et purger</Button><Button disabled={reviewing || evidenceRequestId !== selected.id} onClick={() => review('reject')} variant='outline' className='border-rose-300/40 text-rose-100 hover:bg-rose-950/40'><ShieldAlert className='mr-2 h-4 w-4' />Refuser et demander une nouvelle photo</Button><Button disabled={reviewing} onClick={() => review('remove')} variant='ghost' className='text-white/70'><Trash2 className='mr-2 h-4 w-4' />Retirer sans approuver</Button></div>{!evidenceUrl && !loadingEvidence && <p className='mt-4 flex items-center gap-2 text-sm text-white/60'><ImageOff className='h-4 w-4' />Aucune preuve chargée.</p>}</div></div>}
    </section>
  )
}
