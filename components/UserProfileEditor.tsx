'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Plus, Save, X } from 'lucide-react'
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

export function UserProfileEditor ({
  user,
  onSave,
  onUploadImage
}: {
  user: any
  onSave: (data: any) => void
  onUploadImage: (formData: FormData) => Promise<any>
}) {
  const router = useRouter()
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
    if (file) {
      setUploading(true)
      const formData = new FormData()
      formData.append('profileImage', file)
      const result = await onUploadImage(formData)
      if (result?.url) {
        setForm(f => ({ ...f, avatar: result.url }))
      }
      setUploading(false)
    }
  }

  async function handleSubmit (e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
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
              onClick={() => setForm({ ...form, avatar: '' })}
              className='absolute bottom-3 right-3 z-10 rounded-full bg-red-500 p-2 text-white'
              style={{ display: form.avatar.length > 0 ? 'block' : 'none' }}
              aria-label='Retirer la photo'
            >
              <X className='h-4 w-4' />
            </button>
            <div className='h-48 w-48 overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-lg shadow-purple-900/30'>
              <Image
                src={form.avatar || '/logo-web-love-hotel.png'}
                alt={form.name}
                width={200}
                height={200}
                className='h-full w-full object-cover '
              />
            </div>
          </div>
          <Input
            type='file'
            accept='image/*'
            onChange={handleImageChange}
            disabled={uploading}
            className='border-white/10 bg-white/[0.06] text-white file:text-white'
          />
          <p className='flex items-center gap-2 text-xs text-white/48'>
            <Camera className='h-3.5 w-3.5' />
            Une photo claire augmente fortement les demandes.
          </p>
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
