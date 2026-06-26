"use client"

import React, { useState } from "react"
import { CalendarHeart, HeartHandshake, Save, Sparkles, Wine } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"

const matchingOptions = [
  { key: "friendly", label: "Rencontre amicale", hint: "Prendre un verre, discuter, découvrir." },
  { key: "romantic", label: "Romantique", hint: "Dîner, chambre élégante, moment intime." },
  { key: "playful", label: "Ludique", hint: "Ambiance légère, flirt, surprise." },
  { key: "open_curtains", label: "Rideaux ouverts", hint: "Événements et expériences plus ouvertes." },
  { key: "libertine", label: "Libertinage soft", hint: "Cadre assumé, élégant, consenti." },
  { key: "open_to_other_couples", label: "Ouvert aux couples", hint: "Rencontres entre couples compatibles." },
] as const

export function PreferencesEditor({ preferences, meetingTypes, additionalOptions, onSave }: any) {
  const [form, setForm] = useState({
    interested_in_restaurant: preferences.interested_in_restaurant || false,
    interested_in_events: preferences.interested_in_events || false,
    interested_in_dating: preferences.interested_in_dating || false,
    prefer_curtain_open: preferences.prefer_curtain_open || false,
    interested_in_lolib: preferences.interested_in_lolib || false,
    suggestions: preferences.suggestions || "",
    friendly: meetingTypes.friendly || false,
    romantic: meetingTypes.romantic || false,
    playful: meetingTypes.playful || false,
    open_curtains: meetingTypes.open_curtains || false,
    libertine: meetingTypes.libertine || false,
    open_to_other_couples: meetingTypes.open_to_other_couples || false,
    specific_preferences: meetingTypes.specific_preferences || "",
    join_exclusive_events: additionalOptions.join_exclusive_events || false,
    premium_access: additionalOptions.premium_access || false,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    await onSave({
      preferences: {
        interested_in_restaurant: form.interested_in_restaurant,
        interested_in_events: form.interested_in_events,
        interested_in_dating: form.interested_in_dating,
        prefer_curtain_open: form.prefer_curtain_open,
        interested_in_lolib: form.interested_in_lolib,
        suggestions: form.suggestions,
      },
      meetingTypes: {
        friendly: form.friendly,
        romantic: form.romantic,
        playful: form.playful,
        open_curtains: form.open_curtains,
        libertine: form.libertine,
        open_to_other_couples: form.open_to_other_couples,
        specific_preferences: form.specific_preferences,
      },
      additionalOptions: {
        join_exclusive_events: form.join_exclusive_events,
        premium_access: form.premium_access,
      },
    })
    setSaving(false)
    setSuccess(true)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-6 text-white">
      <section className="grid gap-4 md:grid-cols-3">
        <PreferenceTile
          icon={<HeartHandshake className="h-5 w-5 text-[#ff8cc8]" />}
          title="Rencontres"
          checked={form.interested_in_dating}
          onCheckedChange={value => setForm(f => ({ ...f, interested_in_dating: value }))}
        />
        <PreferenceTile
          icon={<CalendarHeart className="h-5 w-5 text-[#94ffc9]" />}
          title="Événements"
          checked={form.interested_in_events}
          onCheckedChange={value => setForm(f => ({ ...f, interested_in_events: value }))}
        />
        <PreferenceTile
          icon={<Wine className="h-5 w-5 text-[#ffd166]" />}
          title="Restaurant / bar"
          checked={form.interested_in_restaurant}
          onCheckedChange={value => setForm(f => ({ ...f, interested_in_restaurant: value }))}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#ff8cc8]" />
          <h4 className="font-black">Intentions de rencontre</h4>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {matchingOptions.map(option => (
            <label key={option.key} className="flex gap-3 rounded-2xl border border-white/10 bg-black/10 p-4">
              <Checkbox
                checked={Boolean(form[option.key])}
                onCheckedChange={value => setForm(f => ({ ...f, [option.key]: value as boolean }))}
              />
              <span>
                <span className="block font-bold">{option.label}</span>
                <span className="mt-1 block text-sm leading-5 text-white/54">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <Checkbox
            checked={form.prefer_curtain_open}
            onCheckedChange={value => setForm(f => ({ ...f, prefer_curtain_open: value as boolean }))}
          />
          <span>
            <span className="block font-bold">Rideaux ouverts</span>
            <span className="text-sm text-white/54">Intéressé par les soirées où les chambres peuvent être ouvertes.</span>
          </span>
        </label>
        <label className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <Checkbox
            checked={form.join_exclusive_events}
            onCheckedChange={value => setForm(f => ({ ...f, join_exclusive_events: value as boolean }))}
          />
          <span>
            <span className="block font-bold">Apéro jacuzzi</span>
            <span className="text-sm text-white/54">Invitations champagne, jacuzzi, couples et petits groupes.</span>
          </span>
        </label>
      </section>

      <section className="grid gap-3">
        <Input
          name="specific_preferences"
          value={form.specific_preferences}
          onChange={handleChange}
          className="h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/40"
          placeholder="Préférences spécifiques : champagne, Love Room, horaires, limites..."
        />
        <Input
          name="suggestions"
          value={form.suggestions}
          onChange={handleChange}
          className="h-12 rounded-2xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/40"
          placeholder="Suggestions ou envies à proposer à l’équipe Love Hotel"
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving} className="rounded-2xl bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer le matching"}
        </Button>
        {success && <div className="text-sm text-[#94ffc9]">Préférences enregistrées.</div>}
      </div>
    </form>
  )
}

function PreferenceTile({
  icon,
  title,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode
  title: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <Checkbox checked={checked} onCheckedChange={value => onCheckedChange(value as boolean)} />
      {icon}
      <span className="font-bold">{title}</span>
    </label>
  )
}
