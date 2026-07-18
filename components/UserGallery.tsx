'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'

interface UserPhoto {
  id: string
  url: string
  is_primary: boolean
}

export function UserGallery ({ userId }: { userId: string }) {
  const [photos, setPhotos] = useState<UserPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!userId || !uuidRegex.test(userId)) return

        const response = await fetch(`/api/photos/list?userId=${userId}`)
        if (!response.ok) return
        const data = await response.json()
        if (!data.error) setPhotos(data.photos || [])
      } catch (error) {
        console.error('Error fetching photos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [userId])

  if (loading) {
    return (
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-3' aria-label='Chargement de la galerie'>
        {[0, 1, 2].map(item => (
          <div key={item} className='aspect-[4/5] animate-pulse rounded-xl bg-white/[0.06]' />
        ))}
      </div>
    )
  }

  if (!photos.length) {
    return (
      <div className='flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-white/12 bg-black/10 px-5 text-center'>
        <Images className='h-6 w-6 text-white/28' />
        <p className='mt-2 text-sm text-white/52'>Aucune photo supplémentaire pour le moment.</p>
      </div>
    )
  }

  return (
    <>
      <div data-testid='profile-gallery-grid' className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type='button'
            className='group relative aspect-[4/5] overflow-hidden rounded-xl bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8cc8]'
            onClick={() => setViewerIndex(index)}
            aria-label={`Afficher la photo ${index + 1}`}
          >
            <img
              src={photo.url}
              alt={`Photo ${index + 1} du profil`}
              className='h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]'
            />
          </button>
        ))}
      </div>

      {viewerIndex !== null && (
        <div
          className='fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4'
          role='dialog'
          aria-modal='true'
          aria-label='Galerie photo'
          onClick={() => setViewerIndex(null)}
        >
          <button
            type='button'
            className='absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white hover:bg-white/20'
            onClick={() => setViewerIndex(null)}
            aria-label='Fermer la galerie'
          >
            <X className='h-5 w-5' />
          </button>

          {photos.length > 1 && (
            <button
              type='button'
              className='absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white hover:bg-white/20 sm:left-6'
              onClick={event => {
                event.stopPropagation()
                setViewerIndex((viewerIndex - 1 + photos.length) % photos.length)
              }}
              aria-label='Photo précédente'
            >
              <ChevronLeft className='h-6 w-6' />
            </button>
          )}

          <img
            src={photos[viewerIndex].url}
            alt={`Photo ${viewerIndex + 1} du profil`}
            className='max-h-[86vh] max-w-[88vw] object-contain'
            onClick={event => event.stopPropagation()}
          />

          {photos.length > 1 && (
            <button
              type='button'
              className='absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white hover:bg-white/20 sm:right-6'
              onClick={event => {
                event.stopPropagation()
                setViewerIndex((viewerIndex + 1) % photos.length)
              }}
              aria-label='Photo suivante'
            >
              <ChevronRight className='h-6 w-6' />
            </button>
          )}
        </div>
      )}
    </>
  )
}
