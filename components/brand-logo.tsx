import { useId } from 'react'

export function BrandLogo({
  compact = false,
  priority = false
}: {
  compact?: boolean
  priority?: boolean
}) {
  const toneId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const filterId = `loolyyb-tone-${toneId}`

  return (
    <div className={compact ? 'flex min-w-0 items-center gap-2.5' : 'flex justify-center'}>
      <span className={`relative block aspect-square shrink-0 ${compact ? 'w-9 sm:w-10' : 'w-14 max-w-full'}`}>
        <svg aria-hidden='true' width='0' height='0' className='absolute' focusable='false'>
          <defs>
            <filter id={filterId} colorInterpolationFilters='sRGB'>
              {/* The supplied artwork encodes its white symbol in the green channel.
                  Map that channel to champagne and graphite while preserving its alpha. */}
              <feColorMatrix type='matrix' values='0 .765 0 0 .0745  0 .663 0 0 .0745  0 .447 0 0 .0824  0 0 0 1 0' />
            </filter>
          </defs>
        </svg>
        <img
          src='/loolyyb-original.png'
          alt='LOOLYYB'
          width={300}
          height={300}
          loading={priority ? 'eager' : 'lazy'}
          className='block h-full w-full object-contain'
          style={{ filter: `url(#${filterId})` }}
        />
        <span aria-hidden='true' className='pointer-events-none absolute inset-[1%] rounded-[8.5%] border border-[#d6bc87]/75' />
      </span>
      {compact && <span className='truncate text-sm font-semibold tracking-tight text-[#f0ece3] sm:text-base'>Love Hotel Rencontre</span>}
    </div>
  )
}
