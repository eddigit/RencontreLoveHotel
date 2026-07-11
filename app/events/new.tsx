'use client'

import { useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ImageIcon, MapPin, Upload, UsersRound } from 'lucide-react'
import { createEvent } from '@/actions/event-actions'
import MainLayout from '@/components/layout/main-layout'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'

type Venue = 'pigalle' | 'chatelet'
type ExperienceType = 'jacuzzi' | 'open_curtains'

const experienceCapacityLimit: Record<ExperienceType, number> = {
  jacuzzi: 4,
  open_curtains: 3
}

const defaultExperienceImages: Record<ExperienceType, string> = {
  jacuzzi: '/apero-jacuzzi-rencontre.jpg',
  open_curtains: '/rideaux-ouverts-rencontre.jpg'
}

const experienceFormats = [
  {
    value: 'jacuzzi' as const,
    label: 'Apéro jacuzzi',
    detail: '2 à 4 couples',
    description: 'Un petit groupe pour faire connaissance autour du jacuzzi.',
    image: defaultExperienceImages.jacuzzi
  },
  {
    value: 'open_curtains' as const,
    label: 'Rideaux ouverts',
    detail: '2 ou 3 chambres',
    description: 'Une rencontre entre chambres, dans un cadre annoncé à l’avance.',
    image: defaultExperienceImages.open_curtains
  }
]

export default function CreateEventPage () {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: '',
    venue: 'pigalle' as Venue,
    location: 'Love Hotel Pigalle',
    date: '',
    image: '',
    category: 'jacuzzi',
    experience_type: 'jacuzzi' as ExperienceType,
    description: '',
    max_participants: 4,
    price: 0,
    prix_personne_seule: 0,
    prix_couple: 0,
    payment_mode: 'sur_place' as 'sur_place' | 'online',
    conditions: ''
  })
  const [loading, setLoading] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [error, setError] = useState('')

  const handleChange = (name: string, value: string | number) => {
    const nextForm = { ...form, [name]: value }
    if (name === 'venue') {
      nextForm.location = value === 'chatelet' ? 'Love Hotel Châtelet' : 'Love Hotel Pigalle'
    }
    if (name === 'experience_type') {
      const nextType = value as ExperienceType
      nextForm.category = nextType
      nextForm.max_participants = experienceCapacityLimit[nextType]
    }
    if (name === 'max_participants') {
      const maxCapacity = experienceCapacityLimit[form.experience_type]
      nextForm.max_participants = Math.min(Math.max(Number(value) || 2, 2), maxCapacity)
    }
    setForm(nextForm)
  }

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : '')
  }

  const goNext = () => {
    setError('')
    if (step === 2 && !form.date) {
      setError('Choisissez la date et l’heure de l’événement.')
      return
    }
    setStep(current => Math.min(3, current + 1))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Donnez un titre à votre événement.')
      return
    }
    if (!user?.id) {
      setError('Vous devez être connecté pour créer une expérience.')
      return
    }

    setLoading(true)
    setError('')
    try {
      let image = defaultExperienceImages[form.experience_type]
      if (coverFile) {
        setUploadingCover(true)
        const uploadData = new FormData()
        uploadData.set('photo', coverFile)
        const uploadResponse = await fetch('/api/events/upload-cover', {
          method: 'POST',
          body: uploadData
        })
        const uploadResult = await uploadResponse.json()
        if (!uploadResponse.ok || !uploadResult.url) {
          throw new Error(uploadResult.error || "La couverture n'a pas pu être téléversée.")
        }
        image = uploadResult.url
      }

      await createEvent({
        ...form,
        image,
        creator_id: user.id,
        publication_status: 'pending_review',
        created_by_role: user.role === 'admin' ? 'admin' : 'member'
      })
      router.push('/events')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création de l'expérience.")
    } finally {
      setUploadingCover(false)
      setLoading(false)
    }
  }

  return (
    <MainLayout user={user}>
      <LhrV2Shell
        user={user}
        eyebrow='Communauté'
        title='Créer une expérience'
        subtitle='Trois étapes, puis l’équipe valide votre proposition.'
      >
        <form onSubmit={handleSubmit} className='mx-auto max-w-4xl'>
          <div className='mb-5 flex items-center gap-2' aria-label={`Étape ${step} sur 3`}>
            {[1, 2, 3].map(item => (
              <div key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? 'bg-[#ff4fa3]' : 'bg-white/10'}`} />
            ))}
          </div>

          <section className='rounded-lg border border-white/10 bg-white/[0.045] p-4 md:p-6'>
            {step === 1 && (
              <div>
                <p className='text-xs font-bold uppercase text-[#ff8cc8]'>Étape 1 sur 3</p>
                <h2 className='mt-1 text-xl font-black'>Choisissez votre format</h2>
                <div className='mt-5 grid gap-4 md:grid-cols-2'>
                  {experienceFormats.map(format => {
                    const selected = form.experience_type === format.value
                    return (
                      <button
                        key={format.value}
                        type='button'
                        onClick={() => handleChange('experience_type', format.value)}
                        className={`overflow-hidden rounded-lg border text-left transition ${selected ? 'border-[#ff8cc8] ring-2 ring-[#ff4fa3]/30' : 'border-white/10 hover:border-white/30'}`}
                      >
                        <div className='relative aspect-[16/8] overflow-hidden'>
                          <img src={format.image} alt={format.label} className='h-full w-full object-cover' />
                          {selected && <span className='absolute right-3 top-3 rounded-full bg-[#ff4fa3] p-1.5'><Check className='h-4 w-4 text-white' /></span>}
                        </div>
                        <div className='p-4'>
                          <div className='flex items-center justify-between gap-3'>
                            <strong>{format.label}</strong>
                            <span className='text-xs text-[#94ffc9]'>{format.detail}</span>
                          </div>
                          <p className='mt-2 text-sm text-white/60'>{format.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className='text-xs font-bold uppercase text-[#ff8cc8]'>Étape 2 sur 3</p>
                <h2 className='mt-1 text-xl font-black'>Quand et où ?</h2>
                <div className='mt-5 grid gap-5 md:grid-cols-3'>
                  <div className='space-y-2'>
                    <Label className='flex items-center gap-2 text-white/80'><MapPin className='h-4 w-4' /> Établissement</Label>
                    <Select value={form.venue} onValueChange={value => handleChange('venue', value)}>
                      <SelectTrigger className='border-white/10 bg-black/20 text-white'><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value='pigalle'>Pigalle</SelectItem><SelectItem value='chatelet'>Châtelet</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='date' className='flex items-center gap-2 text-white/80'><CalendarDays className='h-4 w-4' /> Date et heure</Label>
                    <Input id='date' type='datetime-local' value={form.date} onChange={e => handleChange('date', e.target.value)} className='border-white/10 bg-black/20 text-white' required />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='max_participants' className='flex items-center gap-2 text-white/80'><UsersRound className='h-4 w-4' /> Capacité</Label>
                    <Select value={String(form.max_participants)} onValueChange={value => handleChange('max_participants', Number(value))}>
                      <SelectTrigger className='border-white/10 bg-black/20 text-white'><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: experienceCapacityLimit[form.experience_type] - 1 }, (_, index) => index + 2).map(value => (
                          <SelectItem key={value} value={String(value)}>{value} {form.experience_type === 'jacuzzi' ? 'couples' : 'chambres'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className='text-xs font-bold uppercase text-[#ff8cc8]'>Étape 3 sur 3</p>
                <h2 className='mt-1 text-xl font-black'>Présentez votre invitation</h2>
                <div className='mt-5 space-y-5'>
                  <div className='space-y-2'>
                    <Label htmlFor='title' className='text-white/80'>Titre</Label>
                    <Input id='title' value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder={form.experience_type === 'jacuzzi' ? 'Apéro jacuzzi jeudi soir' : 'Rideaux ouverts vendredi à Pigalle'} className='border-white/10 bg-black/20 text-white placeholder:text-white/35' required />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='description' className='text-white/80'>Votre invitation</Label>
                    <Textarea id='description' value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder='Décrivez simplement l’ambiance et les profils que vous souhaitez rencontrer.' rows={4} className='border-white/10 bg-black/20 text-white placeholder:text-white/35' />
                  </div>
                  <div className='grid gap-4 md:grid-cols-[180px_1fr] md:items-center'>
                    <img src={coverPreview || defaultExperienceImages[form.experience_type]} alt='Aperçu de la couverture' className='aspect-[16/9] w-full rounded-lg object-cover' />
                    <div className='space-y-2'>
                      <Label htmlFor='event-cover' className='flex items-center gap-2 text-white/80'><ImageIcon className='h-4 w-4' /> Changer l’image (facultatif)</Label>
                      <Input id='event-cover' type='file' accept='image/jpeg,image/png,image/webp' onChange={handleCoverChange} className='border-white/10 bg-black/20 text-white file:mr-3 file:border-0 file:bg-[#ff3b8b] file:px-3 file:py-2 file:text-white' />
                      <p className='text-xs text-white/50'>Sinon, l’image du format choisi sera utilisée automatiquement. JPG, PNG ou WebP, 8 Mo maximum.</p>
                    </div>
                  </div>

                  <details className='rounded-lg border border-white/10 bg-black/10 p-4'>
                    <summary className='cursor-pointer font-semibold text-white/80'>Options facultatives</summary>
                    <div className='mt-4 grid gap-4 md:grid-cols-3'>
                      <div className='space-y-2'><Label htmlFor='prix_personne_seule'>Prix personne seule (€)</Label><Input id='prix_personne_seule' type='number' min='0' step='0.01' value={form.prix_personne_seule} onChange={e => handleChange('prix_personne_seule', Number(e.target.value))} className='border-white/10 bg-black/20 text-white' /></div>
                      <div className='space-y-2'><Label htmlFor='prix_couple'>Prix couple (€)</Label><Input id='prix_couple' type='number' min='0' step='0.01' value={form.prix_couple} onChange={e => handleChange('prix_couple', Number(e.target.value))} className='border-white/10 bg-black/20 text-white' /></div>
                      <div className='space-y-2'><Label htmlFor='price'>Prix global (€)</Label><Input id='price' type='number' min='0' step='0.01' value={form.price} onChange={e => handleChange('price', Number(e.target.value))} className='border-white/10 bg-black/20 text-white' /></div>
                      <div className='space-y-2 md:col-span-3'><Label htmlFor='conditions'>Conditions particulières</Label><Textarea id='conditions' value={form.conditions} onChange={e => handleChange('conditions', e.target.value)} rows={3} className='border-white/10 bg-black/20 text-white' /></div>
                    </div>
                  </details>

                  <p className='text-sm text-white/55'>Votre proposition est relue par l’équipe avant publication. Vous recevrez la décision dans vos notifications.</p>
                </div>
              </div>
            )}

            {error && <div className='mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100'>{error}</div>}

            <div className='mt-6 flex items-center justify-between border-t border-white/10 pt-5'>
              <Button type='button' variant='outline' onClick={() => step === 1 ? router.push('/events') : setStep(current => current - 1)} className='border-white/15 bg-white/5 text-white'>
                <ArrowLeft className='mr-2 h-4 w-4' /> {step === 1 ? 'Annuler' : 'Retour'}
              </Button>
              {step < 3 ? (
                <Button type='button' onClick={goNext} className='bg-[#ff4fa3] text-white'>Continuer <ArrowRight className='ml-2 h-4 w-4' /></Button>
              ) : (
                <Button type='submit' disabled={loading || uploadingCover} className='bg-[#ff4fa3] text-white'>
                  <Upload className='mr-2 h-4 w-4' /> {uploadingCover ? 'Image en cours...' : loading ? 'Envoi...' : 'Proposer l’événement'}
                </Button>
              )}
            </div>
          </section>
        </form>
      </LhrV2Shell>
    </MainLayout>
  )
}
