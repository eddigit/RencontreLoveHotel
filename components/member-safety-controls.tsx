'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Flag, ShieldAlert, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  blockMember,
  profileReportReasons,
  reportProfile,
  unblockMember,
  type ProfileReportReason
} from '@/actions/member-safety-actions'

export type MemberSafetyState = {
  blockedByMe: boolean
  blockedMe: boolean
  canInteract: boolean
}

const reasonLabels: Record<ProfileReportReason, string> = {
  harassment: 'Comportement irrespectueux ou harcèlement',
  fake_profile: 'Faux profil ou usurpation',
  inappropriate_content: 'Contenu inapproprié',
  spam: 'Sollicitation commerciale ou spam',
  dangerous_behavior: 'Comportement dangereux',
  community_rules: 'Non-respect des règles de la communauté',
  other: 'Autre'
}

export function MemberSafetyControls ({
  memberId,
  memberName,
  initialState,
  compact = false,
  onInteractionChange
}: {
  memberId: string
  memberName: string
  initialState: MemberSafetyState
  compact?: boolean
  onInteractionChange?: (state: MemberSafetyState) => void
}) {
  const router = useRouter()
  const [state, setState] = useState(initialState)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState<ProfileReportReason>('harassment')
  const [details, setDetails] = useState('')

  function updateState (next: MemberSafetyState) {
    setState(next)
    onInteractionChange?.(next)
  }

  async function handleBlock () {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await blockMember(memberId)
      updateState({ blockedByMe: true, blockedMe: state.blockedMe, canInteract: false })
      setNotice(`${memberName} est maintenant bloqué pour votre compte.`)
      router.refresh()
    } catch {
      setError('Le blocage n’a pas pu être enregistré.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUnblock () {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await unblockMember(memberId)
      const next = { blockedByMe: false, blockedMe: state.blockedMe, canInteract: !state.blockedMe }
      updateState(next)
      setNotice(`${memberName} n’est plus bloqué pour votre compte.`)
      router.refresh()
    } catch {
      setError('Le déblocage n’a pas pu être enregistré.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReport () {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await reportProfile({ memberId, reason, details })
      setReportOpen(false)
      setDetails('')
      setNotice('Signalement transmis à la modération. Merci pour votre vigilance.')
    } catch {
      setError('Le signalement n’a pas pu être transmis.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'grid gap-2'}>
      {state.blockedByMe ? (
        <Button
          type='button'
          variant='outline'
          size={compact ? 'sm' : 'default'}
          onClick={handleUnblock}
          disabled={busy}
          className='border-white/12 bg-white/[0.04]'
        >
          <Undo2 className='mr-2 h-4 w-4' />
          Débloquer ce membre
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type='button'
              variant='outline'
              size={compact ? 'sm' : 'default'}
              disabled={busy || state.blockedMe}
              className='border-white/12 bg-white/[0.04]'
            >
              <Ban className='mr-2 h-4 w-4' />
              Bloquer ce membre
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className='border-white/10 bg-[#25052f] text-white'>
            <AlertDialogHeader>
              <AlertDialogTitle>Bloquer {memberName} ?</AlertDialogTitle>
              <AlertDialogDescription className='text-white/62'>
                Vous ne pourrez plus vous envoyer de messages, vous matcher ou vous retrouver dans les recherches. L’historique restera accessible en lecture seule.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleBlock} className='bg-red-600 text-white hover:bg-red-500'>
                Confirmer le blocage
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size={compact ? 'sm' : 'default'}
            className='justify-start text-[#ffd6e9] hover:bg-[#ff3b8b]/12 hover:text-white'
          >
            <Flag className='mr-2 h-4 w-4' />
            Signaler ce profil
          </Button>
        </DialogTrigger>
        <DialogContent className='border-white/10 bg-[#25052f] text-white'>
          <DialogHeader>
            <DialogTitle>Signaler {memberName}</DialogTitle>
            <DialogDescription className='text-white/62'>
              Le signalement sera examiné par la modération. Il ne provoque aucun bannissement automatique.
            </DialogDescription>
          </DialogHeader>
          <label className='grid gap-2 text-sm font-bold'>
            Motif
            <select
              value={reason}
              onChange={event => setReason(event.target.value as ProfileReportReason)}
              className='h-11 rounded-lg border border-white/12 bg-[#16031d] px-3 text-white outline-none focus:border-[#ff8cc8]'
            >
              {profileReportReasons.map(item => (
                <option key={item} value={item}>{reasonLabels[item]}</option>
              ))}
            </select>
          </label>
          <label className='grid gap-2 text-sm font-bold'>
            Précisions facultatives
            <textarea
              value={details}
              onChange={event => setDetails(event.target.value.slice(0, 1000))}
              rows={4}
              placeholder='Décrivez brièvement les faits observés.'
              className='resize-none rounded-lg border border-white/12 bg-[#16031d] p-3 text-white outline-none placeholder:text-white/35 focus:border-[#ff8cc8]'
            />
          </label>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setReportOpen(false)}>Annuler</Button>
            <Button type='button' onClick={handleReport} disabled={busy} className='bg-[#ff3b8b] text-white hover:bg-[#ff5ca6]'>
              <ShieldAlert className='mr-2 h-4 w-4' />
              Envoyer le signalement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {state.blockedMe && !state.blockedByMe && (
        <p className='text-xs text-white/50'>Cette interaction n’est pas disponible.</p>
      )}
      {notice && <p className='text-xs text-[#94ffc9]'>{notice}</p>}
      {error && <p className='text-xs text-red-200'>{error}</p>}
    </div>
  )
}
