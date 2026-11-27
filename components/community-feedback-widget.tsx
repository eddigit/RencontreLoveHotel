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
    <section aria-labelledby='community-feedback-title' className='rounded-2xl border border-[#41454b] bg-[#111821] text-[#ecebe7] p-4 sm:p-5'>
      <div className='flex items-start gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111821] text-[#ecebe7]'>
          <Lightbulb className='h-5 w-5' />
        </div>
        <div>
          <h2 id='community-feedback-title' className='font-black'>Boîte à idées</h2>
          <p className='mt-1 text-sm leading-5 text-[#c9c7c2]'>
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
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black transition has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#ecebe7] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-white ${
                  isActive
                    ? 'border-[#c3a86e] bg-[#111821] text-[#ecebe7]'
                    : 'border-[#41454b] bg-[#0a0f15] text-[#c9c7c2] hover:bg-[#0a0f15]'
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
            : 'Quel lieu ou quelle sortie aimeriez-vous découvrir ? Pour suggérer une adresse, indiquez son nom et sa ville. Vous pouvez aussi proposer une amélioration du site.'}
          minLength={8}
          maxLength={2000}
          required
          className='min-h-28 rounded-2xl border-[#41454b] bg-[#0a0f15] text-[#ecebe7] placeholder:text-[#c9c7c2] focus-visible:ring-[#ecebe7]'
        />

        {status && (
          <div
            role='status'
            aria-live='polite'
            className={`rounded-2xl border p-3 text-sm ${
              status.type === 'success'
                ? 'border-[#41454b] bg-[#111821] text-[#ecebe7]'
                : 'border-red-300/25 bg-red-500/10 text-red-800'
            }`}
          >
            <div className='flex items-center gap-2'>
              {status.type === 'success' && <CheckCircle2 className='h-4 w-4' />}
              <span>{status.type === 'success' ? 'Votre retour a bien été envoyé à l’équipe.' : status.message}</span>
            </div>
          </div>
        )}

        <p className='flex items-start gap-2 text-xs leading-5 text-[#c9c7c2]'>
          <LockKeyhole aria-hidden='true' className='mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ecebe7]' />
          <span>Votre message et votre pseudo sont visibles uniquement par l’équipe du site.</span>
        </p>

        <Button
          type='submit'
          disabled={isSubmitting}
          className='w-full bg-[#c1121f] text-white hover:opacity-90'
        >
          <Send className='mr-2 h-4 w-4' />
          {isSubmitting ? 'Envoi en cours...' : kind === 'bug' ? 'Signaler le bug' : 'Envoyer mon idée'}
        </Button>
      </form>
    </section>
  )
}
