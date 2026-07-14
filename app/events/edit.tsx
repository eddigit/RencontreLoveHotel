// Page for editing an event by its creator or admin
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateEvent, getUpcomingEvents } from '@/actions/event-actions'
import { getOption } from '@/actions/user-actions'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { EventPhotoField } from '@/components/event-photo-field'

const activeEventCategoriesFallback =
  'jacuzzi|Apéro jacuzzi 2 à 4 couples\nopen_curtains|Rideaux ouverts 2 ou 3 chambres'
const activeEventCategoryValues = new Set(['jacuzzi', 'open_curtains'])

function parseActiveEventCategories(raw?: string | null) {
  return (raw || activeEventCategoriesFallback)
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean)
    .map((line: string) => {
      const [value, label] = line.split('|')
      return value && label
        ? { value: value.trim(), label: label.trim() }
        : null
    })
    .filter(
      (category): category is { value: string; label: string } =>
        category !== null && activeEventCategoryValues.has(category.value)
    )
}

export default function EditEventPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')
  const { user } = useAuth()
  
  const [form, setForm] = useState({
    title: '',
    location: '',
    date: '',
    image: '',
    category: '',
    description: '',
    price: 0,
    prix_personne_seule: 0,
    prix_couple: 0,
    payment_mode: 'sur_place' as 'sur_place' | 'online',
    conditions: ''
  })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return
      
      setLoading(true)
      const events = await getUpcomingEvents(user?.id)
      const event = events.find((e: any) => String(e.id) === String(eventId))
      
      if (event) {
        setForm({
          title: event.title || '',
          location: event.location || '',
          date: event.event_date
            ? typeof event.event_date === 'string'
              ? event.event_date.slice(0, 16)
              : new Date(event.event_date).toISOString().slice(0, 16)
            : '',
          image: event.image || '',
          category: event.category || '',
          description: event.description || '',
          price: event.price || 0,
          prix_personne_seule: event.prix_personne_seule || 0,
          prix_couple: event.prix_couple || 0,
          payment_mode: event.payment_mode || 'sur_place',
          conditions: event.conditions || ''
        })
      }
      setLoading(false)
    }

    async function fetchCategories() {
      const raw = await getOption('event_categories')
      setCategories(parseActiveEventCategories(raw))
    }

    fetchEvent()
    fetchCategories()
  }, [eventId, user?.id])

  const handleChange = (name: string, value: string | number) => {
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId) return
    
    setLoading(true)
    setError('')
    
    try {
      await updateEvent(eventId, form)
      router.push('/events')
    } catch (err) {
      setError("Erreur lors de la modification de l'événement.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout user={user}>
      <div className='container py-10 max-w-2xl'>
        <Card>
          <CardHeader>
            <CardTitle>Modifier l'événement</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Chargement...</div>
            ) : (
              <form onSubmit={handleSubmit} className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='title'>Titre *</Label>                    <Input
                      id='title'
                      value={form.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="Titre de l'événement"
                      required
                    />
                  </div>
                  
                  <div className='space-y-2'>
                    <Label htmlFor='location'>Lieu *</Label>                    <Input
                      id='location'
                      value={form.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="Lieu de l'événement"
                      required
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='date'>Date et heure *</Label>
                    <Input
                      id='date'
                      type='datetime-local'
                      value={form.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className='space-y-2'>
                    <Label htmlFor='category'>Catégorie</Label>
                    <Select
                      value={form.category}
                      onValueChange={(value) => handleChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Sélectionner une catégorie' />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='price'>Prix (€)</Label>
                    <Input
                      id='price'
                      type='number'
                      min='0'
                      step='0.01'
                      value={form.price}
                      onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                      placeholder='Prix en euros'
                    />
                  </div>
                  
                  <div className='space-y-2'>
                    <Label htmlFor='payment_mode'>Mode de paiement</Label>
                    <Select
                      value={form.payment_mode}
                      onValueChange={(value) => handleChange('payment_mode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='sur_place'>Sur place</SelectItem>
                        <SelectItem value='online'>En ligne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <EventPhotoField
                  value={form.image}
                  onChange={value => handleChange('image', value)}
                  category={form.category}
                  experienceType={form.category}
                />

                <div className='space-y-2'>
                  <Label htmlFor='description'>Description</Label>                  <Textarea
                    id='description'
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Description de l'événement"
                    rows={4}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='conditions'>Conditions et informations supplémentaires</Label>                  <Textarea
                    id='conditions'
                    value={form.conditions}
                    onChange={(e) => handleChange('conditions', e.target.value)}
                    placeholder="Conditions d'annulation, prérequis, informations importantes..."
                    rows={4}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='prix_personne_seule'>Prix par personne seule (€)</Label>
                  <Input
                    id='prix_personne_seule'
                    type='number'
                    min='0'
                    step='0.01'
                    value={form.prix_personne_seule}
                    onChange={(e) => handleChange('prix_personne_seule', parseFloat(e.target.value) || 0)}
                    placeholder='Prix par personne seule'
                  />
                  <Label htmlFor='prix_couple'>Prix par couple (€)</Label>
                  <Input
                    id='prix_couple'
                    type='number'
                    min='0'
                    step='0.01'
                    value={form.prix_couple}
                    onChange={(e) => handleChange('prix_couple', parseFloat(e.target.value) || 0)}
                    placeholder='Prix par couple'
                  />
                </div>

                {error && (
                  <div className='text-red-500 text-sm bg-red-50 p-3 rounded'>
                    {error}
                  </div>
                )}

                <div className='flex gap-4 pt-4'>
                  <Button 
                    type='button' 
                    variant='outline' 
                    onClick={() => router.push('/events')}
                    className='flex-1'
                  >
                    Annuler
                  </Button>
                  <Button 
                    type='submit' 
                    disabled={loading}
                    className='flex-1'
                  >
                    {loading ? 'Modification...' : 'Enregistrer les modifications'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
