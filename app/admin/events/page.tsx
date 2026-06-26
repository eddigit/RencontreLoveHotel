"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/protected-route"
import { getUpcomingEvents, deleteEvent, resetAllEvents } from "@/actions/event-actions"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import MainLayout from "@/components/layout/main-layout"
import { AdminTabs } from "@/components/admin-tabs"
import { AdminHeader } from "@/components/admin-header"

export default function AdminEventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [pastEvents, setPastEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showReprogramForm, setShowReprogramForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [status, setStatus] = useState("")

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      // Récupère les événements à venir
      const result = await getUpcomingEvents(user?.id || "")
      setEvents(result)
      // Récupère les événements passés
      const res = await fetch("/api/admin/events/past")
      const past = await res.json()
      setPastEvents(past)
      setLoading(false)
    }
    if (user?.id) fetchEvents()
  }, [user?.id])

  const handleDelete = async (eventId: string) => {
    if (!window.confirm("Supprimer cet événement ?")) return
    await deleteEvent(eventId)
    setEvents(events.filter(e => e.id !== eventId))
  }

  const handleResetAllEvents = async () => {
    const confirmed = window.confirm(
      "Mettre tous les événements à zéro ? Cette action supprime tous les événements et leurs participations."
    )
    if (!confirmed) return

    const result = await resetAllEvents()
    setEvents([])
    setPastEvents([])
    setStatus(`${result.deletedCount} événement(s) supprimé(s).`)
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <MainLayout user={user}>
        <div className="container py-10">
          <AdminHeader user={user} />
          <AdminTabs />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
            <h1 className="text-2xl font-bold">Gestion des événements</h1>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" onClick={handleResetAllEvents}>
                Mettre à zéro
              </Button>
              <Button asChild>
                <Link href="/admin/events/new">Créer un événement</Link>
              </Button>
            </div>
          </div>
          {status && (
            <div className="mb-5 rounded-lg border border-[#ff8cc8]/30 bg-[#ff3b8b]/10 px-4 py-3 text-sm text-white">
              {status}
            </div>
          )}
          {loading ? (
            <div>Chargement...</div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mt-8 mb-2">Événements à venir</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                  <Card key={event.id}>
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2 text-sm text-muted-foreground">
                        {event.location} | {event.event_date ? (typeof event.event_date === "string" ? event.event_date : new Date(event.event_date).toLocaleString()) : ""}
                      </div>
                      <div className="mb-2 text-sm text-muted-foreground">
                        Inscriptions : {event.attendees || event.participant_count || 0}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button size="sm" asChild>
                          <Link href={`/admin/events/${event.id}/edit`}>Éditer</Link>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(event.id)}>
                          Supprimer
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/admin/events/${event.id}/subscribers`}>Voir les inscrits</Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/admin/events/${event.id}/notify`}>Notifier</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <h2 className="text-xl font-semibold mt-8 mb-2">Anciens événements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastEvents.map(event => (
                  <Card key={event.id}>
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2 text-sm text-muted-foreground">
                        {event.location} | {event.event_date ? (typeof event.event_date === "string" ? event.event_date : new Date(event.event_date).toLocaleString()) : ""}
                      </div>
                      <div className="mb-2 text-sm text-muted-foreground">
                        Inscriptions : {event.attendees || event.participant_count || 0}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button size="sm" onClick={() => { setSelectedEvent(event); setShowReprogramForm(true); }}>
                          Reprogrammer
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/admin/events/${event.id}/edit`}>Éditer</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {showReprogramForm && selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                  <div className="bg-gray-900 p-0 rounded-lg shadow-lg w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
                    <h3 className="text-lg font-bold mb-2 px-8 pt-8 text-white">Reprogrammer et modifier l'événement</h3>
                    <form
                      onSubmit={async e => {
                        e.preventDefault()
                        const formData = new FormData(e.target as HTMLFormElement)
                        const payload = {
                          date: formData.get("date"),
                          title: formData.get("title"),
                          description: formData.get("description"),
                          image: formData.get("image"),
                          location: formData.get("location"),
                          price: formData.get("price"),
                          max_participants: formData.get("max_participants"),
                          category: formData.get("category"),
                          prix_personne_seule: formData.get("prix_personne_seule"),
                          prix_couple: formData.get("prix_couple"),
                          payment_mode: formData.get("payment_mode"),
                          conditions: formData.get("conditions")
                        }
                        await fetch(`/api/admin/events/${selectedEvent.id}/duplicate`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload)
                        })
                        setShowReprogramForm(false)
                      }}
                      className="overflow-auto px-8 pb-4 flex-1 text-white"
                      style={{ maxHeight: 'calc(90vh - 60px)' }}
                    >
                      <label className="block mb-2 mt-4">Nouvelle date</label>
                      <input type="datetime-local" name="date" defaultValue={selectedEvent.event_date?.slice(0,16)} className="mb-4 w-full border px-2 py-1 rounded" required />
                      <label className="block mb-2">Titre</label>
                      <input type="text" name="title" defaultValue={selectedEvent.title} className="mb-4 w-full border px-2 py-1 rounded" required />
                      <label className="block mb-2">Description</label>
                      <textarea name="description" defaultValue={selectedEvent.description} className="mb-4 w-full border px-2 py-1 rounded" />
                      <label className="block mb-2">Image (URL)</label>
                      <input type="text" name="image" defaultValue={selectedEvent.image} className="mb-4 w-full border px-2 py-1 rounded" />
                      <label className="block mb-2">Lieu</label>
                      <input type="text" name="location" defaultValue={selectedEvent.location} className="mb-4 w-full border px-2 py-1 rounded" />
                      <label className="block mb-2">Prix</label>
                      <input type="number" name="price" defaultValue={selectedEvent.price} className="mb-4 w-full border px-2 py-1 rounded" />
                      <label className="block mb-2">Nombre max de participants</label>
                      <input type="number" name="max_participants" defaultValue={selectedEvent.max_participants} className="mb-4 w-full border px-2 py-1 rounded" />
                      <label className="block mb-2">Catégorie</label>
                      <input type="text" name="category" defaultValue={selectedEvent.category} className="mb-4 w-full border px-2 py-1 rounded" />
                      <label className="block mb-2">Prix personne seule</label>
                      <input type="number" name="prix_personne_seule" defaultValue={selectedEvent.prix_personne_seule} className="mb-4 w-full border px-2 py-1 rounded" />
                      <label className="block mb-2">Prix couple</label>
                      <input type="number" name="prix_couple" defaultValue={selectedEvent.prix_couple} className="mb-4 w-full border px-2 py-1 rounded" />
                      <label className="block mb-2">Mode de paiement</label>
                      <input type="text" name="payment_mode" defaultValue={selectedEvent.payment_mode} className="mb-4 w-full border px-2 py-1 rounded" />
                      <label className="block mb-2">Conditions</label>
                      <textarea name="conditions" defaultValue={selectedEvent.conditions} className="mb-4 w-full border px-2 py-1 rounded" />
                    </form>
                    <div className="flex gap-2 justify-end px-8 pb-6 bg-gray-900 sticky bottom-0 border-t border-gray-800">
                      <Button type="button" variant="outline" onClick={() => setShowReprogramForm(false)}>Annuler</Button>
                      <Button type="submit" form="reprogram-form">Valider</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
