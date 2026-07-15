'use client'

import { useRef, useState } from 'react'
import { Loader2, Trash2, Upload, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProfileVideoManager ({ initialUrl }: { initialUrl?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initialUrl || '')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function uploadVideo (file?: File) {
    if (!file) return
    setPending(true)
    setMessage('')

    const formData = new FormData()
    formData.append('video', file)

    try {
      const response = await fetch('/api/profile/video', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Échec de l'envoi")
      setUrl(result.url)
      setMessage('Vidéo de présentation enregistrée.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Échec de l'envoi")
    } finally {
      setPending(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function deleteVideo () {
    setPending(true)
    setMessage('')
    try {
      const response = await fetch('/api/profile/video', { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Échec de la suppression')
      setUrl('')
      setMessage('Vidéo supprimée.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Échec de la suppression')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className='mt-6 border-t border-white/10 pt-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h3 className='flex items-center gap-2 text-lg font-black'>
            <Video className='h-5 w-5 text-[#94ffc9]' />
            Vidéo de présentation
          </h3>
          <p className='mt-1 text-sm leading-6 text-white/58'>MP4 ou WebM, 50 Mo maximum.</p>
        </div>
        <div className='flex gap-2'>
          <Button type='button' variant='outline' onClick={() => inputRef.current?.click()} disabled={pending}>
            {pending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Upload className='mr-2 h-4 w-4' />}
            {url ? 'Remplacer' : 'Ajouter'}
          </Button>
          {url && (
            <Button type='button' variant='outline' size='icon' onClick={deleteVideo} disabled={pending} title='Supprimer la vidéo'>
              <Trash2 className='h-4 w-4' />
              <span className='sr-only'>Supprimer la vidéo</span>
            </Button>
          )}
          <input
            ref={inputRef}
            type='file'
            accept='video/mp4,video/webm'
            className='hidden'
            onChange={event => uploadVideo(event.target.files?.[0])}
          />
        </div>
      </div>

      {url && (
        <video className='mt-4 aspect-video w-full max-w-2xl rounded-xl bg-black object-contain' controls playsInline preload='metadata'>
          <source src={url} />
          Votre navigateur ne peut pas lire cette vidéo.
        </video>
      )}
      {message && <p className='mt-3 text-sm text-white/72' role='status'>{message}</p>}
    </section>
  )
}
