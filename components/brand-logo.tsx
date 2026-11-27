export function BrandLogo({
  compact = false,
  priority = false
}: {
  compact?: boolean
  priority?: boolean
}) {
  return (
    <img
      src='/joug-rencontre.webp'
      alt='Joug Rencontre'
      width={520}
      height={438}
      loading={priority ? 'eager' : 'lazy'}
      className={compact
        ? 'block h-14 w-auto max-w-full object-contain'
        : 'mx-auto block h-auto w-32 max-w-full object-contain'}
    />
  )
}
