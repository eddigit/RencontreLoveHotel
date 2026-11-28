export function BrandLogo({
  compact = false,
  inline = false,
  priority = false
}: {
  inline?: boolean
  compact?: boolean
  priority?: boolean
}) {
  return (
    <span className={inline ? 'inline-flex max-w-full items-center gap-2' : 'mx-auto flex w-fit max-w-full flex-col items-center'}>
      <img
        src='/joug-ornement-detoure.webp'
        alt='Joug'
        width={520}
        height={438}
        loading={priority ? 'eager' : 'lazy'}
        className={inline ? 'block h-9 w-auto shrink-0 object-contain' : compact
          ? 'block h-11 w-auto max-w-full object-contain'
          : 'block h-auto w-40 max-w-full object-contain'}
      />
      <span className={compact
        ? 'font-serif text-sm leading-4 tracking-wide text-[#d6bc87]'
        : 'font-serif text-xl leading-6 tracking-wide text-[#d6bc87]'}>
        Rencontre
      </span>
    </span>
  )
}
