'use client'
import React, { useEffect, useState } from 'react'

interface UserPhoto {
  id: string
  url: string
  is_primary: boolean
}

export function UserGallery ({ userId }: { userId: string }) {
  const [photos, setPhotos] = useState<UserPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        // Vérifier que userId est un UUID valide
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!userId || !uuidRegex.test(userId)) {
          console.error('Invalid userId format:', userId)
          setPhotos([])
          setLoading(false)
          return
        }

        const response = await fetch(`/api/photos/list?userId=${userId}`)

        if (!response.ok) {
          console.error('API response error:', response.status, response.statusText)
          setPhotos([])
          setLoading(false)
          return
        }

        const data = await response.json()

        if (data.error) {
          console.error('API error:', data.error, data.details)
          setPhotos([])
        } else {
          setPhotos(data.photos || [])
        }
      } catch (error) {
        console.error('Error fetching photos:', error)
        setPhotos([])
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [userId])

  if (loading) return <div>Chargement de la galerie...</div>
  if (!photos.length) return <div>Aucune photo dans la galerie.</div>

  return (
    <>
      <div className='flex flex-wrap gap-4'>
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            className='w-32 h-32 border rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition'
            onClick={() => {
              setViewerIndex(idx)
              setViewerOpen(true)
            }}
          >
            <img
              src={photo.url}
              alt='Photo galerie utilisateur'
              className='object-cover w-full h-full'
            />
          </div>
        ))}
      </div>
      {viewerOpen && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80'
          onClick={() => setViewerOpen(false)}
        >
          <button
            className='absolute top-4 right-4 text-white text-3xl font-bold bg-black/40 rounded-full px-3 py-1 hover:bg-black/70 transition'
            onClick={e => {
              e.stopPropagation()
              setViewerOpen(false)
            }}
            aria-label='Fermer'
          >
            ×
          </button>
          <button
            className='absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl font-bold bg-black/40 rounded-full px-3 py-1 hover:bg-black/70 transition'
            onClick={e => {
              e.stopPropagation()
              setViewerIndex((viewerIndex - 1 + photos.length) % photos.length)
            }}
            aria-label='Précédent'
          >
            ‹
          </button>
          <img
            src={photos[viewerIndex].url}
            alt='Photo agrandie'
            className='max-h-[80vh] max-w-[90vw] rounded shadow-lg border-4 border-white'
            onClick={e => e.stopPropagation()}
          />
          <button
            className='absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl font-bold bg-black/40 rounded-full px-3 py-1 hover:bg-black/70 transition'
            onClick={e => {
              e.stopPropagation()
              setViewerIndex((viewerIndex + 1) % photos.length)
            }}
            aria-label='Suivant'
          >
            ›
          </button>
        </div>
      )}
    </>
  )
}
