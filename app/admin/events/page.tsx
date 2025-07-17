"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/protected-route"
import { getUpcomingEvents, deleteEvent } from "@/actions/event-actions"
import { sql } from "@/lib/db"
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

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <MainLayout user={user}>
        <div className="container py-10">
          <AdminHeader user={user} />
          <AdminTabs />
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">Gestion des événements</h1>
            <Button asChild>
              <Link href="/admin/events/new">Créer un événement</Link>
            </Button>
          </div>
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
                  <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                    <h3 className="text-lg font-bold mb-4">Reprogrammer l'événement</h3>
                    <form onSubmit={async e => {
                      e.preventDefault()
                      const formData = new FormData(e.target as HTMLFormElement)
                      const newDate = formData.get("date") as string
                      // Appel API pour mettre à jour la date
                      await fetch(`/api/admin/events/${selectedEvent.id}/reprogram`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ date: newDate })
                      })
                      setShowReprogramForm(false)
                    }}>
                      <label className="block mb-2">Nouvelle date</label>
                      <input type="datetime-local" name="date" defaultValue={selectedEvent.event_date?.slice(0,16)} className="mb-4 w-full border px-2 py-1 rounded" required />
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setShowReprogramForm(false)}>Annuler</Button>
                        <Button type="submit">Valider</Button>
                      </div>
                    </form>
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
