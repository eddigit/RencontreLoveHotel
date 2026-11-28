'use client'

import React, { useState } from 'react'
import {
  Mail,
  Phone,
  Sparkles
} from 'lucide-react'

const inputClass =
  'w-full rounded-xl border border-[#494136] bg-[#0d0e11] px-3.5 py-3 text-[#f4efe5] placeholder:text-[#b8ad9e] outline-none transition focus:border-[#d6bc87] focus:ring-2 focus:ring-[#d6bc87]/25'

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
  const [submissionStatus, setSubmissionStatus] = useState<'success' | 'error' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedMessage('')
    setSubmissionStatus(null)
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
        setSubmissionStatus('success')
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
        setSubmissionStatus('error')
        setSubmittedMessage(
          data?.error || 'Une erreur est survenue, veuillez réessayer.'
        )
      }
    } catch (err) {
      console.error('Erreur réseau conciergerie', err)
      setSubmissionStatus('error')
      setSubmittedMessage(
        "Impossible d'envoyer la demande, vérifiez votre connexion."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className='w-full py-6 sm:py-8'>
      <form onSubmit={handleSubmit} className='mx-auto max-w-5xl rounded-2xl border border-[#494136] bg-[#0d0e11] p-4 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.7)] sm:p-6 lg:p-8'>
        <div className='border-b border-[#494136] pb-5'>
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d6bc87]'>
            <Sparkles className='h-4 w-4' /> Demande privée
          </div>
          <h2 className='mt-2 text-2xl font-semibold text-[#f4efe5] sm:text-3xl'>Parlez-nous de votre projet</h2>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-[#94a3b8]'>Choisissez votre expérience et précisez vos souhaits. L’équipe vous répondra par e-mail.</p>
        </div>

        <fieldset className='mt-6'>
          <legend className='text-sm font-semibold text-[#e3e1e9]'>Type de demande</legend>
          <p className='mt-1 text-xs text-[#94a3b8]'>Choisissez l’option la plus proche de votre besoin.</p>
          <div className='mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4' role='radiogroup' aria-label='Type de demande'>
              {requestTypes.map(type => (
                <label
                  key={type.value}
                  className={[
                    'relative cursor-pointer rounded-xl border p-3 text-left transition focus-within:ring-2 focus-within:ring-[#d6bc87]',
                    requestType === type.value
                      ? 'border-[#d6bc87] bg-[#d6bc87]/15 text-[#f4efe5]'
                      : 'border-[#494136] bg-[#0d0e11] text-[#ded6ca] hover:border-[#d6bc87]/60 hover:text-[#f4efe5]'
                  ].join(' ')}
                >
                  <input className='sr-only' type='radio' name='concierge-experience' value={type.value}
                    checked={requestType === type.value} onChange={() => setRequestType(type.value)} />
                  <span className='block text-sm font-semibold'>{type.label}</span>
                  <span className='mt-1.5 block text-xs leading-5 text-[#94a3b8]'>
                    {type.description}
                  </span>
                </label>
              ))}
          </div>
        </fieldset>

        <fieldset className='mt-6'>
          <legend className='text-sm font-semibold text-[#e3e1e9]'>Vos coordonnées</legend>
          <div className='mt-3 grid gap-4 md:grid-cols-2'>
            <label className='space-y-2'>
              <span className='text-sm font-medium text-[#e3e1e9]'>Votre nom</span>
              <input
                type='text'
                autoComplete='name'
                value={nom}
                onChange={e => setNom(e.target.value)}
                required
                className={inputClass}
                placeholder='Nom ou pseudo'
              />
            </label>
            <label className='space-y-2'>
              <span className='text-sm font-medium text-[#e3e1e9]'>Votre email</span>
              <input
                type='email'
                autoComplete='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder='adresse@email.com'
              />
            </label>
          </div>
          <div className='mt-4 grid gap-4 md:grid-cols-2'>
            <label className='space-y-2'>
              <span className='flex items-center gap-2 text-sm font-medium text-[#e3e1e9]'>
                <Phone className='h-4 w-4 text-[#d6bc87]' />
                Téléphone optionnel
              </span>
              <input
                type='tel'
                autoComplete='tel'
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={inputClass}
                placeholder='Si vous voulez être rappelé'
              />
            </label>
            <div className='rounded-xl border border-[#494136] bg-[#0d0e11] p-3 text-sm leading-5 text-[#b8ad9e]'><Mail className='mb-1 h-4 w-4 text-[#d6bc87]' /> Vos coordonnées servent uniquement à répondre à cette demande.</div>
          </div>
        </fieldset>

        <fieldset className='mt-6'>
          <legend className='text-sm font-semibold text-[#e3e1e9]'>Votre projet</legend>
          <div className='mt-3 grid gap-4 md:grid-cols-2'>
            <label className='space-y-2'>
              <span className='text-sm font-medium text-[#e3e1e9]'>Établissement souhaité</span>
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
              <span className='text-sm font-medium text-[#e3e1e9]'>Date ou période souhaitée</span>
              <input
                type='text'
                value={desiredDate}
                onChange={e => setDesiredDate(e.target.value)}
                className={inputClass}
                placeholder='Ex : samedi soir, week-end de juillet...'
              />
            </label>
          </div>
          <div className='mt-4 grid gap-4 md:grid-cols-2'>
            <label className='space-y-2'>
              <span className='text-sm font-medium text-[#e3e1e9]'>Nombre de personnes ou couples</span>
              <input
                type='text'
                value={partySize}
                onChange={e => setPartySize(e.target.value)}
                className={inputClass}
                placeholder='Ex : 1 couple, 3 couples, 2 chambres...'
              />
            </label>
            <label className='space-y-2'>
              <span className='text-sm font-medium text-[#e3e1e9]'>Ambiance recherchée</span>
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
          <label className='mt-4 block space-y-2'>
            <span className='text-sm font-medium text-[#e3e1e9]'>
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

          <label className='mt-4 block space-y-2'>
            <span className='text-sm font-medium text-[#e3e1e9]'>
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
        </fieldset>

        <div className='mt-6 border-t border-[#494136] pt-5'>
          <p className='mb-3 text-xs leading-5 text-[#94a3b8]'>La demande est transmise par ce formulaire. Aucun détail n’est publié sur votre profil.</p>
          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full rounded-xl bg-[#d6bc87] px-5 py-3.5 text-base font-semibold text-[#191714] shadow-[0_0_16px_rgba(214,188,135,0.18)] transition hover:bg-[#e5d1aa] disabled:cursor-not-allowed disabled:opacity-60'
          >
            {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande privée'}
          </button>

          {submittedMessage && (
            <p
              role={submissionStatus === 'error' ? 'alert' : 'status'}
              className={`mt-3 rounded-xl border bg-[#121318] p-4 text-center text-sm font-medium text-[#e3e1e9] ${submissionStatus === 'error' ? 'border-[#5d3f3f]' : 'border-[#5f6c4a]'}`}
            >
              {submittedMessage}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
