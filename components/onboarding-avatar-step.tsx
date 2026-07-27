'use client'

import { useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import { ArrowRight, Camera, CheckCircle2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { defaultMemberImage } from '@/lib/default-member-image'
import { uploadProfilePhoto } from '@/lib/profile-photo-upload'

export function OnboardingAvatarStep({
  status,
  gender,
  avatarUrl,
  onAvatarSaved,
  onContinue
}: {
  status: string
  gender: string
  avatarUrl: string
  onAvatarSaved: (url: string) => void
  onContinue: () => void
}) {
  const { data: session, update } = useSession()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(Boolean(avatarUrl))

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setSaved(false)
    setUploading(true)
    setProgress(0)
    try {
      const userId = String(session?.user?.id || '')
      if (!userId) throw new Error('Votre session a expiré. Reconnectez-vous.')
      const result = await uploadProfilePhoto({
        file,
        purpose: 'avatar',
        userId,
        onProgress: setProgress
      })
      onAvatarSaved(result.url)
      await update()
      setSaved(true)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "La photo n'a pas pu être envoyée.")
    } finally {
      setUploading(false)
      setProgress(0)
      event.target.value = ''
    }
  }

  return (
    <div className='space-y-5'>
      <div className='text-center'>
        <h2 className='text-xl font-black'>Ajoutez votre photo principale</h2>
        <p className='mt-2 text-sm leading-6 text-purple-100/75'>
          Fortement recommandée : une photo personnelle claire rend votre profil plus visible et rassure la communauté.
        </p>
      </div>
      <div className='mx-auto h-52 w-52 overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-xl shadow-black/20'>
        <Image
          src={defaultMemberImage({ avatar: avatarUrl, status, gender })}
          alt='Aperçu de votre photo de profil'
          width={208}
          height={208}
          className='h-full w-full object-cover'
        />
      </div>
      <Input
        type='file'
        accept='image/jpeg,image/png,image/webp'
        onChange={uploadAvatar}
        disabled={uploading}
        className='border-white/10 bg-purple-900/20 text-white file:text-white'
      />
      <p className='text-center text-xs leading-5 text-purple-100/65'>JPG, PNG ou WebP. Taille maximale : 8 Mo. Les photos HEIC d’iPhone doivent être exportées en JPG.</p>
      {uploading && <p role='status' className='text-center text-sm font-semibold text-[#94ffc9]'>Envoi de la photo{progress > 0 ? ` : ${progress} %` : '...'}</p>}
      {saved && (
        <p role='status' className='flex items-center justify-center gap-2 text-sm font-semibold text-[#94ffc9]'>
          <CheckCircle2 className='h-4 w-4' /> Photo enregistrée
        </p>
      )}
      {error && <p role='alert' className='rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100'>{error}</p>}
      <Button type='button' variant='outline' onClick={onContinue} disabled={uploading} className='w-full border-white/15 bg-white/[0.04] text-white'>
        <Camera className='mr-2 h-4 w-4' />
        Continuer avec l’avatar proposé
        <ArrowRight className='ml-2 h-4 w-4' />
      </Button>
      <p className='text-center text-xs text-purple-100/55'>La photo reste facultative : utilisez simplement « Suivant » pour continuer.</p>
    </div>
  )
}
