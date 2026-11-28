'use client'
import React, { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadProfilePhoto } from '@/lib/profile-photo-upload'

interface UserPhoto {
  id: string
  url: string
  is_primary: boolean
}

interface UserPhotosManagerProps {
  photos: UserPhoto[]
  userId: string
  maxPhotos?: number
  /** Historical Blob gallery only: it remains visible and removable, but new uploads use PrivateAlbumManager. */
  allowUpload?: boolean
}

export const UserPhotosManager: React.FC<UserPhotosManagerProps> = ({
  photos: initialPhotos,
  userId,
  maxPhotos = 10,
  allowUpload = true
}) => {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<UserPhoto[]>(initialPhotos)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setError(null)
      setMessage(null)
      setUploading(true)
      setUploadProgress(0)
      try {
        const data = await uploadProfilePhoto({
          file,
          purpose: 'gallery',
          userId,
          onProgress: setUploadProgress
        })
        setPhotos(p => [
          ...p,
          { id: data.id || data.url, url: data.url, is_primary: false }
        ])
        setMessage('Photo sauvegardée')
        // Tabs unmount their inactive panels. Refresh the RSC payload so this
        // committed photo remains present when the Photos tab mounts again.
        router.refresh()
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "La photo n'a pas pu être envoyée."
        )
      } finally {
        setUploading(false)
        setUploadProgress(0)
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
      <p className='mb-3 text-sm text-[#c9c7c2]'>Galerie · {photos.length} / {maxPhotos} photos. Pour préparer le parrainage, ajoutez au moins trois photos différentes et gardez votre profil à jour.</p>
      {message && (
        <div role='status' className='mb-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 font-medium text-emerald-100'>{message}</div>
      )}
      {error && (
        <div role='alert' className='mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-100'>{error}</div>
      )}
      {uploading && (
        <div className='mb-3 text-sm font-medium text-[#94ffc9]'>Envoi de la photo{uploadProgress > 0 ? ` : ${uploadProgress} %` : '...'}</div>
      )}
      <div className='grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3'>
        {photos.map(photo => (
          <div
            key={photo.id}
            className='group relative aspect-square w-full overflow-hidden rounded border border-[#111821] bg-[#04070b]'
          >
            <img
              src={photo.url}
              alt='Photo utilisateur'
              className='object-cover w-full h-full'
            />
            <button
              type='button'
              className='absolute right-1 top-1 grid size-11 place-items-center rounded-full border border-white/20 bg-[#04070b]/90 text-[#ecebe7] hover:bg-[#a7101c] focus-visible:ring-2'
              onClick={() => handleDelete(photo.id)}
              aria-label='Supprimer la photo'
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
        {allowUpload && photos.length < maxPhotos && (
          <button
            type='button'
            className='flex aspect-square w-full items-center justify-center rounded border-2 border-dashed border-[#c9c7c2]/40 bg-[#04070b] transition-colors hover:border-[#c1121f]'
            onClick={() => fileInputRef.current?.click()}
            title='Ajouter une photo'
            disabled={isPending || uploading}
          >
            <span className='text-3xl text-[#c9c7c2]'>+</span>
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
      {allowUpload ? <><p className='text-sm text-[#c9c7c2]'>Vous pouvez ajouter jusqu'à {maxPhotos} photos.</p><p className='mt-1 text-sm font-medium text-[#c9c7c2]'>Formats acceptés : JPG, PNG ou WebP. Taille maximale : 8 Mo par photo. HEIC iPhone : exportez la photo en JPG.</p></> : <p className='text-sm text-[#c9c7c2]'>Ces photos utilisent l’ancien hébergement. Les liens déjà partagés peuvent encore fonctionner.</p>}
    </div>
  )
}
