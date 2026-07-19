'use client'
import React, { useRef, useState, useTransition } from 'react'

interface UserPhoto {
  id: string
  url: string
  is_primary: boolean
}

interface UserPhotosManagerProps {
  photos: UserPhoto[]
  maxPhotos?: number
}

export const UserPhotosManager: React.FC<UserPhotosManagerProps> = ({
  photos: initialPhotos,
  maxPhotos = 10
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<UserPhoto[]>(initialPhotos)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUploading(true)
      setError(null)
      setMessage(null)
      try {
        const formData = new FormData()
        formData.append('photo', file)
        formData.append('purpose', 'gallery')
        const res = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (!res.ok || !data.success || !data.url) {
          throw new Error(data.error || "Erreur lors de l'envoi")
        }
        setPhotos(p => [
          ...p,
          { id: data.id || data.url, url: data.url, is_primary: false }
        ])
        setMessage('Photo sauvegardée')
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "La photo n'a pas pu être envoyée."
        )
      } finally {
        setUploading(false)
        e.target.value = ''
      }
    }
  }

  const handleDelete = async (photoId: string) => {
    startTransition(async () => {
      const res = await fetch('/api/photos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId })
      })
      const data = await res.json()
      if (data.success) {
        setPhotos(p => p.filter(photo => photo.id !== photoId))
      } else {
        alert(data.error || 'Erreur lors de la suppression')
      }
    })
  }

  return (
    <div>
      {message && (
        <div role='status' className='mb-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 font-medium text-emerald-100'>{message}</div>
      )}
      {error && (
        <div role='alert' className='mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-100'>{error}</div>
      )}
      {uploading && (
        <div className='mb-3 text-sm font-medium text-[#94ffc9]'>Envoi de la photo...</div>
      )}
      <div className='flex flex-wrap gap-4 mb-4'>
        {photos.map(photo => (
          <div
            key={photo.id}
            className='relative w-32 h-32 border rounded overflow-hidden group'
          >
            <img
              src={photo.url}
              alt='Photo utilisateur'
              className='object-cover w-full h-full'
            />
            <button
              type='button'
              className='absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-red-600 hover:bg-opacity-100 transition-opacity opacity-0 group-hover:opacity-100'
              onClick={() => handleDelete(photo.id)}
              title='Supprimer la photo'
              disabled={isPending}
            >
              ✕
            </button>
            {photo.is_primary && (
              <span className='absolute bottom-1 left-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded'>
                Principale
              </span>
            )}
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            type='button'
            className='w-32 h-32 border-2 border-dashed border-gray-300 flex items-center justify-center rounded hover:border-blue-400 transition-colors'
            onClick={() => fileInputRef.current?.click()}
            title='Ajouter une photo'
            disabled={isPending || uploading}
          >
            <span className='text-3xl text-gray-400'>+</span>
            <input
              type='file'
              accept='image/jpeg,image/png,image/webp'
              ref={fileInputRef}
              className='hidden'
              onChange={handleFileChange}
              disabled={isPending || uploading}
            />
          </button>
        )}
      </div>
      <p className='text-sm text-gray-500'>
        Vous pouvez ajouter jusqu'à {maxPhotos} photos.
      </p>
    </div>
  )
}
