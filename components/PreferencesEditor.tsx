"use client"

import React, { useState } from "react"
import { CalendarHeart, HeartHandshake, Save, Sparkles } from "lucide-react"
import { DesireIcon } from "./desire-icon"
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
    <form onSubmit={handleSubmit} className="mt-5 space-y-6 text-[#ecebe7]">
      <section className="grid gap-4 md:grid-cols-2">
        <PreferenceTile
          icon={<HeartHandshake className="h-5 w-5 text-[#c1121f]" />}
          title="Rencontres"
          checked={form.interested_in_dating}
          onCheckedChange={value => setForm(f => ({ ...f, interested_in_dating: value }))}
        />
        <PreferenceTile
          icon={<CalendarHeart className="h-5 w-5 text-[#c1121f]" />}
          title="Événements"
          checked={form.interested_in_events}
          onCheckedChange={value => setForm(f => ({ ...f, interested_in_events: value }))}
        />
      </section>

      <section className="rounded-2xl border border-[#111821] bg-[#04070b] p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#c1121f]" />
          <h4 className="font-black">Intentions de rencontre</h4>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {matchingOptions.map(option => (
            <label key={option.key} className="flex gap-3 rounded-2xl border border-[#111821] bg-[#111821] p-4">
              <Checkbox
                checked={Boolean(form[option.key])}
                onCheckedChange={value => setForm(f => ({ ...f, [option.key]: value as boolean }))}
              />
              <span>
                <span className="flex items-center gap-2 font-bold"><DesireIcon value={option.key} className="size-5 shrink-0 text-[#fae092]" />{option.label}</span>
                <span className="mt-1 block text-sm leading-5 text-[#c9c7c2]">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="flex gap-3 rounded-2xl border border-[#111821] bg-[#111821] p-4">
          <Checkbox
            checked={form.prefer_curtain_open}
            onCheckedChange={value => setForm(f => ({ ...f, prefer_curtain_open: value as boolean }))}
          />
          <span>
            <span className="flex items-center gap-2 font-bold"><DesireIcon value="open_curtains" className="size-5 text-[#fae092]" />Rideaux ouverts</span>
            <span className="text-sm text-[#c9c7c2]">Intéressé par les soirées où les chambres peuvent être ouvertes.</span>
          </span>
        </label>
        <label className="flex gap-3 rounded-2xl border border-[#111821] bg-[#111821] p-4">
          <Checkbox
            checked={form.join_exclusive_events}
            onCheckedChange={value => setForm(f => ({ ...f, join_exclusive_events: value as boolean }))}
          />
          <span>
            <span className="flex items-center gap-2 font-bold"><DesireIcon value="jacuzzi" className="size-5 text-[#fae092]" />Apéro jacuzzi</span>
            <span className="text-sm text-[#c9c7c2]">Invitations champagne, jacuzzi, couples et petits groupes.</span>
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
        <Button type="submit" disabled={saving} className="rounded-2xl bg-[#c1121f] text-[#ecebe7] hover:bg-[#e13b47]">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer le matching"}
        </Button>
        {success && <div className="text-sm text-[#c9c7c2]">Préférences enregistrées.</div>}
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
    <label className="flex items-center gap-3 rounded-2xl border border-[#111821] bg-[#111821] p-4">
      <Checkbox checked={checked} onCheckedChange={value => onCheckedChange(value as boolean)} />
      {icon}
      <span className="font-bold">{title}</span>
    </label>
  )
}
