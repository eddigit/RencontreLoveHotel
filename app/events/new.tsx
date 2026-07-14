// Page for creating a new Love Hotel experience.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarHeart, MapPin, Sparkles, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createEvent } from '@/actions/event-actions'
import MainLayout from '@/components/layout/main-layout'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import { useAuth } from '@/contexts/auth-context'
import { EventPhotoField } from '@/components/event-photo-field'

type Venue = 'pigalle' | 'chatelet'
type ExperienceType = 'jacuzzi' | 'open_curtains'

const experienceCapacityLimit: Record<ExperienceType, number> = {
  jacuzzi: 4,
  open_curtains: 3
}

export default function CreateEventPage () {
  const router = useRouter()
  const { user } = useAuth()

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
      nextForm.max_participants = Math.min(
        Math.max(Number(value) || 2, 2),
        maxCapacity
      )
    }
    setForm(nextForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!user?.id) {
      setError('Vous devez être connecté pour créer une expérience.')
      setLoading(false)
      return
    }

    try {
      await createEvent({
        ...form,
        creator_id: user.id,
        publication_status: 'published',
        created_by_role: user.role === 'admin' ? 'admin' : 'member'
      })
      router.push('/events')
    } catch (err) {
      setError("Erreur lors de la création de l'expérience.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout user={user}>
      <LhrV2Shell
        user={user}
        eyebrow='Communauté'
        title='Créer une expérience'
        subtitle='Proposez uniquement les formats actifs : apéro jacuzzi de 2 à 4 couples ou rideaux ouverts dans 2 ou 3 chambres à Pigalle ou Châtelet.'
      >
        <form onSubmit={handleSubmit} className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]'>
          <section className='space-y-5 rounded-2xl border border-white/10 bg-white/[0.045] p-5 md:p-6'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2 md:col-span-2'>
                <Label htmlFor='title' className='text-white/80'>Titre *</Label>
                <Input
                  id='title'
                  value={form.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder='Apéro jacuzzi 3 couples ou rideaux ouverts 2 chambres'
                  className='border-white/10 bg-black/20 text-white placeholder:text-white/35'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-white/80'>Établissement *</Label>
                <Select value={form.venue} onValueChange={value => handleChange('venue', value)}>
                  <SelectTrigger className='border-white/10 bg-black/20 text-white'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pigalle'>Pigalle</SelectItem>
                    <SelectItem value='chatelet'>Châtelet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='text-white/80'>Type d'expérience *</Label>
                <Select value={form.experience_type} onValueChange={value => handleChange('experience_type', value)}>
                  <SelectTrigger className='border-white/10 bg-black/20 text-white'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='jacuzzi'>Apéro jacuzzi - 2 à 4 couples</SelectItem>
                    <SelectItem value='open_curtains'>Rideaux ouverts - 2 ou 3 chambres</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='date' className='text-white/80'>Date et heure *</Label>
                <Input
                  id='date'
                  type='datetime-local'
                  value={form.date}
                  onChange={e => handleChange('date', e.target.value)}
                  className='border-white/10 bg-black/20 text-white'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='max_participants' className='text-white/80'>
                  Capacité {form.experience_type === 'jacuzzi' ? '(2 à 4 couples)' : '(2 ou 3 chambres)'}
                </Label>
                <Input
                  id='max_participants'
                  type='number'
                  min='2'
                  max={experienceCapacityLimit[form.experience_type]}
                  value={form.max_participants}
                  onChange={e => handleChange('max_participants', parseInt(e.target.value, 10) || 2)}
                  className='border-white/10 bg-black/20 text-white'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description' className='text-white/80'>Description</Label>
              <Textarea
                id='description'
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Ambiance, profils attendus, déroulé, limites, consentement, horaires, nombre de couples ou de chambres..."
                rows={5}
                className='border-white/10 bg-black/20 text-white placeholder:text-white/35'
              />
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='prix_personne_seule' className='text-white/80'>Prix personne seule (€)</Label>
                <Input
                  id='prix_personne_seule'
                  type='number'
                  min='0'
                  step='0.01'
                  value={form.prix_personne_seule}
                  onChange={e => handleChange('prix_personne_seule', parseFloat(e.target.value) || 0)}
                  className='border-white/10 bg-black/20 text-white'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='prix_couple' className='text-white/80'>Prix couple (€)</Label>
                <Input
                  id='prix_couple'
                  type='number'
                  min='0'
                  step='0.01'
                  value={form.prix_couple}
                  onChange={e => handleChange('prix_couple', parseFloat(e.target.value) || 0)}
                  className='border-white/10 bg-black/20 text-white'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='price' className='text-white/80'>Prix global (€)</Label>
                <Input
                  id='price'
                  type='number'
                  min='0'
                  step='0.01'
                  value={form.price}
                  onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
                  className='border-white/10 bg-black/20 text-white'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='conditions' className='text-white/80'>Règles et conditions</Label>
              <Textarea
                id='conditions'
                value={form.conditions}
                onChange={e => handleChange('conditions', e.target.value)}
                placeholder='Respect, consentement, tenue, arrivée, paiement sur place, limites du groupe...'
                rows={4}
                className='border-white/10 bg-black/20 text-white placeholder:text-white/35'
              />
            </div>

            <EventPhotoField
              value={form.image}
              onChange={value => handleChange('image', value)}
              category={form.category}
              experienceType={form.experience_type}
            />

            {error && (
              <div className='rounded-xl border border-red-400/20 bg-red-500/12 p-3 text-sm text-red-100'>
                {error}
              </div>
            )}

            <div className='flex flex-col gap-3 pt-2 sm:flex-row'>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.push('/events')}
                className='border-white/15 bg-white/5 text-white hover:bg-white/10'
              >
                Annuler
              </Button>
              <Button
                type='submit'
                disabled={loading}
                className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white hover:opacity-90'
              >
                {loading ? "Création..." : "Publier l'expérience"}
              </Button>
            </div>
          </section>

          <aside className='space-y-4'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <div className='flex items-center gap-3'>
                <Sparkles className='h-5 w-5 text-[#ff8cc8]' />
                <h2 className='font-black'>Publication</h2>
              </div>
              <p className='mt-3 text-sm text-white/62'>
                Votre proposition est enregistrée avec les règles de publication actuellement actives.
              </p>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <div className='flex items-center gap-3'>
                <MapPin className='h-5 w-5 text-[#94ffc9]' />
                <h2 className='font-black'>Lieu</h2>
              </div>
              <p className='mt-3 text-sm text-white/62'>
                Pigalle et Châtelet deviennent des points de rencontre concrets, reliés aux chambres rideaux ouverts et aux jacuzzis.
              </p>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <div className='flex items-center gap-3'>
                <UsersRound className='h-5 w-5 text-[#ffd166]' />
                <h2 className='font-black'>Capacité</h2>
              </div>
              <p className='mt-3 text-sm text-white/62'>
                Apéro jacuzzi : 2, 3 ou 4 couples maximum. Rideaux ouverts : 2 ou 3 chambres maximum.
              </p>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <div className='flex items-center gap-3'>
                <CalendarHeart className='h-5 w-5 text-[#ff8cc8]' />
                <h2 className='font-black'>Expérience</h2>
              </div>
              <p className='mt-3 text-sm text-white/62'>
                L'objectif est de transformer une affinité en expérience réelle dans un cadre clair, limité et consenti.
              </p>
            </div>
          </aside>
        </form>
      </LhrV2Shell>
    </MainLayout>
  )
}
