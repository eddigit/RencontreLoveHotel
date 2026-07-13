'use client'

import { useEffect, useState } from 'react'
import { Mail, MessageCircle, CalendarDays, Heart } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  getActivityEmailPreference,
  updateActivityEmailPreference,
  type ActivityEmailPreferences
} from '@/actions/email-preference-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'

const EMPTY_PREFERENCE: ActivityEmailPreferences = {
  consent: false,
  decisionRequired: true,
  messages: false,
  matches: false,
  events: false
}

export function ActivityEmailConsentPrompt() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preference, setPreference] = useState(EMPTY_PREFERENCE)

  useEffect(() => {
    let cancelled = false
    if (!user?.id) return

    getActivityEmailPreference()
      .then(preference => {
        if (cancelled) return
        setPreference(preference)
        if (preference.decisionRequired) setOpen(true)
      })
      .catch(error => {
        recoverFromStaleServerAction(error)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const saveChoice = async (choice: ActivityEmailPreferences) => {
    setSaving(true)
    try {
      const saved = await updateActivityEmailPreference({
        ...choice,
        source: 'login_prompt'
      })
      setPreference(saved)
      setOpen(false)
    } catch (error) {
      recoverFromStaleServerAction(error)
    } finally {
      setSaving(false)
    }
  }

  const categories = [
    { key: 'messages' as const, label: 'Messages', icon: MessageCircle },
    { key: 'matches' as const, label: 'Matchs', icon: Heart },
    { key: 'events' as const, label: 'Événements', icon: CalendarDays }
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <div className='mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary'>
            <Mail className='h-5 w-5' />
          </div>
          <DialogTitle>Rester informé de votre activité</DialogTitle>
          <DialogDescription>
            Souhaitez-vous recevoir par e-mail vos nouveaux messages, matchs et événements ? Rien ne sera envoyé sans votre accord.
          </DialogDescription>
        </DialogHeader>

        {customizing && (
          <div className='divide-y divide-border rounded-md border border-border'>
            {categories.map(({ key, label, icon: Icon }) => (
              <div key={key} className='flex items-center justify-between p-3'>
                <span className='flex items-center gap-2 text-sm font-medium'>
                  <Icon className='h-4 w-4 text-muted-foreground' />
                  {label}
                </span>
                <Switch
                  aria-label={label}
                  checked={preference[key]}
                  onCheckedChange={checked =>
                    setPreference(current => ({
                      ...current,
                      consent: true,
                      [key]: checked
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter className='gap-2 sm:flex-wrap'>
          <Button
            type='button'
            variant='ghost'
            disabled={saving}
            onClick={() => setCustomizing(current => !current)}
          >
            Personnaliser
          </Button>
          <Button
            type='button'
            variant='outline'
            disabled={saving}
            onClick={() => saveChoice(EMPTY_PREFERENCE)}
          >
            Non merci
          </Button>
          <Button
            type='button'
            disabled={saving}
            onClick={() => saveChoice(customizing
              ? { ...preference, consent: true }
              : {
                  consent: true,
                  decisionRequired: false,
                  messages: true,
                  matches: true,
                  events: true
                })}
          >
            Autoriser les e-mails
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
