"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { updateEvent, getUpcomingEvents } from "@/actions/event-actions"
import { getOption } from "@/actions/user-actions"
import { ProtectedRoute } from "@/components/protected-route"
import MainLayout from "@/components/layout/main-layout"
import Link from "next/link"
import { AdminTabs } from "@/components/admin-tabs"
import { AdminHeader } from "@/components/admin-header"
import { useAuth } from "@/contexts/auth-context"
import { useEffect as useEffectReact } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ChangeEvent } from 'react'

const activeEventCategoriesFallback =
  'jacuzzi|Apéro jacuzzi 2 à 4 couples\nopen_curtains|Rideaux ouverts 2 ou 3 chambres'
const activeEventCategoryValues = new Set(['jacuzzi', 'open_curtains'])

function parseActiveEventCategories(raw?: string | null) {
  return (raw || activeEventCategoriesFallback)
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean)
    .map((line: string) => {
      const [value, label] = line.split("|")
      return value && label ? { value: value.trim(), label: label.trim() } : null
    })
    .filter(
      (category): category is { value: string; label: string } =>
        category !== null && activeEventCategoryValues.has(category.value)
    )
}

// Définition du type pour le formulaire
interface Form {
  title: string
  location: string
  date: string
  image: string
  category: string
  description: string
  price: number
  prix_personne_seule: number
  prix_couple: number
  payment_mode: 'sur_place' | 'online'
  conditions: string
}

export default function AdminEditEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params?.id as string
  const [form, setForm] = useState({
    title: "",
    location: "",
    date: "",
    image: "",
    category: "",
    description: "",
    price: 0,
    prix_personne_seule: 0,
    prix_couple: 0,
    payment_mode: 'sur_place' as 'sur_place' | 'online',
    conditions: ""
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    async function fetchEvent() {
      setLoading(true)
      // getUpcomingEvents returns all events, so find the one with the matching id
      const events = await getUpcomingEvents("")
      const event = events.find((e: any) => String(e.id) === String(eventId))
      if (event) {
        setForm({
          title: event.title || "",
          location: event.location || "",
          date: event.event_date
            ? typeof event.event_date === "string"
              ? event.event_date.slice(0, 16)
              : new Date(event.event_date).toISOString().slice(0, 16)
            : "",
          image: event.image || "",
          category: event.category || "",
          description: event.description || "",
          price: event.price || 0,
          prix_personne_seule: event.prix_personne_seule || 0,
          prix_couple: event.prix_couple || 0,
          payment_mode: event.payment_mode || 'sur_place',
          conditions: event.conditions || ""
        })
      }
      setLoading(false)
    }
    if (eventId) fetchEvent()
  }, [eventId])

	  useEffectReact(() => {
	    async function fetchCategories() {
	      const raw = await getOption("event_categories")
	      setCategories(parseActiveEventCategories(raw))
	    }
	    fetchCategories()
	  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]:
        name === 'price'
          ? parseFloat(value) || 0
          : name === 'payment_mode'
          ? (value as 'sur_place' | 'online')
          : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await updateEvent(eventId, {
        title: form.title,
        location: form.location,
        date: form.date,
        image: form.image,
        category: form.category,
        description: form.description,
        price: form.price,
        prix_personne_seule: form.prix_personne_seule,
        prix_couple: form.prix_couple,
        payment_mode: form.payment_mode,
        conditions: form.conditions
      })
      router.push("/admin/events")
    } catch (err) {
      setError("Erreur lors de la modification de l'événement.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <MainLayout user={user}>
        <div className="container py-10 max-w-xl">
          <AdminHeader user={user} />
          <AdminTabs />
          <Button asChild variant="outline" className="mb-4">
            <Link href="/admin/events">← Retour</Link>
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Modifier l'événement</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Chargement...</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input name="title" placeholder="Titre" value={form.title} onChange={handleChange} className="w-full border rounded p-2" required />
                  <input name="location" placeholder="Lieu" value={form.location} onChange={handleChange} className="w-full border rounded p-2" required />
                  <input name="date" type="datetime-local" placeholder="Date" value={form.date} onChange={handleChange} className="w-full border rounded p-2" required />
                  <input name="image" placeholder="Image (URL)" value={form.image} onChange={handleChange} className="w-full border rounded p-2" />
                  <select name="category" value={form.category} onChange={handleChange} className="w-full border rounded p-2">
                    <option value="">Catégorie</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} className="w-full border rounded p-2" />
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (€)</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={handleChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prix_personne_seule">Prix par personne seule (€)</Label>
                    <Input
                      id="prix_personne_seule"
                      name="prix_personne_seule"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.prix_personne_seule}
                      onChange={handleChange}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prix_couple">Prix par couple (€)</Label>
                    <Input
                      id="prix_couple"
                      name="prix_couple"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.prix_couple}
                      onChange={handleChange}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_mode">Mode de paiement</Label>
                    <select
                      id="payment_mode"
                      name="payment_mode"
                      value={form.payment_mode}
                      onChange={handleChange}
                      className="w-full border rounded p-2"
                    >
                      <option value="sur_place">Sur place</option>
                      <option value="online">En ligne</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conditions">Conditions et informations complémentaires</Label>
                    <Textarea
                      id="conditions"
                      name="conditions"
                      value={form.conditions}
                      onChange={handleChange}
                      className="w-full border rounded p-2"
                      rows={3}
                    />
                  </div>
                  {error && <div className="text-red-500 text-sm">{error}</div>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Modification..." : "Enregistrer les modifications"}</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
