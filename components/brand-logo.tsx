export function BrandLogo({
  compact = false,
  priority = false
}: {
  compact?: boolean
  priority?: boolean
}) {
  return (
    <span className='mx-auto flex w-fit max-w-full flex-col items-center'>
      <img
        src='/joug-ornement-detoure.webp'
        alt='Joug'
        width={520}
        height={438}
        loading={priority ? 'eager' : 'lazy'}
        className={compact
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
