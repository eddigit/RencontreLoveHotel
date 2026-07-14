'use client'

import Image from 'next/image'

export function BrandLogo({
  compact = false,
  priority = false
}: {
  compact?: boolean
  priority?: boolean
}) {
  return (
    <div className={compact ? 'flex min-w-0 items-center gap-3' : 'w-full'}>
      <span
        className={`relative block shrink-0 overflow-hidden rounded-xl bg-black/80 ${
          compact ? 'w-10' : 'mx-auto aspect-[1162/1354] w-full max-w-[148px]'
        }`}
      >
        <Image
          src='/lhr-official-logo.png'
          alt='Love Hotel Rencontre'
          width={1162}
          height={1354}
          className='block h-auto w-full object-contain'
          sizes={compact ? '40px' : '148px'}
          priority={priority}
        />
      </span>
      {compact ? (
        <span className='truncate text-sm font-black tracking-tight text-white sm:text-base'>
          Love Hotel Rencontre
        </span>
      ) : null}
    </div>
  )
}
