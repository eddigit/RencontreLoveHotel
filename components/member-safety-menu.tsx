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

  function report(reason: MemberReportReason) {
    startTransition(async () => {
      await reportMember({ targetUserId, reason })
      setFeedback('Signalement transmis à la modération.')
    })
  }

  return (
    <div className='space-y-2 border-t border-white/10 pt-3'>
      <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/45'>Sécurité</p>
      <div className='grid grid-cols-2 gap-2'>
        <Button
          type='button'
          disabled={pending}
          variant='outline'
          className='rounded-xl border-white/12 bg-white/[0.03] text-xs'
          onClick={() => report('inappropriate_content')}
        >
          <Flag className='mr-1.5 h-3.5 w-3.5' />
          Signaler
        </Button>
        <Button
          type='button'
          disabled={pending}
          variant='outline'
          className='rounded-xl border-red-300/20 bg-red-500/[0.06] text-xs text-red-100'
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
