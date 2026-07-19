'use client'

import type React from 'react'
import { Sparkles } from 'lucide-react'

export function LhrV2Shell({
  children,
  eyebrow,
  title,
  subtitle,
  action
}: {
  children: React.ReactNode
  user?: any
  eyebrow?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <section className='lhr-v2-content min-h-full text-white'>
      <header className='flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5'>
        <div>
          {eyebrow ? (
            <div className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ff8cc8]'>
              <Sparkles className='h-3.5 w-3.5' />
              {eyebrow}
            </div>
          ) : null}
          <h1 className='text-2xl font-black leading-tight sm:text-3xl'>{title}</h1>
          {subtitle ? (
            <p className='mt-1 max-w-3xl text-sm leading-6 text-white/64'>{subtitle}</p>
          ) : null}
        </div>
        {action ? (
          <div className='flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end'>
            {action}
          </div>
        ) : null}
      </header>

      <div className='p-3 sm:p-4 lg:p-5'>{children}</div>
    </section>
  )
}
