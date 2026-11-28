import { Check } from 'lucide-react'
import { DesireIcon } from '@/components/desire-icon'
import { meetingCategories, type MeetingCategory } from '@/lib/meeting-categories'

export function MeetingCategories({ selected, onToggle }: {
  selected: readonly string[]
  onToggle?: (value: MeetingCategory) => void
}) {
  return <div role='group' aria-label='Catégories de rencontre' className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
    {meetingCategories.map(({ value, label }) => {
      const active = selected.includes(value)
      const style = `flex min-h-12 min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${active ? 'bg-[#292621] text-[#fae092] ring-[#fae092]/65' : 'bg-[#17181c] text-stone-400 ring-white/10'}`
      const content = <>
        <DesireIcon value={value} className={`size-7 shrink-0 ${active ? '' : 'grayscale opacity-60'}`} />
        <span>{label}</span>
        {active && <Check aria-hidden='true' className='ml-auto size-4 shrink-0' />}
      </>
      return onToggle
        ? <button key={value} type='button' aria-pressed={active} className={style} onClick={() => onToggle(value)}>{content}</button>
        : <span key={value} className={style}>{content}<span className='sr-only'>{active ? ' — sélectionnée' : ' — non sélectionnée'}</span></span>
    })}
  </div>
}
