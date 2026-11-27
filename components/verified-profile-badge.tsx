import { BadgeCheck } from 'lucide-react'

export function VerifiedProfileBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className='inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/40 bg-[#102d23] px-1.5 py-1 text-xs font-semibold text-emerald-200' title='Photo et pseudo vérifiés par l’équipe'>
      <BadgeCheck aria-hidden className='size-4' />
      <span className={compact ? 'sr-only' : undefined}>Profil vérifié</span>
    </span>
  )
}
