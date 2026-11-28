'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCommunityFeedbackStatusAdmin } from '@/actions/community-feedback-actions'

type Status = 'open' | 'in_progress' | 'resolved'
const labels: Record<Status, string> = { open: 'À lire', in_progress: 'En cours', resolved: 'Traité' }

export function FeedbackStatusControl({ id, status }: { id: string; status: Status }) {
  const router = useRouter()
  const [notice, setNotice] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<Status>(status)
  const [resolutionConfirmed, setResolutionConfirmed] = useState(false)
  const [pending, startTransition] = useTransition()
  return <form className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3" onSubmit={event => {
    event.preventDefault()
    setNotice('')
    startTransition(async () => {
      try {
        const result = await updateCommunityFeedbackStatusAdmin(id, selectedStatus, resolutionConfirmed)
        if (!result.success) throw new Error('Retour introuvable')
        setNotice('Statut enregistré.')
        router.refresh()
      } catch {
        setNotice('Le statut n’a pas pu être enregistré.')
      }
    })
  }}>
    <label className="flex flex-wrap items-center gap-2 text-sm text-white/75">Statut
      <select name="status" value={selectedStatus} onChange={event => { setSelectedStatus(event.target.value as Status); setResolutionConfirmed(false) }} disabled={pending} className="min-h-10 rounded-lg border border-white/20 bg-[#1c1d20] px-3 text-white">
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    {selectedStatus === 'resolved' && <label className="flex items-center gap-2 text-sm text-white/75"><input type="checkbox" checked={resolutionConfirmed} onChange={event => setResolutionConfirmed(event.target.checked)} disabled={pending} />Résolution confirmée</label>}
    <button disabled={pending || (selectedStatus === 'resolved' && !resolutionConfirmed)} className="min-h-10 rounded-lg border border-white/20 px-3 text-sm font-semibold hover:bg-white/10">{pending ? 'Enregistrement…' : selectedStatus === 'resolved' ? 'Confirmer la résolution' : 'Enregistrer'}</button>
    <span role="status" className="text-sm text-white/75">{notice}</span>
  </form>
}
