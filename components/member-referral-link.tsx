'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function MemberReferralLink() {
  const input = useRef<HTMLInputElement>(null)
  const [link, setLink] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'ready' | 'copied' | 'manual'>('ready')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/member-referral-link', { signal: controller.signal })
        if (!response.ok) throw new Error()
        const data = await response.json()
        setLink(typeof data.link === 'string' ? data.link : '')
      } catch {
        if (!controller.signal.aborted) setLink('')
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopyState('copied')
    } catch {
      input.current?.focus()
      input.current?.select()
      setCopyState('manual')
    }
  }

  if (link === null) return null
  if (!link) return <p className='text-sm text-slate-600'>Le lien de parrainage est temporairement indisponible.</p>
  return (
    <section aria-label='Parrainage facultatif' className='rounded-2xl border border-slate-200 bg-white p-5 text-slate-800'>
      <h2 className='text-lg font-bold'>Inviter une personne au cercle</h2>
      <p className='mt-1 text-sm text-slate-600'>Partagez votre lien personnel avec la personne de votre choix.</p>
      <div className='mt-3 flex gap-2'>
        <input ref={input} aria-label='Lien de parrainage' readOnly value={link} className='min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm' />
        <button type='button' onClick={copyLink} className='inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white'>
          {copyState === 'copied' ? <Check className='size-4' /> : <Copy className='size-4' />}
          {copyState === 'copied' ? 'Copié' : 'Copier'}
        </button>
      </div>
      {copyState === 'manual' && <p role='status' className='mt-2 text-sm'>Le lien est sélectionné. Utilisez la commande Copier de votre appareil.</p>}
    </section>
  )
}
