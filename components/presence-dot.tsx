import { cn } from '@/lib/utils'

/** On circular avatars this overlay is a sibling of the clipped photo. */
export function PresenceDot({ className }: { className?: string }) {
  return <span role='img' aria-label='En ligne' title='En ligne'
    className={cn('pointer-events-none absolute z-10 size-3 rounded-full border-2 border-[#191714] bg-[#35e48d]', className)}
  />
}
