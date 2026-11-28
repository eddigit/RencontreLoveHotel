import type { ReactNode } from 'react'

// Each pictogram is paired with a visible label by the calling control.
const marks: Record<string, ReactNode> = {
  serious: <path d="M12 20 4.5 12.5C.5 8.5 5 2 10 6l2 1.7L14 6c5-4 9.5 2.5 5.5 6.5z"/>,
  regular: <><path d="M5 9a8 8 0 0 1 14-2l1 3m-1 5a8 8 0 0 1-14 2l-1-3"/><path d="m16 10 4 .5.5-4M8 14l-4-.5-.5 4"/></>,
  casual: <><path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3z"/></>,
  friendship: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20a6 6 0 0 1 12 0m1-5a5 5 0 0 1 7 5"/></>,
  none: <><circle cx="12" cy="12" r="8"/><path d="M8 12h8"/></>,
}

const categoryAssets: Record<string, string> = {
  classic: 'classique', libertine: 'libertine', discreet: 'discrete', bdsm: 'bdsm',
  discovery: 'bdsm', dominant: 'bdsm', submissive: 'bdsm', switch: 'bdsm'
}

export function DesireIcon({ value, className = 'size-8 shrink-0' }: { value: string; className?: string }) {
  const asset = categoryAssets[value]
  if (asset) return <img src={`/icons/rencontres/${asset}.svg`} width="32" height="32" alt="" aria-hidden="true" className={className} />
  return <svg aria-hidden="true" focusable="false" className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{marks[value]}</svg>
}
