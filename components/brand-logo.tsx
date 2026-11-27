export function BrandLogo({
  compact = false,
  priority = false
}: {
  compact?: boolean
  priority?: boolean
}) {
  return (
    <div className={compact ? 'flex min-w-0 items-center gap-2.5' : 'flex justify-center'}>
      <span className={`relative block aspect-square shrink-0 ${compact ? 'w-9 sm:w-10' : 'w-14 max-w-full'}`}>
        <img
          src='/joug-champagne.svg'
          alt={compact ? '' : 'Joug Rencontres'}
          width={300}
          height={300}
          loading={priority ? 'eager' : 'lazy'}
          className='block h-full w-full object-contain'
        />
      </span>
      {compact && <span className='truncate font-serif text-base tracking-tight text-[#d6bc87] sm:text-lg'>Joug Rencontres</span>}
    </div>
  )
}
