'use client'

import { ChangeEvent, useId, useState } from 'react'
import { ImageIcon, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getEventImage } from '@/lib/event-presentation'

type EventPhotoFieldProps = {
  value: string
  onChange: (value: string) => void
  category?: string | null
  experienceType?: string | null
  label?: string
}

export function EventPhotoField({
  value,
  onChange,
  category,
  experienceType,
  label = "Photo de l'événement"
}: EventPhotoFieldProps) {
  const inputId = useId()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const preview = getEventImage({
    image: value,
    category,
    experience_type: experienceType
  })

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.set('photo', file)

      const response = await fetch('/api/events/photos/upload', {
        method: 'POST',
        body: formData
      })
      const result = await response.json()

      if (!response.ok || !result.url) {
        throw new Error(result.error || "La photo n'a pas pu être envoyée.")
      }

      onChange(result.url)
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "La photo n'a pas pu être envoyée."
      )
    } finally {
      event.target.value = ''
      setUploading(false)
    }
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <label htmlFor={inputId} className='text-sm font-medium text-white/80'>
          {label}
        </label>
        {value && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => onChange('')}
            className='h-8 gap-2 text-white/70 hover:bg-white/10 hover:text-white'
          >
            <X className='h-4 w-4' />
            Retirer
          </Button>
        )}
      </div>

      <div className='grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[160px,minmax(0,1fr)]'>
        <div className='relative aspect-[4/3] overflow-hidden rounded-lg bg-white/5'>
          <img
            src={preview}
            alt='Aperçu de la photo événement'
            className='h-full w-full object-cover'
          />
          {!value && (
            <div className='absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white'>
              Visuel par défaut
            </div>
          )}
        </div>

        <div className='flex min-w-0 flex-col justify-center gap-3'>
          <div>
            <div className='flex items-center gap-2 text-sm font-semibold text-white'>
              <ImageIcon className='h-4 w-4 text-[#ff8cc8]' />
              Aperçu avant publication
            </div>
            <p className='mt-1 text-xs leading-5 text-white/55'>
              JPG, PNG ou WebP. Taille maximum : 8 Mo.
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={uploading}
              className='border-white/15 bg-white/5 text-white hover:bg-white/10'
              onClick={() => document.getElementById(inputId)?.click()}
            >
              {uploading ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Upload className='mr-2 h-4 w-4' />
              )}
              {uploading ? 'Envoi...' : 'Choisir une photo'}
            </Button>
            <input
              id={inputId}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              className='sr-only'
              disabled={uploading}
              onChange={handleFileChange}
            />
          </div>

          {error && (
            <div className='rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100'>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
