'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Flag, ShieldOff } from 'lucide-react'
import { blockMember, reportMember, type MemberReportReason } from '@/actions/member-safety-actions'
import { Button } from '@/components/ui/button'

export function MemberSafetyMenu({ targetUserId }: { targetUserId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState('')
  const [details, setDetails] = useState('')

  function report(reason: MemberReportReason) {
    if (!window.confirm("Signaler ce profil à la modération pour une possible sollicitation avec contrepartie ?")) return
    startTransition(async () => {
      await reportMember({ targetUserId, reason, details })
      setDetails('')
      setFeedback('Déclaration transmise à la modération. Elle sera examinée par une personne.')
    })
  }

  return (
    <div className='space-y-2 border-t border-white/10 pt-3'>
      <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/45'>Sécurité</p>
      <label className='block text-xs text-white/65'>
        Contexte facultatif (déclaration, sans coordonnées ni données personnelles)
        <textarea
          value={details}
          onChange={event => setDetails(event.target.value)}
          maxLength={1000}
          className='mt-1 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 p-2 text-sm'
        />
      </label>
      <div className='grid min-w-0 grid-cols-1 gap-2'>
        <Button
          type='button'
          disabled={pending}
          variant='outline'
          className='h-auto min-h-10 w-full min-w-0 justify-start whitespace-normal rounded-xl border-white/12 bg-white/[0.03] px-3 py-2 text-left text-xs leading-4'
          onClick={() => report('paid_sexual_solicitation')}
        >
          <Flag className='mr-1.5 h-3.5 w-3.5' />
          Signaler une sollicitation tarifée
        </Button>
        <Button
          type='button'
          disabled={pending}
          variant='outline'
          className='h-auto min-h-10 w-full min-w-0 justify-start whitespace-normal rounded-xl border-red-300/20 bg-red-500/[0.06] px-3 py-2 text-left text-xs leading-4 text-red-100'
          onClick={() => startTransition(async () => {
            await blockMember(targetUserId)
            router.push('/discover')
            router.refresh()
          })}
        >
          <ShieldOff className='mr-1.5 h-3.5 w-3.5' />
          Bloquer
        </Button>
      </div>
      {feedback && <p role='status' className='text-xs text-[#94ffc9]'>{feedback}</p>}
    </div>
  )
}
