'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import { CalendarHeart, Mail, Phone, Send, Sparkles } from 'lucide-react'

const inputClass =
  'w-full rounded-lg border border-white/15 bg-white/[0.08] px-4 py-3 text-white placeholder:text-white/45 outline-none transition focus:border-[#ff4fa3] focus:ring-2 focus:ring-[#ff4fa3]/30'

const conciergerieImageUrl = '/conciergerie-service.jpg'

const requestTypes = [
  {
    value: 'custom_evening',
    label: 'Une soirée sur mesure',
    description: 'Romantique, coquine ou plus assumée.',
    featured: true
  },
  {
    value: 'love_room',
    label: 'Une Love Room préparée',
    description: 'Ambiance, attentions et horaires.',
    featured: true
  },
  {
    value: 'open_curtains',
    label: 'Rideaux ouverts',
    description: 'Initiation ou expérience entre chambres.',
    featured: true
  },
  {
    value: 'jacuzzi',
    label: 'Un jacuzzi privé',
    description: 'Un moment intime ou en petit comité.',
    featured: true
  },
  {
    value: 'weekend',
    label: 'Un week-end particulier',
    description: 'Une organisation complète autour du séjour.',
    featured: true
  },
  {
    value: 'other',
    label: 'Une autre idée',
    description: 'Dites-nous simplement ce que vous imaginez.',
    featured: true
  },
  {
    value: 'limousine',
    label: 'Limousine / arrivée scénarisée',
    description: 'Une mise en scène avant la chambre.',
    featured: false
  },
  {
    value: 'restaurant',
    label: 'Restaurant partenaire',
    description: 'Une expérience à organiser hors établissement.',
    featured: false
  },
  {
    value: 'libertine_event',
    label: 'Événement libertin spécifique',
    description: 'Une demande consentie et préparée.',
    featured: false
  }
]

const featuredRequestTypes = requestTypes.filter(type => type.featured)

type ConciergerieFormProps = {
  initialName?: string
  initialEmail?: string
}

export default function ConciergerieForm({
  initialName = '',
  initialEmail = ''
}: ConciergerieFormProps) {
  const [nom, setNom] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState('')
  const [requestType, setRequestType] = useState('custom_evening')
  const [venuePreference, setVenuePreference] = useState('à définir')
  const [desiredDate, setDesiredDate] = useState('')
  const [partySize, setPartySize] = useState('')
  const [mood, setMood] = useState('coquin élégant')
  const [besoin, setBesoin] = useState('')
  const [budget, setBudget] = useState('')
  const [submittedMessage, setSubmittedMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmittedMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/conciergerie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom,
          email,
          phone,
          requestType,
          responsePreference: 'email',
          venuePreference,
          desiredDate,
          partySize,
          mood,
          besoin,
          budget
        })
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setSubmittedMessage(
          data?.emailSent
            ? 'Votre idée est bien arrivée à la conciergerie. Nous vous répondrons personnellement par email.'
            : 'Votre demande est bien enregistrée dans notre suivi. La conciergerie va la reprendre personnellement.'
        )
        setNom(initialName)
        setEmail(initialEmail)
        setPhone('')
        setRequestType('custom_evening')
        setVenuePreference('à définir')
        setDesiredDate('')
        setPartySize('')
        setMood('coquin élégant')
        setBesoin('')
        setBudget('')
      } else {
        setSubmittedMessage(
          data?.error || 'La demande n’a pas pu être envoyée. Merci de réessayer.'
        )
      }
    } catch (error) {
      console.error('Erreur réseau conciergerie', error)
      setSubmittedMessage(
        'Impossible de joindre la conciergerie. Vérifiez votre connexion puis réessayez.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section aria-labelledby='conciergerie-form-title' className='w-full border-t border-white/10 pt-8'>
      <div className='mb-6 max-w-3xl'>
        <p className='text-sm font-black uppercase text-[#ff8cc8]'>
          Construisons votre moment
        </p>
        <h2 id='conciergerie-form-title' className='mt-2 text-3xl font-black md:text-4xl'>
          Parlez-nous de votre idée
        </h2>
        <p className='mt-3 text-sm leading-7 text-white/66 md:text-base'>
          Quelques mots suffisent pour commencer. Nous reviendrons vers vous
          pour préciser ensemble ce qui est possible et activer les bons
          contacts.
        </p>
      </div>

      <div className='grid overflow-hidden rounded-lg border border-white/15 bg-[#26002f]/80 shadow-2xl xl:grid-cols-[360px_minmax(0,1fr)]'>
        <div className='relative min-h-[300px] overflow-hidden bg-[#130018] xl:min-h-full'>
          <Image
            src={conciergerieImageUrl}
            alt='Conciergerie privée Love Hotel'
            fill
            sizes='(max-width: 1280px) 100vw, 360px'
            className='object-cover opacity-75'
          />
          <div className='absolute inset-0 bg-gradient-to-t from-[#18001e] via-[#18001e]/45 to-transparent' />
          <div className='relative z-10 flex h-full min-h-[300px] flex-col justify-end p-6'>
            <div className='mb-3 inline-flex w-fit items-center gap-2 rounded-md bg-[#ff3b8b] px-3 py-2 text-xs font-black uppercase text-white'>
              <Sparkles className='h-4 w-4' />
              Conciergerie coquine
            </div>
            <p className='max-w-sm text-xl font-black leading-snug text-white'>
              « J’aimerais organiser quelque chose de différent, mais je ne
              sais pas par où commencer. »
            </p>
            <p className='mt-3 text-sm leading-6 text-white/76'>
              C’est précisément à ce moment que notre réseau devient utile.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-7 p-5 md:p-8'>
          <fieldset>
            <legend className='mb-3 text-base font-black text-white'>
              Qu’avez-vous envie de vivre ?
            </legend>
            <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              {featuredRequestTypes.map(type => (
                <button
                  key={type.value}
                  type='button'
                  aria-pressed={requestType === type.value}
                  onClick={() => setRequestType(type.value)}
                  className={[
                    'min-h-[96px] rounded-lg border p-3 text-left transition',
                    requestType === type.value
                      ? 'border-[#ff7ac0] bg-[#ff3b8b]/22 text-white'
                      : 'border-white/10 bg-white/[0.045] text-white/74 hover:border-[#ff7ac0]/60 hover:text-white'
                  ].join(' ')}
                >
                  <span className='block text-sm font-black'>{type.label}</span>
                  <span className='mt-1 block text-xs leading-5 text-white/58'>
                    {type.description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className='block space-y-2'>
            <span className='text-sm font-bold text-white'>
              Racontez-nous ce que vous imaginez
            </span>
            <textarea
              value={besoin}
              onChange={event => setBesoin(event.target.value)}
              required
              rows={5}
              className={`${inputClass} resize-y`}
              placeholder='Par exemple : une soirée surprise pour notre anniversaire, un apéro jacuzzi avec deux couples, une première expérience rideaux ouverts…'
            />
          </label>

          <div>
            <div className='mb-3 flex items-center gap-2 text-sm font-black text-[#94ffc9]'>
              <CalendarHeart className='h-4 w-4' />
              Quand, où et avec qui ?
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <label className='space-y-2'>
                <span className='text-sm font-bold text-white'>Lieu souhaité</span>
                <select
                  value={venuePreference}
                  onChange={event => setVenuePreference(event.target.value)}
                  className={inputClass}
                >
                  <option value='à définir'>À définir ensemble</option>
                  <option value='Pigalle'>Love Hotel Pigalle</option>
                  <option value='Châtelet'>Love Hotel Châtelet</option>
                  <option value='Pigalle ou Châtelet'>Pigalle ou Châtelet</option>
                  <option value='Autre lieu'>Un autre lieu</option>
                </select>
              </label>
              <label className='space-y-2'>
                <span className='text-sm font-bold text-white'>Date ou période</span>
                <input
                  type='text'
                  value={desiredDate}
                  onChange={event => setDesiredDate(event.target.value)}
                  className={inputClass}
                  placeholder='Samedi soir, un week-end en juillet…'
                />
              </label>
              <label className='space-y-2'>
                <span className='text-sm font-bold text-white'>Participants</span>
                <input
                  type='text'
                  value={partySize}
                  onChange={event => setPartySize(event.target.value)}
                  className={inputClass}
                  placeholder='Un couple, trois couples, deux chambres…'
                />
              </label>
              <label className='space-y-2'>
                <span className='text-sm font-bold text-white'>Ambiance recherchée</span>
                <select
                  value={mood}
                  onChange={event => setMood(event.target.value)}
                  className={inputClass}
                >
                  <option value='romantique'>Romantique</option>
                  <option value='coquin élégant'>Coquin élégant</option>
                  <option value='initiation douce'>Initiation douce</option>
                  <option value='rideaux ouverts'>Rideaux ouverts</option>
                  <option value='libertin assumé'>Libertin assumé</option>
                  <option value='surprise'>Surprise à organiser</option>
                </select>
              </label>
            </div>
          </div>

          <div>
            <div className='mb-3 flex items-center gap-2 text-sm font-black text-[#ffb4d8]'>
              <Mail className='h-4 w-4' />
              Comment pouvons-nous vous répondre ?
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <label className='space-y-2'>
                <span className='text-sm font-bold text-white'>Votre nom ou pseudo</span>
                <input
                  type='text'
                  value={nom}
                  onChange={event => setNom(event.target.value)}
                  required
                  className={inputClass}
                  placeholder='Nom ou pseudo'
                />
              </label>
              <label className='space-y-2'>
                <span className='text-sm font-bold text-white'>Votre email</span>
                <input
                  type='email'
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  className={inputClass}
                  placeholder='adresse@email.com'
                />
              </label>
              <label className='space-y-2'>
                <span className='flex items-center gap-2 text-sm font-bold text-white'>
                  <Phone className='h-4 w-4 text-[#ff7ac0]' />
                  Téléphone facultatif
                </span>
                <input
                  type='tel'
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className={inputClass}
                  placeholder='Uniquement si vous souhaitez être rappelé'
                />
              </label>
              <label className='space-y-2'>
                <span className='text-sm font-bold text-white'>Budget indicatif facultatif</span>
                <input
                  type='text'
                  value={budget}
                  onChange={event => setBudget(event.target.value)}
                  className={inputClass}
                  placeholder='Une fourchette suffit'
                />
              </label>
            </div>
          </div>

          <div className='flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between'>
            <div className='max-w-xl text-sm leading-6 text-white/62'>
              <div className='font-black text-white'>Demande envoyée uniquement par formulaire</div>
              Elle arrive directement dans le suivi privé de la conciergerie et
              une notification email est adressée à l’équipe opérationnelle.
            </div>
            <button
              type='submit'
              disabled={isSubmitting}
              className='inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#ff3b8b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff5ca3] disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isSubmitting ? (
                'Envoi en cours…'
              ) : (
                <>
                  <Send className='h-4 w-4' />
                  Envoyer mon idée
                </>
              )}
            </button>
          </div>

          <div aria-live='polite'>
            {submittedMessage ? (
              <p className='rounded-lg border border-[#94ffc9]/25 bg-[#10251d]/65 p-4 text-sm font-bold text-white'>
                {submittedMessage}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  )
}
