'use client'

import React, { useState } from 'react'
import {
  CalendarHeart,
  Mail,
  Phone,
  Sparkles
} from 'lucide-react'

const inputClass =
  'w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/45 outline-none transition focus:border-[#ff4fa3] focus:ring-2 focus:ring-[#ff4fa3]/30'

const requestTypes = [
  {
    value: 'custom_evening',
    label: 'Soirée sur mesure',
    description: 'Scénario romantique, coquin ou plus assumé.'
  },
  {
    value: 'weekend',
    label: 'Week-end particulier',
    description: 'Organisation complète autour d’une Love Room.'
  },
  {
    value: 'love_room',
    label: 'Love Room préparée',
    description: 'Chambre, attentions, ambiance, horaires.'
  },
  {
    value: 'open_curtains',
    label: 'Rideaux ouverts',
    description: 'Initiation ou expérience entre chambres.'
  },
  {
    value: 'jacuzzi',
    label: 'Apéro jacuzzi privé',
    description: '2, 3 ou 4 couples maximum selon le format.'
  },
  {
    value: 'limousine',
    label: 'Limousine / arrivée scénarisée',
    description: 'Mise en scène premium avant la chambre.'
  },
  {
    value: 'restaurant',
    label: 'Restaurant partenaire sur étude',
    description: 'À organiser hors établissement si pertinent.'
  },
  {
    value: 'libertine_event',
    label: 'Événement libertin spécifique',
    description: 'Demande cadrée, consentie et préparée.'
  },
  {
    value: 'other',
    label: 'Autre demande',
    description: 'Une envie particulière à organiser.'
  }
]

export default function ConciergerieForm() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedMessage('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/conciergerie', {
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
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setSubmittedMessage(
          data?.emailSent
            ? 'Votre demande est envoyée à la conciergerie. Vous recevrez une réponse par email.'
            : 'Votre demande est enregistrée. La conciergerie la traitera dès que possible.'
        )
        setNom('')
        setEmail('')
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
          data?.error || 'Une erreur est survenue, veuillez réessayer.'
        )
      }
    } catch (err) {
      console.error('Erreur réseau conciergerie', err)
      setSubmittedMessage(
        "Impossible d'envoyer la demande, vérifiez votre connexion."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className='w-full py-10'>
      <div className='grid w-full gap-6 overflow-hidden rounded-3xl border border-white/15 bg-[#26002f]/80 shadow-2xl lg:grid-cols-[0.9fr_1.1fr]'>
        <div className='relative min-h-[360px] overflow-hidden bg-[#130018]'>
          <img
            src='https://res.cloudinary.com/dniurvpzd/image/upload/v1781270530/ChatGPT_Image_12_juin_2026_15_21_00_a4k94d.png'
            alt='Ambiance rideaux ouverts Love Hotel'
            className='absolute inset-0 h-full w-full object-cover opacity-75'
          />
          <div className='absolute inset-0 bg-gradient-to-t from-[#18001e] via-[#18001e]/40 to-transparent' />
          <div className='relative z-10 flex h-full flex-col justify-end p-6 md:p-8'>
            <div className='mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#ff3b8b] px-4 py-2 text-sm font-black uppercase tracking-wide text-white'>
              <Sparkles className='h-4 w-4' />
              Conciergerie coquine
            </div>
            <h2 className='max-w-md text-3xl font-black leading-tight text-white md:text-4xl'>
              Confiez-nous l’organisation de votre moment privé.
            </h2>
            <p className='mt-4 max-w-md text-sm leading-6 text-white/80'>
              Love Room préparée, apéro jacuzzi, rideaux ouverts, week-end,
              arrivée scénarisée ou événement plus libertin : la demande passe
              uniquement par ce formulaire et arrive directement à la
              conciergerie.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5 p-6 md:p-8'>
          <div>
            <div className='mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#ff8cc8]'>
              <Sparkles className='h-4 w-4' />
              Choisissez le point de départ
            </div>
            <div className='grid gap-3 md:grid-cols-3'>
              {requestTypes.map(type => (
                <button
                  key={type.value}
                  type='button'
                  onClick={() => setRequestType(type.value)}
                  className={[
                    'rounded-2xl border p-4 text-left transition',
                    requestType === type.value
                      ? 'border-[#ff7ac0] bg-[#ff3b8b]/22 text-white shadow-lg shadow-[#ff3b8b]/10'
                      : 'border-white/10 bg-white/[0.055] text-white/74 hover:border-[#ff7ac0]/60 hover:text-white'
                  ].join(' ')}
                >
                  <span className='block text-sm font-black'>{type.label}</span>
                  <span className='mt-2 block text-xs leading-5 text-white/58'>
                    {type.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <label className='space-y-2'>
              <span className='text-sm font-bold text-white'>Votre nom</span>
              <input
                type='text'
                value={nom}
                onChange={e => setNom(e.target.value)}
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
                onChange={e => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder='adresse@email.com'
              />
            </label>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <label className='space-y-2'>
              <span className='flex items-center gap-2 text-sm font-bold text-white'>
                <Phone className='h-4 w-4 text-[#ff7ac0]' />
                Téléphone optionnel
              </span>
              <input
                type='tel'
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={inputClass}
                placeholder='Si vous voulez être rappelé'
              />
            </label>
            <label className='space-y-2'>
              <span className='flex items-center gap-2 text-sm font-bold text-white'>
                <CalendarHeart className='h-4 w-4 text-[#ff7ac0]' />
                Type retenu
              </span>
              <select
                value={requestType}
                onChange={e => setRequestType(e.target.value)}
                className={inputClass}
              >
                {requestTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <label className='space-y-2'>
              <span className='text-sm font-bold text-white'>Établissement souhaité</span>
              <select
                value={venuePreference}
                onChange={e => setVenuePreference(e.target.value)}
                className={inputClass}
              >
                <option value='à définir'>À définir ensemble</option>
                <option value='Pigalle'>Love Hotel Pigalle</option>
                <option value='Châtelet'>Love Hotel Châtelet</option>
                <option value='Pigalle ou Châtelet'>Pigalle ou Châtelet</option>
              </select>
            </label>
            <label className='space-y-2'>
              <span className='text-sm font-bold text-white'>Date ou période souhaitée</span>
              <input
                type='text'
                value={desiredDate}
                onChange={e => setDesiredDate(e.target.value)}
                className={inputClass}
                placeholder='Ex : samedi soir, week-end de juillet...'
              />
            </label>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <label className='space-y-2'>
              <span className='text-sm font-bold text-white'>Nombre de personnes ou couples</span>
              <input
                type='text'
                value={partySize}
                onChange={e => setPartySize(e.target.value)}
                className={inputClass}
                placeholder='Ex : 1 couple, 3 couples, 2 chambres...'
              />
            </label>
            <label className='space-y-2'>
              <span className='text-sm font-bold text-white'>Ambiance recherchée</span>
              <select
                value={mood}
                onChange={e => setMood(e.target.value)}
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

          <div className='rounded-2xl border border-[#ff8cc8]/20 bg-[#ff3b8b]/12 p-4 text-sm leading-6 text-white/78'>
            <div className='mb-1 flex items-center gap-2 font-black text-white'>
              <Mail className='h-4 w-4 text-[#ff8cc8]' />
              Demande envoyée uniquement par formulaire
            </div>
            Elle arrive directement à la conciergerie Love Hotel sur l’adresse
            opérationnelle dédiée. La réponse se fait par email ou téléphone si
            vous l’indiquez.
          </div>

          <label className='space-y-2'>
            <span className='text-sm font-bold text-white'>
              Décrivez votre envie
            </span>
            <textarea
              value={besoin}
              onChange={e => setBesoin(e.target.value)}
              required
              rows={6}
              className={`${inputClass} resize-none`}
              placeholder='Ex : apéro jacuzzi pour trois couples, rideaux ouverts dans deux chambres, week-end surprise avec Love Room, ambiance plus romantique ou plus libertine...'
            />
          </label>

          <label className='space-y-2'>
            <span className='text-sm font-bold text-white'>
              Budget indicatif optionnel
            </span>
            <input
              type='text'
              value={budget}
              onChange={e => setBudget(e.target.value)}
              className={inputClass}
              placeholder='Ex : 300-600 euros'
            />
          </label>

          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full rounded-2xl bg-gradient-to-r from-[#ff3b8b] to-[#ff7ac0] px-5 py-4 text-base font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande privée'}
          </button>

          {submittedMessage && (
            <p className='rounded-2xl border border-white/15 bg-white/10 p-4 text-center text-sm font-bold text-white'>
              {submittedMessage}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
