'use client'

import { useState } from 'react'
import { Mail, MessageCircle, CalendarDays, Heart } from 'lucide-react'
import { updateActivityEmailPreference, type ActivityEmailPreferences } from '@/actions/email-preference-actions'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

type ActivityEmailPreferencesFormProps = {
  initialPreference: ActivityEmailPreferences
}

export function ActivityEmailPreferencesForm({
  initialPreference
}: ActivityEmailPreferencesFormProps) {
  const [preference, setPreference] = useState(initialPreference)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const setConsent = (consent: boolean) => {
    setSaved(false)
    setPreference(current => ({
      ...current,
      consent,
      messages: consent ? current.messages : false,
      matches: consent ? current.matches : false,
      events: consent ? current.events : false
    }))
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const result = await updateActivityEmailPreference({
        ...preference,
        source: 'member_preferences'
      })
      setPreference(result)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const categories = [
    { key: 'messages' as const, label: 'Nouveaux messages', icon: MessageCircle },
    { key: 'matches' as const, label: 'Demandes et confirmations de match', icon: Heart },
    { key: 'events' as const, label: 'Activité de mes événements', icon: CalendarDays }
  ]

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between gap-4 rounded-md border border-border p-4'>
        <div className='flex min-w-0 items-start gap-3'>
          <Mail className='mt-0.5 h-5 w-5 shrink-0 text-primary' />
          <div>
            <p className='font-medium'>Notifications d’activité par e-mail</p>
            <p className='text-sm text-muted-foreground'>
              Autorisation générale, désactivée par défaut.
            </p>
          </div>
        </div>
        <Switch
          aria-label='Autoriser les notifications d’activité par e-mail'
          checked={preference.consent}
          onCheckedChange={setConsent}
        />
      </div>

      <div className='divide-y divide-border rounded-md border border-border'>
        {categories.map(({ key, label, icon: Icon }) => (
          <div key={key} className='flex items-center justify-between gap-4 p-4'>
            <div className='flex items-center gap-3'>
              <Icon className='h-4 w-4 text-muted-foreground' />
              <span className='text-sm font-medium'>{label}</span>
            </div>
            <Switch
              aria-label={label}
              checked={preference[key]}
              disabled={!preference.consent}
              onCheckedChange={checked => {
                setSaved(false)
                setPreference(current => ({ ...current, [key]: checked }))
              }}
            />
          </div>
        ))}
      </div>

      <div className='flex items-center gap-3'>
        <Button type='button' onClick={save} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer mes choix'}
        </Button>
        {saved && <span className='text-sm text-emerald-400'>Choix enregistrés</span>}
      </div>
    </div>
  )
}
