'use client'

import Image from 'next/image'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Check, ImageIcon, MapPin, Send, UsersRound } from 'lucide-react'
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

const capacityLimits: Record<ExperienceType, number> = {
  jacuzzi: 4,
  open_curtains: 3
}

const defaultImages: Record<ExperienceType, string> = {
  jacuzzi: '/apero-jacuzzi-rencontre.jpg',
  open_curtains: '/rideaux-ouverts-rencontre.jpg'
}

const formats = [
  {
    value: 'jacuzzi' as const,
    label: 'Apéro jacuzzi',
    detail: '2 à 4 couples',
    image: defaultImages.jacuzzi
  },
  {
    value: 'open_curtains' as const,
    label: 'Rideaux ouverts',
    detail: '2 ou 3 chambres',
    image: defaultImages.open_curtains
  }
]

export default function CreateEventPage () {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [form, setForm] = useState({
    title: '',
    venue: 'pigalle' as Venue,
    location: 'Love Hotel Pigalle',
    date: '',
    experience_type: 'jacuzzi' as ExperienceType,
    description: '',
    max_participants: 4,
    booking_confirmed: false,
    booking_reference: ''
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [isLoading, router, user])

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const chooseFormat = (experienceType: ExperienceType) => {
    setForm(current => ({
      ...current,
      experience_type: experienceType,
      max_participants: capacityLimits[experienceType],
      booking_confirmed: experienceType === 'open_curtains' ? current.booking_confirmed : false,
      booking_reference: experienceType === 'open_curtains' ? current.booking_reference : ''
    }))
  }

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : '')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user?.id || submitting) return
    if (!form.title.trim() || !form.date) {
      setError('Ajoutez un titre, une date et une heure.')
      return
    }
    if (form.experience_type === 'open_curtains' && form.booking_confirmed && !form.booking_reference.trim()) {
      setError('Indiquez le numéro de réservation de la chambre.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      let image = defaultImages[form.experience_type]
      if (coverFile) {
        const data = new FormData()
        data.set('photo', coverFile)
        const response = await fetch('/api/events/upload-cover', { method: 'POST', body: data })
        const result = await response.json()
        if (!response.ok || !result.url) throw new Error(result.error || "L'image n'a pas pu être envoyée.")
        image = result.url
      }

      await createEvent({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        booking_reference: form.booking_reference.trim(),
        image,
        category: form.experience_type,
        creator_id: user.id,
        publication_status: 'pending_review',
        created_by_role: user.role === 'admin' ? 'admin' : 'member'
      })
      router.push('/events?view=owned&created=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'événement n'a pas pu être proposé.")
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || !user) return null

  const maxCapacity = capacityLimits[form.experience_type]

  return (
    <MainLayout user={user}>
      <LhrV2Shell
        user={user}
        eyebrow='Communauté'
        title='Créer une expérience'
        subtitle='Choisissez le format, la date et lancez votre invitation.'
      >
        <form onSubmit={handleSubmit} className='mx-auto max-w-5xl space-y-5'>
          <section className='grid gap-3 sm:grid-cols-2' aria-label="Type d'événement">
            {formats.map(format => {
              const selected = form.experience_type === format.value
              return (
                <button
                  key={format.value}
                  type='button'
                  onClick={() => chooseFormat(format.value)}
                  aria-pressed={selected}
                  className={`grid grid-cols-[112px_1fr] overflow-hidden rounded-lg border text-left transition sm:grid-cols-[150px_1fr] ${selected ? 'border-[#ff8cc8] bg-[#ff4fa3]/10' : 'border-white/10 bg-white/[0.04] hover:border-white/30'}`}
                >
                  <div className='relative min-h-24'>
                    <Image src={format.image} alt='' fill sizes='150px' className='object-cover' />
                  </div>
                  <span className='flex min-w-0 items-center justify-between gap-2 p-4'>
                    <span>
                      <strong className='block text-base'>{format.label}</strong>
                      <span className='mt-1 block text-sm text-white/60'>{format.detail}</span>
                    </span>
                    {selected && <Check className='h-5 w-5 shrink-0 text-[#94ffc9]' />}
                  </span>
                </button>
              )
            })}
          </section>

          <section className='rounded-lg border border-white/10 bg-white/[0.04] p-4 md:p-6'>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label className='flex items-center gap-2'><MapPin className='h-4 w-4 text-[#ff8cc8]' /> Love Hotel</Label>
                <Select
                  value={form.venue}
                  onValueChange={(venue: Venue) => setForm(current => ({
                    ...current,
                    venue,
                    location: venue === 'chatelet' ? 'Love Hotel Châtelet' : 'Love Hotel Pigalle'
                  }))}
                >
                  <SelectTrigger className='border-white/10 bg-black/20 text-white'><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value='pigalle'>Pigalle</SelectItem><SelectItem value='chatelet'>Châtelet</SelectItem></SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='event-date' className='flex items-center gap-2'><CalendarDays className='h-4 w-4 text-[#ff8cc8]' /> Date et heure</Label>
                <Input id='event-date' type='datetime-local' value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} required className='border-white/10 bg-black/20 text-white' />
              </div>
              <div className='space-y-2'>
                <Label className='flex items-center gap-2'><UsersRound className='h-4 w-4 text-[#ff8cc8]' /> Capacité</Label>
                <Select value={String(form.max_participants)} onValueChange={value => setForm(current => ({ ...current, max_participants: Number(value) }))}>
                  <SelectTrigger className='border-white/10 bg-black/20 text-white'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxCapacity - 1 }, (_, index) => index + 2).map(value => (
                      <SelectItem key={value} value={String(value)}>{value} {form.experience_type === 'jacuzzi' ? 'couples' : 'chambres'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.experience_type === 'open_curtains' && (
              <div className='mt-5 rounded-lg border border-[#94ffc9]/20 bg-[#94ffc9]/5 p-4'>
                <p className='font-semibold'>La chambre est-elle déjà réservée ?</p>
                <div className='mt-3 flex gap-2'>
                  <Button type='button' size='sm' variant={form.booking_confirmed ? 'default' : 'outline'} onClick={() => setForm(current => ({ ...current, booking_confirmed: true }))}>Oui</Button>
                  <Button type='button' size='sm' variant={!form.booking_confirmed ? 'default' : 'outline'} onClick={() => setForm(current => ({ ...current, booking_confirmed: false, booking_reference: '' }))}>Pas encore</Button>
                </div>
                {form.booking_confirmed ? (
                  <div className='mt-3 max-w-sm space-y-2'>
                    <Label htmlFor='booking-reference'>Numéro de réservation</Label>
                    <Input id='booking-reference' value={form.booking_reference} onChange={event => setForm(current => ({ ...current, booking_reference: event.target.value }))} required className='border-white/10 bg-black/20 text-white' />
                  </div>
                ) : (
                  <p className='mt-3 text-sm text-white/60'>L’événement peut être proposé. Il sera affiché « Chambre à confirmer ».</p>
                )}
              </div>
            )}

            <div className='mt-5 grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='event-title'>Titre</Label>
                <Input id='event-title' value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder={form.experience_type === 'jacuzzi' ? 'Apéro jacuzzi jeudi soir' : 'Rideaux ouverts vendredi soir'} maxLength={100} required className='border-white/10 bg-black/20 text-white placeholder:text-white/35' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='event-cover' className='flex items-center gap-2'><ImageIcon className='h-4 w-4 text-[#ff8cc8]' /> Photo facultative</Label>
                <Input id='event-cover' type='file' accept='image/jpeg,image/png,image/webp' onChange={handleCoverChange} className='border-white/10 bg-black/20 text-white file:mr-3 file:border-0 file:bg-[#ff3b8b] file:px-3 file:py-2 file:text-white' />
              </div>
            </div>
            <div className='mt-4 space-y-2'>
              <Label htmlFor='event-description'>Votre invitation</Label>
              <Textarea id='event-description' value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder='Décrivez simplement l’ambiance et les personnes que vous souhaitez rencontrer.' maxLength={600} rows={4} className='border-white/10 bg-black/20 text-white placeholder:text-white/35' />
            </div>

            {coverPreview && <Image src={coverPreview} alt='Aperçu de la couverture' width={320} height={180} unoptimized className='mt-4 aspect-video w-52 rounded-lg object-cover' />}
            <p className='mt-4 text-sm text-white/55'>Votre proposition est relue par l’équipe avant publication.</p>
            {error && <p role='alert' className='mt-4 rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100'>{error}</p>}

            <div className='mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-5'>
              <Button type='button' variant='outline' onClick={() => router.push('/events')} className='border-white/15 bg-white/5 text-white'>Annuler</Button>
              <Button type='submit' disabled={submitting} className='bg-[#ff4fa3] text-white'>
                <Send className='mr-2 h-4 w-4' /> {submitting ? 'Envoi...' : 'Proposer l’événement'}
              </Button>
            </div>
          </section>
        </form>
      </LhrV2Shell>
    </MainLayout>
  )
}
