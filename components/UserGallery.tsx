'use client'

import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

type GalleryPhoto = { id: string; url: string }

const control = 'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#17191e] text-stone-100 transition hover:border-[#d6bc87] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d6bc87]'

function PhotoViewer({ photos, startIndex }: { photos: GalleryPhoto[]; startIndex: number }) {
  const [index, setIndex] = useState(startIndex)
  const [viewport, carousel] = useEmblaCarousel({
    startIndex,
    loop: photos.length > 1,
    breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } }
  })

  useEffect(() => {
    if (!carousel) return
    const sync = () => setIndex(carousel.selectedScrollSnap())
    sync()
    carousel.on('select', sync).on('reInit', sync)
    return () => { carousel.off('select', sync).off('reInit', sync) }
  }, [carousel])

  return (
    <Dialog.Portal>
      <Dialog.Overlay className='fixed inset-0 z-[100] bg-black/85 backdrop-blur-md' />
      <Dialog.Content aria-describedby={undefined}
        className='fixed inset-0 z-[101] mx-auto flex h-[100dvh] w-full max-w-[110rem] flex-col overflow-hidden bg-[#0d0e11] text-stone-100 focus:outline-none'
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); carousel?.scrollPrev() }
          if (event.key === 'ArrowRight') { event.preventDefault(); carousel?.scrollNext() }
        }}>
        <header className='joug-lit-header flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8'>
          <Dialog.Title className='text-base font-semibold tracking-tight'>Galerie photo</Dialog.Title>
          <div className='flex items-center gap-3'>
            <span aria-live='polite' className='text-sm tabular-nums text-[#d6bc87]'>Photo {index + 1} sur {photos.length}</span>
            <Dialog.Close aria-label='Fermer la galerie' className={control}><X size={20} /></Dialog.Close>
          </div>
        </header>

        <div ref={viewport} className='min-h-0 flex-1 overflow-hidden'>
          <div className='flex h-full touch-[pan-y_pinch-zoom]'>
            {photos.map((photo, i) => (
              <div key={photo.id} aria-hidden={i !== index} className='h-full min-w-0 flex-[0_0_100%]'>
                <img src={photo.url} data-member-photo draggable={false} alt={`Photo de galerie ${i + 1}`}
                  loading={i === index ? 'eager' : 'lazy'} className='block h-full w-full select-none object-contain' />
              </div>
            ))}
          </div>
        </div>

        {photos.length > 1 && (
          <footer className='flex shrink-0 items-center justify-center gap-5 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3'>
            <button type='button' aria-label='Photo précédente' className={control} onClick={() => carousel?.scrollPrev()}><ChevronLeft /></button>
            <div aria-hidden='true' className='h-0.5 w-20 overflow-hidden rounded-full bg-white/15'>
              <div className='h-full origin-left bg-[#d6bc87] transition-transform motion-reduce:transition-none' style={{ transform: `scaleX(${(index + 1) / photos.length})` }} />
            </div>
            <button type='button' aria-label='Photo suivante' className={control} onClick={() => carousel?.scrollNext()}><ChevronRight /></button>
          </footer>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  )
}

export function UserGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [start, setStart] = useState<number | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  if (!photos.length) return <p className='text-sm text-stone-400'>Ce membre n’a pas encore ajouté de photo à sa galerie.</p>

  return <Dialog.Root open={start !== null} onOpenChange={open => {
    if (!open) {
      setStart(null)
      requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }))
    }
  }}>
    <div className='grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]'>
      {photos.map((photo, i) => <button type='button' key={photo.id} onClick={event => { opener.current = event.currentTarget; setStart(i) }}
        className='aspect-square overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-amber-200'
        aria-haspopup='dialog' aria-label={`Agrandir la photo ${i + 1}`}>
        <img data-member-photo alt='' src={photo.url} loading='lazy' className='h-full w-full object-cover' />
      </button>)}
    </div>
    {start !== null && <PhotoViewer photos={photos} startIndex={start} />}
  </Dialog.Root>
}
