"use client"

import type React from 'react'
import { useRef, useState } from 'react'
import { Bug, CheckCircle2, Lightbulb, LockKeyhole, Send } from 'lucide-react'
import { submitCommunityFeedback } from '@/actions/community-feedback-actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type FeedbackKind = 'bug' | 'suggestion'

const feedbackKinds: Array<{
  value: FeedbackKind
  label: string
  icon: typeof Bug
}> = [
  { value: 'suggestion', label: 'Proposer une idée', icon: Lightbulb },
  { value: 'bug', label: 'Signaler un bug', icon: Bug }
]

export function CommunityFeedbackWidget() {
  const [kind, setKind] = useState<FeedbackKind>('suggestion')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submission = useRef<{ draft: string; id: string } | null>(null)
  const [status, setStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus(null)

    try {
      const draft = JSON.stringify([kind, message])
      if (submission.current?.draft !== draft) submission.current = { draft, id: crypto.randomUUID() }
      const result = await submitCommunityFeedback({
        submissionId: submission.current.id,
        kind,
        message,
        page: 'Accueil communauté'
      })

      setStatus({
        type: result.success ? 'success' : 'error',
        message: result.message
      })

      if (result.success) {
        submission.current = null
        setMessage('')
      }
    } catch {
      setStatus({
        type: 'error',
        message: 'Votre retour n’a pas pu être envoyé. Vérifiez votre connexion puis réessayez : votre saisie est conservée.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section aria-labelledby='community-feedback-title' className='rounded-2xl border border-[#94ffc9]/20 bg-[linear-gradient(135deg,rgba(148,255,201,0.10),rgba(255,59,139,0.10),rgba(255,255,255,0.04))] p-4 sm:p-5'>
      <div className='flex items-start gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#94ffc9]/15 text-[#94ffc9]'>
          <Lightbulb className='h-5 w-5' />
        </div>
        <div>
          <h2 id='community-feedback-title' className='font-black'>Boîte à idées</h2>
          <p className='mt-1 text-sm leading-5 text-white/58'>
            Qu’aimeriez-vous organiser ou améliorer pour rendre la communauté plus agréable ?
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='mt-4 space-y-3'>
        <fieldset disabled={isSubmitting} className='grid gap-2 sm:grid-cols-2'>
          <legend className='sr-only'>Type de retour</legend>
          {feedbackKinds.map(option => {
            const Icon = option.icon
            const isActive = kind === option.value
            return (
              <label
                key={option.value}
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black transition has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#94ffc9] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[#210018] ${
                  isActive
                    ? 'border-[#ff8cc8]/70 bg-[#ff3b8b]/28 text-white'
                    : 'border-white/10 bg-white/[0.04] text-white/62 hover:bg-white/[0.07]'
                }`}
              >
                <input
                  type='radio'
                  name='community-feedback-kind'
                  value={option.value}
                  checked={isActive}
                  onChange={() => setKind(option.value)}
                  className='sr-only'
                />
                <Icon className='h-4 w-4' />
                <span>{option.label}</span>
              </label>
            )
          })}
        </fieldset>

        <Textarea
          disabled={isSubmitting}
          value={message}
          onChange={event => setMessage(event.target.value)}
          aria-label={kind === 'bug' ? 'Décrire le bug' : 'Décrire votre idée'}
          placeholder={kind === 'bug'
            ? 'Quel problème avez-vous rencontré ? Indiquez la page et ce qui s’est passé.'
            : 'Par exemple : un apéro thématique, une amélioration du profil ou une idée pour faciliter les échanges.'}
          minLength={8}
          maxLength={2000}
          required
          className='min-h-28 rounded-2xl border-white/10 bg-black/18 text-white placeholder:text-white/35 focus-visible:ring-[#ff62a8]'
        />

        {status && (
          <div
            role='status'
            aria-live='polite'
            className={`rounded-2xl border p-3 text-sm ${
              status.type === 'success'
                ? 'border-[#94ffc9]/25 bg-[#94ffc9]/10 text-[#caffdf]'
                : 'border-red-300/25 bg-red-500/10 text-red-100'
            }`}
          >
            <div className='flex items-center gap-2'>
              {status.type === 'success' && <CheckCircle2 className='h-4 w-4' />}
              <span>{status.type === 'success' ? 'Votre retour a bien été envoyé à l’équipe.' : status.message}</span>
            </div>
          </div>
        )}

        <p className='flex items-start gap-2 text-xs leading-5 text-white/52'>
          <LockKeyhole aria-hidden='true' className='mt-0.5 h-3.5 w-3.5 shrink-0 text-[#94ffc9]' />
          <span>Votre message et votre pseudo sont visibles uniquement par l’équipe du site.</span>
        </p>

        <Button
          type='submit'
          disabled={isSubmitting}
          className='w-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'
        >
          <Send className='mr-2 h-4 w-4' />
          {isSubmitting ? 'Envoi en cours...' : kind === 'bug' ? 'Signaler le bug' : 'Envoyer mon idée'}
        </Button>
      </form>
    </section>
  )
}
