'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Flag,
  MessageCircleHeart,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PostMeetingWord } from '@/actions/post-meeting-word-actions'

export type { PostMeetingWord } from '@/actions/post-meeting-word-actions'

export function PostMeetingWordForm({
  recipientUserId,
  onSubmit,
}: {
  recipientUserId: string
  onSubmit: (input: {
    recipientUserId: string
    message: string
    confirmMeeting: boolean
    acceptPublication: boolean
  }) => Promise<unknown>
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmMeeting, setConfirmMeeting] = useState(false)
  const [authorizePublication, setAuthorizePublication] = useState(false)
  return (
    <section className="rounded-2xl border border-[#d6bc87]/25 bg-[#d6bc87]/[0.06] p-5 text-[#ecebe7]">
      <h3 className="flex items-center gap-2 font-black">
        <MessageCircleHeart className="h-4 w-4 text-[#d6bc87]" />
        Un mot après rencontre
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#c9c7c2]">
        Après un événement ou une rencontre, partagez un mot simple et
        respectueux, sans note ni étoile. Aucun détail intime n’est attendu.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setStatus(null)
          setError(null)
          try {
            await onSubmit({
              recipientUserId,
              message,
              confirmMeeting,
              acceptPublication: authorizePublication,
            })
            setMessage('')
            setConfirmMeeting(false)
            setAuthorizePublication(false)
            setStatus(
              'Votre mot a été envoyé en privé. Il ne sera visible publiquement qu’après acceptation.',
            )
            router.refresh()
          } catch {
            setError('Envoi impossible. Réessayez plus tard.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <textarea
          required
          maxLength={600}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Quelques mots sur ce que vous avez apprécié…"
          className="min-h-24 w-full rounded-xl border border-white/10 bg-[#04070b] p-3 text-sm"
        />
        <label className="flex gap-2 text-xs text-[#c9c7c2]">
          <input
            checked={confirmMeeting}
            onChange={(e) => setConfirmMeeting(e.target.checked)}
            required
            type="checkbox"
          />{' '}
          Je confirme avoir rencontré cette personne.
        </label>
        <label className="flex gap-2 text-xs text-[#c9c7c2]">
          <input
            checked={authorizePublication}
            onChange={(e) => setAuthorizePublication(e.target.checked)}
            required
            type="checkbox"
          />{' '}
          J’autorise la publication de ce mot avec mon pseudonyme, uniquement si
          la personne concernée l’accepte aussi.
        </label>
        <Button
          disabled={
            busy || !message.trim() || !confirmMeeting || !authorizePublication
          }
          className="bg-[#d6bc87] text-[#191714] hover:bg-[#e5d1aa]"
        >
          <Send className="mr-2 h-4 w-4" />
          Envoyer en privé
        </Button>
        {status && (
          <p role="status" className="text-sm text-[#c9c7c2]">
            {status}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-rose-200">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}

export function PostMeetingWordInbox({
  received,
  authored,
  onRespond,
  onWithdraw,
}: {
  received: PostMeetingWord[]
  authored: PostMeetingWord[]
  onRespond: (
    id: string,
    input: { confirmMeeting: boolean; acceptPublication: boolean },
  ) => Promise<unknown>
  onWithdraw: (id: string) => Promise<unknown>
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const act = async (id: string, task: () => Promise<unknown>) => {
    setBusy(id)
    try {
      await task()
      router.refresh()
    } finally {
      setBusy(null)
    }
  }
  return (
    <section
      id="post-meeting-words"
      className="rounded-2xl border border-white/10 bg-[#0a0f15] p-5 text-[#ecebe7]"
    >
      <h3 className="font-black">Mots après rencontre</h3>
      <p className="mt-1 text-sm text-[#c9c7c2]">
        Vous décidez seul·e si un mot reçu peut être publié. Refuser le garde
        privé.
      </p>
      <div className="mt-4 space-y-3">
        {received.length === 0 ? (
          <p className="text-sm text-[#c9c7c2]">Aucun mot à examiner.</p>
        ) : (
          received.map((word) => (
            <article
              key={word.id}
              className="rounded-xl border border-white/10 p-4"
            >
              <p className="text-sm font-bold">{word.authorPseudonym}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{word.message}</p>
              {word.status === 'pending' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={busy === word.id}
                    onClick={() =>
                      act(word.id, () =>
                        onRespond(word.id, {
                          confirmMeeting: true,
                          acceptPublication: true,
                        }),
                      )
                    }
                    className="bg-[#d6bc87] text-[#191714]"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Confirmer et publier
                  </Button>
                  <Button
                    disabled={busy === word.id}
                    variant="outline"
                    onClick={() =>
                      act(word.id, () =>
                        onRespond(word.id, {
                          confirmMeeting: false,
                          acceptPublication: false,
                        }),
                      )
                    }
                  >
                    Décliner, garder privé
                  </Button>
                </div>
              )}
              {word.status === 'accepted' && (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="ghost"
                  disabled={busy === word.id}
                  onClick={() => act(word.id, () => onWithdraw(word.id))}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Retirer ce mot
                </Button>
              )}
            </article>
          ))
        )}
      </div>
      {authored.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <h4 className="font-bold">Mes mots envoyés</h4>
          {authored.map((word) => (
            <div
              key={word.id}
              className="mt-2 flex items-center justify-between gap-3 text-sm"
            >
              <span>
                Pour {word.recipientPseudonym} ·{' '}
                {word.status === 'accepted' ? 'publié' : 'privé'}
              </span>
              {['pending', 'accepted'].includes(word.status) && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === word.id}
                  onClick={() => act(word.id, () => onWithdraw(word.id))}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Retirer
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function PublicPostMeetingWords({
  words,
  onReport,
}: {
  words: PostMeetingWord[]
  onReport: (id: string) => Promise<unknown>
}) {
  const [reported, setReported] = useState<string | null>(null)
  if (!words.length) return null
  return (
    <section
      aria-labelledby="public-words-title"
      className="rounded-2xl border border-white/10 bg-[#111821] p-5 text-[#ecebe7]"
    >
      <h3 id="public-words-title" className="font-black">
        Un mot après rencontre
      </h3>
      <div className="mt-4 space-y-3">
        {words.map((word) => (
          <article
            key={word.id}
            className="rounded-xl border border-white/10 bg-[#0a0f15] p-4"
          >
            <p className="whitespace-pre-wrap text-sm leading-6">
              {word.message}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-[#c9c7c2]">
              <span>Partagé avec l’accord des deux personnes</span>
              <button
                type="button"
                onClick={async () => {
                  await onReport(word.id)
                  setReported(word.id)
                }}
                className="inline-flex items-center gap-1 hover:text-white"
              >
                <Flag className="h-3.5 w-3.5" />
                {reported === word.id ? 'Signalé' : 'Signaler ce mot'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
