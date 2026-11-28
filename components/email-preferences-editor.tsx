'use client'

import { useState } from 'react'
import { BellRing, Mail, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export type OwnEmailPreferences = {
  campaignOptIn: boolean
  activityEmailConsent: boolean
  messageEmailEnabled: boolean
  matchEmailEnabled: boolean
  eventEmailEnabled: boolean
}

type Props = {
  preferences: OwnEmailPreferences
  onSave: (input: OwnEmailPreferences) => Promise<OwnEmailPreferences | void>
}

const activityCategories: Array<{
  key: keyof Pick<OwnEmailPreferences, 'messageEmailEnabled' | 'matchEmailEnabled' | 'eventEmailEnabled'>
  title: string
  description: string
}> = [
  {
    key: 'messageEmailEnabled',
    title: 'Nouveaux messages',
    description: 'Être prévenu lorsqu’un membre vous écrit.'
  },
  {
    key: 'matchEmailEnabled',
    title: 'Nouveaux matchs',
    description: 'Recevoir les demandes de match et être prévenu lorsqu’une demande est acceptée.'
  },
  {
    key: 'eventEmailEnabled',
    title: 'Événements',
    description: 'Recevoir une confirmation après votre inscription à un événement.'
  }
]

export function EmailPreferencesEditor ({ preferences, onSave }: Props) {
  const [form, setForm] = useState<OwnEmailPreferences>(preferences)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = <Key extends keyof OwnEmailPreferences>(key: Key, value: OwnEmailPreferences[Key]) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const updateActivityConsent = (enabled: boolean) => {
    setForm(current => ({
      ...current,
      activityEmailConsent: enabled,
      ...(enabled
        ? {}
        : {
            messageEmailEnabled: false,
            matchEmailEnabled: false,
            eventEmailEnabled: false
          })
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    setError(null)

    try {
      const saved = await onSave(form)
      if (saved) setForm(saved)
      setNotice('Vos préférences e-mail sont enregistrées.')
    } catch {
      setError('Vos préférences e-mail n’ont pas pu être enregistrées. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='mt-5 space-y-5 text-[#ecebe7]'>
      <p className='text-sm leading-6 text-[#c9c7c2]'>
        Choisissez les e-mails que vous souhaitez recevoir. Les e-mails indispensables à la sécurité de votre compte restent séparés de ces choix.
      </p>

      <section aria-labelledby='campaign-email-heading' className='rounded-2xl border border-[#111821] bg-[#04070b] p-5'>
        <div className='flex gap-3'>
          <Checkbox
            id='campaign-opt-in'
            checked={form.campaignOptIn}
            onCheckedChange={value => update('campaignOptIn', value === true)}
            className='mt-1'
          />
          <div>
            <label id='campaign-email-heading' htmlFor='campaign-opt-in' className='flex cursor-pointer items-center gap-2 font-bold'>
              <Mail className='h-4 w-4 text-[#d6bc87]' />
              Actualités et invitations
            </label>
            <p className='mt-1 text-sm leading-5 text-[#c9c7c2]'>
              Recevoir les actualités, nouveautés et invitations de Love Hotel Rencontre.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby='activity-email-heading' className='rounded-2xl border border-[#111821] bg-[#04070b] p-5'>
        <div className='flex gap-3'>
          <Checkbox
            id='activity-email-consent'
            checked={form.activityEmailConsent}
            onCheckedChange={value => updateActivityConsent(value === true)}
            className='mt-1'
          />
          <div>
            <label id='activity-email-heading' htmlFor='activity-email-consent' className='flex cursor-pointer items-center gap-2 font-bold'>
              <BellRing className='h-4 w-4 text-[#d6bc87]' />
              Activité de mon compte
            </label>
            <p className='mt-1 text-sm leading-5 text-[#c9c7c2]'>
              Autoriser les notifications e-mail liées à votre activité, puis choisir les catégories ci-dessous.
            </p>
          </div>
        </div>

        <fieldset disabled={!form.activityEmailConsent} className='mt-5 grid gap-3 sm:grid-cols-3'>
          <legend className='sr-only'>Catégories de notifications d’activité</legend>
          {activityCategories.map(category => (
            <label key={category.key} className='flex cursor-pointer gap-3 rounded-xl border border-[#3b3b38] bg-[#111821] p-4 disabled:cursor-not-allowed disabled:opacity-50'>
              <Checkbox
                checked={form[category.key]}
                onCheckedChange={value => update(category.key, value === true)}
              />
              <span>
                <span className='block text-sm font-bold'>{category.title}</span>
                <span className='mt-1 block text-xs leading-5 text-[#c9c7c2]'>{category.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {!form.activityEmailConsent && (
          <p className='mt-3 text-xs text-[#c9c7c2]'>Activez l’activité de mon compte pour choisir une catégorie.</p>
        )}
      </section>

      <div className='flex flex-wrap items-center gap-3'>
        <Button type='submit' disabled={saving} className='rounded-2xl bg-graphite text-graphite-ink hover:bg-graphite-hover'>
          <Save className='mr-2 h-4 w-4' />
          {saving ? 'Enregistrement…' : 'Enregistrer mes préférences e-mail'}
        </Button>
        {notice && <p role='status' aria-live='polite' className='text-sm text-[#94ffc9]'>{notice}</p>}
        {error && <p role='alert' className='text-sm text-[#ffb2d9]'>{error}</p>}
      </div>
    </form>
  )
}
