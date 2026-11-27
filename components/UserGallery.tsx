'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type GalleryPhoto = { id: string; url: string }

export function UserGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null)
  const selected = index === null ? undefined : photos[index]
  if (!photos.length) return <p className='text-sm text-stone-400'>Ce membre n’a pas encore ajouté de photo à sa galerie.</p>

  function move(step: number) {
    setIndex(current => ((current ?? 0) + step + photos.length) % photos.length)
  }

  return <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setIndex(null) }}>
    <div className='grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]'>
      {photos.map((photo, i) => <button type='button' key={photo.id} onClick={() => setIndex(i)}
        className='aspect-square overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-amber-200'
        aria-label={`Agrandir la photo ${i + 1}`}>
        <img alt='' src={photo.url} loading='lazy' className='h-full w-full object-cover' />
      </button>)}
    </div>
    {selected && index !== null && <DialogContent aria-describedby={undefined} className='w-[94vw] max-w-3xl border-white/10 bg-[#131416] text-stone-100'
      onKeyDown={event => { if (event.key === 'ArrowLeft') move(-1); if (event.key === 'ArrowRight') move(1) }}>
      <DialogTitle>Photo {index + 1} sur {photos.length}</DialogTitle>
      <img src={selected.url} alt={`Photo de galerie ${index + 1}`} className='mx-auto max-h-[68svh] max-w-full object-contain' />
      {photos.length > 1 && <div className='flex justify-between'>
        <button type='button' onClick={() => move(-1)} aria-label='Photo précédente' className='p-2'><ChevronLeft /></button>
        <button type='button' onClick={() => move(1)} aria-label='Photo suivante' className='p-2'><ChevronRight /></button>
      </div>}
    </DialogContent>}
  </Dialog>
}
