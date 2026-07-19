'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { OnboardingAvatarStep } from '@/components/onboarding-avatar-step'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export interface OnboardingData {
  status: 'couple' | 'single_male' | 'single_female' | ''
  age: number | null
  orientation: 'hetero' | 'homo' | 'bi' | ''
  gender: 'male' | 'female' | 'couple' | ''
  birthday: string
  coupleComposition: 'mixed' | 'male_male' | 'female_female' | 'other' | ''
  avatarUrl: string
  seekingProfileTypes: Array<'male' | 'female' | 'couple'>
  relationshipIntents: Array<'serious' | 'regular' | 'casual' | 'libertine' | 'friendship'>
  bdsmRoles: Array<'discovery' | 'dominant' | 'submissive' | 'switch' | 'none'>
  interestedInRestaurant: boolean
  interestedInEvents: boolean
  interestedInDating: boolean
  preferCurtainOpen: boolean
  interestedInLolib: boolean
  suggestions: string
  meetingTypes: {
    friendly: boolean
    romantic: boolean
    playful: boolean
    openCurtains: boolean
    libertine: boolean
  }
  openToOtherCouples: boolean
  specificPreferences: string
  joinExclusiveEvents: boolean
  premiumAccess: boolean
}

const initialData: OnboardingData = {
  status: '', age: null, orientation: '', gender: '', birthday: '', coupleComposition: '', avatarUrl: '',
  seekingProfileTypes: [], relationshipIntents: [], bdsmRoles: [],
  interestedInRestaurant: false, interestedInEvents: false, interestedInDating: false,
  preferCurtainOpen: false, interestedInLolib: false, suggestions: '',
  meetingTypes: { friendly: false, romantic: false, playful: false, openCurtains: false, libertine: false },
  openToOtherCouples: false, specificPreferences: '', joinExclusiveEvents: false, premiumAccess: false
}

const profileTypes = [
  ['male', 'Hommes'], ['female', 'Femmes'], ['couple', 'Couples']
] as const
const relationshipIntents = [
  ['serious', 'Relation sérieuse'], ['regular', 'Relation régulière'], ['casual', 'Rencontre occasionnelle'],
  ['libertine', 'Relation libertine'], ['friendship', 'Relation amicale']
] as const
const bdsmRoles = [
  ['discovery', 'Découverte'], ['dominant', 'Dominant·e'], ['submissive', 'Soumis·e'],
  ['switch', 'Switch'], ['none', 'Sans BDSM']
] as const
const meetingTypes = [
  ['friendly', 'Rencontres amicales'], ['romantic', 'Rencontres romantiques'],
  ['playful', 'Rencontres ludiques'], ['openCurtains', 'Rideaux ouverts'], ['libertine', 'Afters libertins']
] as const

function Choice({ id, checked, label, onChange }: { id: string; checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-purple-800/50 bg-purple-900/20 p-3'>
      <Checkbox id={id} checked={checked} onCheckedChange={value => onChange(value === true)} className='border-purple-500 data-[state=checked]:border-[#ff3b8b] data-[state=checked]:bg-[#ff3b8b]' />
      <Label htmlFor={id} className='flex-1 cursor-pointer'>{label}</Label>
    </div>
  )
}

export function OnboardingForm({ onComplete }: { onComplete: (data: OnboardingData) => void | Promise<void> }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingData>(initialData)
  const [submitting, setSubmitting] = useState(false)
  const totalSteps = 5

  const updateFormData = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setFormData(previous => ({ ...previous, [field]: value }))
  }

  const updateStatus = (status: OnboardingData['status']) => {
    const gender = status === 'couple' ? 'couple' : status === 'single_male' ? 'male' : status === 'single_female' ? 'female' : ''
    setFormData(previous => ({ ...previous, status, gender, coupleComposition: status === 'couple' ? previous.coupleComposition : '' }))
  }

  const toggleArrayValue = (field: 'seekingProfileTypes' | 'relationshipIntents' | 'bdsmRoles', value: string) => {
    setFormData(previous => {
      const current = previous[field] as string[]
      if (field === 'bdsmRoles' && value === 'none') {
        return { ...previous, bdsmRoles: current.includes('none') ? [] : ['none'] }
      }
      const eligible = field === 'bdsmRoles' ? current.filter(item => item !== 'none') : current
      const next = eligible.includes(value) ? eligible.filter(item => item !== value) : [...eligible, value]
      return { ...previous, [field]: next }
    })
  }

  const setMeetingType = (field: keyof OnboardingData['meetingTypes'], value: boolean) => {
    setFormData(previous => ({ ...previous, meetingTypes: { ...previous.meetingTypes, [field]: value } }))
  }

  const isStepValid = () => {
    if (step === 1) {
      return Boolean(formData.status && formData.age && formData.orientation && formData.birthday && (formData.status !== 'couple' || formData.coupleComposition))
    }
    if (step === 2) return true
    if (step === 3) return true
    if (step === 4) return Object.values(formData.meetingTypes).some(Boolean)
    return true
  }

  const nextStep = async () => {
    if (submitting || !isStepValid()) return
    if (step < totalSteps) {
      setStep(current => current + 1)
      window.scrollTo(0, 0)
      return
    }
    setSubmitting(true)
    try {
      await onComplete(formData)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className='mx-auto w-full max-w-lg border-0 bg-gradient-to-b from-[#2d1155]/90 to-[#1a0d2e]/90 text-white shadow-lg shadow-purple-900/20'>
      <CardHeader className='space-y-2 pb-4'>
        <div className='flex items-center justify-between gap-3'>
          <CardTitle className='text-xl font-bold'>Personnalisation de votre profil</CardTitle>
          <span className='shrink-0 text-sm'>Étape {step}/{totalSteps}</span>
        </div>
        <CardDescription className='text-purple-200/80'>Ces informations structurent la découverte et la compatibilité.</CardDescription>
        <Progress value={(step / totalSteps) * 100} className='h-1 bg-purple-900/30' indicatorClassName='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8]' />
      </CardHeader>

      <CardContent className='space-y-5 pt-2'>
        {step === 1 && (
          <div className='space-y-5'>
            <div className='space-y-2'>
              <Label>Votre profil</Label>
              <RadioGroup value={formData.status} onValueChange={value => updateStatus(value as OnboardingData['status'])} className='grid gap-2'>
                {[['single_male', 'Homme'], ['single_female', 'Femme'], ['couple', 'Couple']].map(([value, label]) => (
                  <div key={value} className='flex items-center gap-3 rounded-xl border border-purple-800/50 bg-purple-900/20 p-3'>
                    <RadioGroupItem value={value} id={`status-${value}`} className='border-purple-500' />
                    <Label htmlFor={`status-${value}`} className='flex-1 cursor-pointer'>{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            {formData.status === 'couple' && (
              <div className='space-y-2'>
                <Label>Composition du couple</Label>
                <Select value={formData.coupleComposition} onValueChange={value => updateFormData('coupleComposition', value as OnboardingData['coupleComposition'])}>
                  <SelectTrigger className='border-purple-800/50 bg-purple-900/20'><SelectValue placeholder='Sélectionnez' /></SelectTrigger>
                  <SelectContent><SelectItem value='mixed'>Femme / Homme</SelectItem><SelectItem value='male_male'>Homme / Homme</SelectItem><SelectItem value='female_female'>Femme / Femme</SelectItem><SelectItem value='other'>Autre composition</SelectItem></SelectContent>
                </Select>
              </div>
            )}
            <div className='space-y-2'>
              <Label>Orientation</Label>
              <Select value={formData.orientation} onValueChange={value => updateFormData('orientation', value as OnboardingData['orientation'])}>
                <SelectTrigger className='border-purple-800/50 bg-purple-900/20'><SelectValue placeholder='Sélectionnez' /></SelectTrigger>
                <SelectContent><SelectItem value='hetero'>Hétéro</SelectItem><SelectItem value='bi'>Bi</SelectItem><SelectItem value='homo'>{formData.gender === 'female' ? 'Lesbienne' : formData.gender === 'male' ? 'Gay' : 'Gay ou lesbienne'}</SelectItem></SelectContent>
              </Select>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'><Label htmlFor='age'>Âge</Label><Select value={formData.age?.toString() || ''} onValueChange={value => updateFormData('age', Number(value))}><SelectTrigger id='age' className='border-purple-800/50 bg-purple-900/20'><SelectValue placeholder='Âge' /></SelectTrigger><SelectContent>{Array.from({ length: 82 }, (_, index) => index + 18).map(age => <SelectItem key={age} value={String(age)}>{age} ans</SelectItem>)}</SelectContent></Select></div>
              <div className='space-y-2'><Label htmlFor='birthday'>Date de naissance</Label><Input id='birthday' type='date' value={formData.birthday} onChange={event => updateFormData('birthday', event.target.value)} className='border-purple-800/50 bg-purple-900/20' /></div>
            </div>
            <p className='text-xs leading-5 text-purple-100/65'>Réservé aux personnes majeures. L’âge et la date permettent de contrôler la cohérence du profil.</p>
          </div>
        )}

        {step === 2 && <OnboardingAvatarStep status={formData.status} gender={formData.gender} avatarUrl={formData.avatarUrl} onAvatarSaved={url => updateFormData('avatarUrl', url)} onContinue={() => void nextStep()} />}

        {step === 3 && (
          <div className='space-y-6'>
            <div className='space-y-3'><div><h2 className='font-bold'>Profils recherchés</h2><p className='text-sm text-purple-100/65'>Plusieurs choix possibles. Aucun choix reste permissif.</p></div>{profileTypes.map(([value, label]) => <Choice key={value} id={`seeking-${value}`} label={label} checked={formData.seekingProfileTypes.includes(value)} onChange={() => toggleArrayValue('seekingProfileTypes', value)} />)}</div>
            <div className='space-y-3'><h2 className='font-bold'>Nature de la relation</h2>{relationshipIntents.map(([value, label]) => <Choice key={value} id={`intent-${value}`} label={label} checked={formData.relationshipIntents.includes(value)} onChange={() => toggleArrayValue('relationshipIntents', value)} />)}</div>
            <div className='space-y-3'><div><h2 className='font-bold'>Affinités BDSM</h2><p className='text-sm text-purple-100/65'>Facultatif. « Sans BDSM » exclut les autres choix.</p></div>{bdsmRoles.map(([value, label]) => <Choice key={value} id={`bdsm-${value}`} label={label} checked={formData.bdsmRoles.includes(value)} onChange={() => value === 'none' ? toggleArrayValue('bdsmRoles', 'none') : toggleArrayValue('bdsmRoles', value)} />)}</div>
          </div>
        )}

        {step === 4 && (
          <div className='space-y-5'>
            <div><h2 className='font-bold'>Vos univers de rencontre</h2><p className='text-sm text-purple-100/65'>Choisissez au moins un univers.</p></div>
            <div className='space-y-3'>{meetingTypes.map(([value, label]) => <Choice key={value} id={`meeting-${value}`} label={label} checked={formData.meetingTypes[value]} onChange={checked => setMeetingType(value, checked)} />)}</div>
            <div className='grid gap-3'><Choice id='restaurant' label='Sorties au restaurant' checked={formData.interestedInRestaurant} onChange={value => updateFormData('interestedInRestaurant', value)} /><Choice id='events' label='Événements du Love Hôtel' checked={formData.interestedInEvents} onChange={value => updateFormData('interestedInEvents', value)} /><Choice id='dating' label='Rencontres via la plateforme' checked={formData.interestedInDating} onChange={value => updateFormData('interestedInDating', value)} /><Choice id='curtain' label='Préférence rideau ouvert' checked={formData.preferCurtainOpen} onChange={value => updateFormData('preferCurtainOpen', value)} /><Choice id='lolib' label='Intérêt pour la monnaie Lolib' checked={formData.interestedInLolib} onChange={value => updateFormData('interestedInLolib', value)} /><Choice id='other-couples' label='Ouvert·e aux couples' checked={formData.openToOtherCouples} onChange={value => updateFormData('openToOtherCouples', value)} /></div>
          </div>
        )}

        {step === 5 && (
          <div className='space-y-5'>
            <div><h2 className='text-lg font-bold'>Derniers réglages</h2><p className='text-sm text-purple-100/65'>Vous pourrez modifier ces choix depuis votre profil.</p></div>
            <Choice id='exclusive-events' label='Participer aux événements exclusifs' checked={formData.joinExclusiveEvents} onChange={value => updateFormData('joinExclusiveEvents', value)} />
            <Choice id='premium-access' label='Être informé·e de l’accès Premium' checked={formData.premiumAccess} onChange={value => updateFormData('premiumAccess', value)} />
            <div className='space-y-2'><Label htmlFor='preferences'>Préférences spécifiques</Label><Textarea id='preferences' value={formData.specificPreferences} onChange={event => updateFormData('specificPreferences', event.target.value)} placeholder='Vos critères ou préférences particulières…' className='min-h-24 border-purple-800/50 bg-purple-900/20' /></div>
            <div className='space-y-2'><Label htmlFor='suggestions'>Suggestions pour la communauté</Label><Textarea id='suggestions' value={formData.suggestions} onChange={event => updateFormData('suggestions', event.target.value)} placeholder='Vos idées d’événements ou de fonctionnalités…' className='min-h-20 border-purple-800/50 bg-purple-900/20' /></div>
            <div className='rounded-xl border border-[#ff3b8b]/30 bg-[#ff3b8b]/10 p-4 text-sm text-purple-100'>Votre photo personnelle reste prioritaire dans la découverte. Sans photo, l’avatar natif correspondant à votre profil sera utilisé.</div>
          </div>
        )}
      </CardContent>

      <CardFooter className='flex justify-between gap-3 pt-3'>
        <Button type='button' variant='outline' onClick={() => { setStep(current => Math.max(1, current - 1)); window.scrollTo(0, 0) }} disabled={step === 1 || submitting} className='border-purple-800/50 bg-purple-900/20 text-white hover:bg-purple-900/40'><ArrowLeft className='mr-2 h-4 w-4' />Précédent</Button>
        <Button type='button' onClick={() => void nextStep()} disabled={!isStepValid() || submitting} className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>{step === totalSteps ? <>{submitting ? 'Enregistrement…' : 'Terminer'}<Check className='ml-2 h-4 w-4' /></> : <>Suivant<ArrowRight className='ml-2 h-4 w-4' /></>}</Button>
      </CardFooter>
    </Card>
  )
}
