"use client"

import type React from 'react'
import { useState } from 'react'
import { Bug, CheckCircle2, Lightbulb, Send } from 'lucide-react'
import { submitCommunityFeedback } from '@/actions/community-feedback-actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type FeedbackKind = 'bug' | 'suggestion'

const feedbackKinds: Array<{
  value: FeedbackKind
  label: string
  icon: typeof Bug
}> = [
  { value: 'bug', label: 'Signaler un bug', icon: Bug },
  { value: 'suggestion', label: 'Proposer une amélioration', icon: Lightbulb }
]

export function CommunityFeedbackWidget() {
  const [kind, setKind] = useState<FeedbackKind>('bug')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus(null)

    const result = await submitCommunityFeedback({
      kind,
      message,
      page: 'Accueil communauté'
    })

    setIsSubmitting(false)
    setStatus({
      type: result.success ? 'success' : 'error',
      message: result.message
    })

    if (result.success) {
      setMessage('')
    }
  }

  return (
    <section className='rounded-2xl border border-[#94ffc9]/20 bg-[linear-gradient(135deg,rgba(148,255,201,0.10),rgba(255,59,139,0.10),rgba(255,255,255,0.04))] p-5'>
      <div className='flex items-start gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#94ffc9]/15 text-[#94ffc9]'>
          <Send className='h-5 w-5' />
        </div>
        <div>
          <h2 className='font-black'>Bug ou idée ?</h2>
          <p className='mt-1 text-sm leading-5 text-white/58'>
            Votre message arrive directement à l’équipe Love Hotel.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='mt-4 space-y-3'>
        <div className='grid grid-cols-2 gap-2'>
          {feedbackKinds.map(option => {
            const Icon = option.icon
            const isActive = kind === option.value
            return (
              <button
                key={option.value}
                type='button'
                onClick={() => setKind(option.value)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black transition ${
                  isActive
                    ? 'border-[#ff8cc8]/70 bg-[#ff3b8b]/28 text-white'
                    : 'border-white/10 bg-white/[0.04] text-white/62 hover:bg-white/[0.07]'
                }`}
              >
                <Icon className='h-4 w-4' />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>

        <Textarea
          value={message}
          onChange={event => setMessage(event.target.value)}
          placeholder='Décrivez le bug, la page concernée ou votre suggestion...'
          minLength={8}
          maxLength={2000}
          required
          className='min-h-28 rounded-2xl border-white/10 bg-black/18 text-white placeholder:text-white/35 focus-visible:ring-[#ff62a8]'
        />

        {status && (
          <div
            className={`rounded-2xl border p-3 text-sm ${
              status.type === 'success'
                ? 'border-[#94ffc9]/25 bg-[#94ffc9]/10 text-[#caffdf]'
                : 'border-red-300/25 bg-red-500/10 text-red-100'
            }`}
          >
            <div className='flex items-center gap-2'>
              {status.type === 'success' && <CheckCircle2 className='h-4 w-4' />}
              <span>{status.message}</span>
            </div>
          </div>
        )}

        <Button
          type='submit'
          disabled={isSubmitting}
          className='w-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'
        >
          {isSubmitting ? 'Envoi...' : 'Envoyer le retour'}
        </Button>
      </form>
    </section>
  )
}
