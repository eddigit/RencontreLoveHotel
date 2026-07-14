"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createEvent } from "@/actions/event-actions"
import { ProtectedRoute } from "@/components/protected-route"
import { getOption } from "@/actions/user-actions"
import { useAuth } from "@/contexts/auth-context" // Ajouté pour récupérer l'admin connecté
import { EventPhotoField } from "@/components/event-photo-field"

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

export default function AdminCreateEventPage() {
  const router = useRouter()
  const { user } = useAuth() // Récupère l'utilisateur/admin connecté
  const [form, setForm] = useState({
    title: "",
    location: "",
    date: "",
    image: "",
    category: "jacuzzi",
    description: "",
    prix_personne_seule: 0,
    prix_couple: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])

	  useEffect(() => {
	    async function fetchCategories() {
	      const raw = await getOption("event_categories")
	      setCategories(parseActiveEventCategories(raw))
	    }
	    fetchCategories()
	  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    if (!user?.id) {
      setError("Vous devez être connecté pour créer un événement.")
      setLoading(false)
      return
    }
    try {
      await createEvent({
        title: form.title,
        location: form.location,
        date: form.date,
        image: form.image,
	        category: form.category,
	        experience_type: form.category,
        description: form.description,
        prix_personne_seule: form.prix_personne_seule,
        prix_couple: form.prix_couple,
        creator_id: user.id // Correction : on passe bien l'admin comme créateur
      })
      router.push("/admin/events")
    } catch (err) {
      setError("Erreur lors de la création de l'événement.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="container py-10 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Créer un nouvel événement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input name="title" placeholder="Titre" value={form.title} onChange={handleChange} className="w-full border rounded p-2" required />
              <input name="location" placeholder="Lieu" value={form.location} onChange={handleChange} className="w-full border rounded p-2" required />
              <input name="date" type="datetime-local" placeholder="Date" value={form.date} onChange={handleChange} className="w-full border rounded p-2" required />
              <EventPhotoField
                value={form.image}
                onChange={value => setForm({ ...form, image: value })}
                category={form.category}
                experienceType={form.category}
              />
              <select name="category" value={form.category} onChange={handleChange} className="w-full border rounded p-2">
                <option value="">Catégorie</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} className="w-full border rounded p-2" />
              <input name="prix_personne_seule" type="number" min="0" step="0.01" placeholder="Prix par personne seule (€)" value={form.prix_personne_seule} onChange={handleChange} className="w-full border rounded p-2" />
              <input name="prix_couple" type="number" min="0" step="0.01" placeholder="Prix par couple (€)" value={form.prix_couple} onChange={handleChange} className="w-full border rounded p-2" />
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Création..." : "Créer l'événement"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
