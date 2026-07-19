'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Camera, Images, Plus, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import Image from 'next/image'
import { defaultMemberImage } from '@/lib/default-member-image'
import { validateImageUploadFile } from '@/lib/upload-validation'

export function UserProfileEditor ({
  user,
  onSave
}: {
  user: any
  onSave: (data: any) => void
}) {
  const router = useRouter()
  const { update } = useSession()
  const [form, setForm] = useState(() => {
    let interests = user.interests
    if (typeof interests === 'string') {
      try {
        interests = interests ? JSON.parse(interests) : []
      } catch {
        interests = []
      }
    }
    if (!Array.isArray(interests)) {
      interests = []
    }
    return {
      name: user.name || '',
      status: user.status || '',
      bio: user.bio || '',
      location: user.location || '',
      age: user.age || '',
      orientation: user.orientation || '',
      gender: user.gender || '',
      birthday: user.birthday || '',
      interests,
      avatar: user.avatar || '',
      display_profile:
        typeof user.display_profile === 'boolean' ? user.display_profile : true // default true
    }
  })
  const [saving, setSaving] = useState(false)
  const [newInterest, setNewInterest] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleChange (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSelectChange (name: string, value: string) {
    setForm({ ...form, [name]: value })
  }

  function handleAddInterest () {
    if (newInterest.trim() && !form.interests.includes(newInterest.trim())) {
      setForm({ ...form, interests: [...form.interests, newInterest.trim()] })
      setNewInterest('')
    }
  }

  function handleRemoveInterest (interest: string) {
    setForm({
      ...form,
      interests: form.interests.filter((i: string) => i !== interest)
    })
  }

  async function handleImageChange (e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadMessage(null)
    setUploadError(null)
    const validation = await validateImageUploadFile(file)
    if (!validation.ok) {
      setUploadError(validation.error)
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('purpose', 'avatar')
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData
      })
      const result = await response.json()
      if (!response.ok || !result?.url) {
        throw new Error(result?.error || "La photo n'a pas pu être envoyée.")
      }

      setForm(current => ({ ...current, avatar: result.url }))
      await update()
      setUploadMessage('Photo enregistrée')
      router.refresh()
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "La photo n'a pas pu être envoyée."
      )
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleRemoveImage () {
    setUploading(true)
    setUploadMessage(null)
    setUploadError(null)
    try {
      const response = await fetch('/api/photos/upload', { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "L'avatar n'a pas pu être supprimé.")
      }
      setForm(current => ({ ...current, avatar: '' }))
      await update()
      setUploadMessage('Photo supprimée. Avatar proposé rétabli.')
      router.refresh()
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "L'avatar n'a pas pu être supprimé."
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit (e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    await update()
    setSaving(false)
    router.refresh()
  }

  return (
    <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-6 text-white'>
      <form onSubmit={handleSubmit} className='space-y-6'>
        <div className='grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]'>
          <div className='space-y-4'>
            <div>
              <h3 className='text-xl font-black'>Identité visible</h3>
              <p className='mt-2 text-sm leading-6 text-white/58'>
                Ces informations structurent la découverte et la compatibilité.
              </p>
            </div>
            <div className='relative mx-auto w-fit'>
            <button
              type='button'
              onClick={handleRemoveImage}
              disabled={uploading}
              className='absolute bottom-3 right-3 z-10 rounded-full bg-red-500 p-2 text-white'
              style={{ display: form.avatar.length > 0 ? 'block' : 'none' }}
              aria-label='Retirer la photo'
            >
              <X className='h-4 w-4' />
            </button>
            <div className='h-48 w-48 overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-lg shadow-purple-900/30'>
              <Image
                src={defaultMemberImage({
                  avatar: form.avatar,
                  status: form.status,
                  gender: form.gender
                })}
                alt={form.name}
                width={200}
                height={200}
                className='h-full w-full object-cover '
              />
            </div>
          </div>
          <Input
            type='file'
            accept='image/jpeg,image/png,image/webp'
            onChange={handleImageChange}
            disabled={uploading}
            className='border-white/10 bg-white/[0.06] text-white file:text-white'
          />
          <p className='text-xs font-medium leading-5 text-white/65'>
            Formats acceptés : JPG, PNG ou WebP. Taille maximale : 8 Mo par photo.
          </p>
          {uploading && (
            <p className='text-sm font-medium text-[#94ffc9]'>Envoi de la photo...</p>
          )}
          {uploadMessage && (
            <p role='status' className='text-sm font-medium text-[#94ffc9]'>
              {uploadMessage}
            </p>
          )}
          {uploadError && (
            <p role='alert' className='rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100'>
              {uploadError}
            </p>
          )}
          <p className='flex items-center gap-2 text-xs text-white/48'>
            <Camera className='h-3.5 w-3.5' />
            Une photo claire augmente fortement les demandes.
          </p>
          <Button asChild variant='outline' className='w-full border-white/12 bg-white/[0.04]'>
            <Link href='/profile?tab=photos'>
              <Images className='mr-2 h-4 w-4' />
              Ajouter d&apos;autres photos
            </Link>
          </Button>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
          {/* Admin-only: Switch to control display_profile */}
          {user.role === 'admin' && (
            <div className='flex items-center gap-2 max-w-sm'>
              <label htmlFor='display_profile' className='font-medium'>
                Afficher mon profil dans Découvrir
              </label>
              <input
                id='display_profile'
                type='checkbox'
                checked={form.display_profile}
                onChange={e =>
                  setForm({ ...form, display_profile: e.target.checked })
                }
                className='accent-purple-600 scale-125'
              />
            </div>
          )}
          <Input
            name='name'
            value={form.name}
            onChange={handleChange}
            className='h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/40'
            placeholder='Nom public'
          />
          <div>
            <Select
              value={form.status}
              onValueChange={value => handleSelectChange('status', value)}
            >
              <SelectTrigger id='status' className='h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white'>
                <SelectValue placeholder='Statut relationnel' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='single_male'>Homme seul</SelectItem>
                <SelectItem value='single_female'>Femme seule</SelectItem>
                <SelectItem value='couple'>Couple</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='w-full max-w-sm'>
            <Select
              value={form.gender}
              onValueChange={value => handleSelectChange('gender', value)}
            >
              <SelectTrigger id='gender' className='h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white'>
                <SelectValue placeholder='Sélectionner le genre' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='male'>Homme</SelectItem>
                <SelectItem value='female'>Femme</SelectItem>
                <SelectItem value='other'>Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            name='birthday'
            type='date'
            value={form.birthday}
            onChange={handleChange}
            className='h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white'
            placeholder='Date de naissance'
          />
          <Input
            name='location'
            value={form.location}
            onChange={handleChange}
            className='h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/40'
            placeholder='Ville ou quartier'
          />
          <Input
            name='age'
            type='number'
            value={form.age}
            onChange={handleChange}
            className='h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/40'
            placeholder='Âge'
            min={18}
          />
          <div className='w-full max-w-sm'>
            <Select
              value={form.orientation}
              onValueChange={value => handleSelectChange('orientation', value)}
            >
              <SelectTrigger id='orientation' className='h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white'>
                <SelectValue placeholder="Sélectionner l'orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='hetero'>Hétérosexuel(le)</SelectItem>
                <SelectItem value='homo'>Homosexuel(le)</SelectItem>
                <SelectItem value='bi'>Bisexuel(le)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            name='bio'
            value={form.bio}
            onChange={handleChange}
            className='min-h-32 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/40 sm:col-span-2'
            placeholder='À propos de moi, mes envies, mon style de rencontre...'
            rows={4}
          />
          <div className='sm:col-span-2'>
            <h4 className='mb-2 font-black'>Centres d’intérêt matching</h4>
            <div className='flex flex-wrap gap-2 mb-2'>
              {form.interests.map((interest: string) => (
                <span
                  key={interest}
                  className='inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm'
                >
                  {interest}
                  <button
                    type='button'
                    onClick={() => handleRemoveInterest(interest)}
                    className='ml-2 text-red-200'
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className='flex gap-2'>
              <Input
                value={newInterest}
                onChange={e => setNewInterest(e.target.value)}
                placeholder='Jacuzzi, cocktails, champagne...'
                className='h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/40'
              />
              <Button
                type='button'
                onClick={handleAddInterest}
                variant='outline'
                className='h-12 rounded-2xl border-white/12 bg-white/[0.04]'
              >
                <Plus className='mr-2 h-4 w-4' />
                Ajouter
              </Button>
            </div>
          </div>
          </div>
        </div>
        <div className='flex justify-end'>
          <Button type='submit' disabled={saving} className='rounded-2xl bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>
            <Save className='mr-2 h-4 w-4' />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  )
}
