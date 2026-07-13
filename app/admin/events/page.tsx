"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/protected-route"
import { getUpcomingEvents, deleteEvent, resetAllEvents } from "@/actions/event-actions"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import MainLayout from "@/components/layout/main-layout"
import { AdminTabs } from "@/components/admin-tabs"
import { AdminHeader } from "@/components/admin-header"
import { Check, Clock3, ExternalLink, X } from "lucide-react"
import {
  getPendingEventModeration,
  moderateEvent,
  type EventModerationDecision
} from "@/actions/event-actions"

export default function AdminEventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [pastEvents, setPastEvents] = useState<any[]>([])
  const [pendingEvents, setPendingEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showReprogramForm, setShowReprogramForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [status, setStatus] = useState("")
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({})
  const [moderatingId, setModeratingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      // Récupère les événements à venir
      const result = await getUpcomingEvents(user?.id || "")
      setEvents(result)
      const pending = await getPendingEventModeration()
      setPendingEvents(pending)
      // Récupère les événements passés
      const res = await fetch("/api/admin/events/past")
      const past = await res.json()
      setPastEvents(past)
      setLoading(false)
    }
    if (user?.id) fetchEvents()
  }, [user?.id])

  const handleModerate = async (eventId: string, decision: EventModerationDecision) => {
    const note = moderationNotes[eventId]?.trim() || ''
    if (decision !== 'publish' && note.length < 8) {
      setStatus('Ajoute une note d’au moins quelques mots pour expliquer cette décision.')
      return
    }

    setModeratingId(eventId)
    setStatus('')
    try {
      const result = await moderateEvent(eventId, decision, note)
      setPendingEvents(current => current.filter(event => event.id !== eventId))
      setModerationNotes(current => {
        const next = { ...current }
        delete next[eventId]
        return next
      })
      setStatus(result.status === 'published' ? 'Événement publié et membre notifié.' : 'Décision enregistrée et membre notifié.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'La décision de modération a échoué.')
    } finally {
      setModeratingId(null)
    }
  }

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
          {pendingEvents.length > 0 && (
            <section className="mb-10 rounded-2xl border border-[#ffd166]/30 bg-[#ffd166]/[0.07] p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffd166]">Modération prioritaire</p>
                  <h2 className="mt-2 text-2xl font-black">Propositions à valider <span className="text-[#ffd166]">({pendingEvents.length})</span></h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/62">Les créations membres restent invisibles jusqu’à une décision. Chaque refus ou demande de correction doit être expliqué.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#ffe7a3]"><Clock3 className="h-4 w-4" /> File active</div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {pendingEvents.map(event => {
                  const fallbackImage = event.experience_type === 'jacuzzi' ? '/apero-jacuzzi-rencontre.jpg' : '/rideaux-ouverts-rencontre.jpg'
                  const note = moderationNotes[event.id] || ''
                  return (
                    <article key={event.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                      <div className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
                        <div className="relative h-44 w-full md:h-full">
                          <Image src={event.image || fallbackImage} alt={event.title} fill sizes="180px" unoptimized className="object-cover" />
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-black">{event.title}</h3>
                              <p className="mt-1 text-xs text-white/55">{event.experience_type === 'jacuzzi' ? 'Apéro jacuzzi' : 'Rideaux ouverts'} · {event.venue === 'chatelet' ? 'Châtelet' : 'Pigalle'}</p>
                            </div>
                            <Button asChild variant="ghost" size="icon" title="Prévisualiser">
                              <Link href={`/events/${event.id}`}><ExternalLink className="h-4 w-4" /></Link>
                            </Button>
                          </div>
                          <p className="mt-3 text-sm text-white/70">{event.description || 'Aucune description fournie.'}</p>
                          {event.experience_type === 'open_curtains' && (
                            <p className="mt-3 rounded-md border border-[#94ffc9]/20 bg-[#94ffc9]/5 px-3 py-2 text-xs text-[#caffdf]">
                              {event.booking_confirmed
                                ? `Chambre réservée · référence ${event.booking_reference}`
                                : 'Chambre à confirmer'}
                            </p>
                          )}
                          <p className="mt-3 text-xs text-white/52">Proposé par <Link className="text-[#ffb3d8] underline" href={`/profile/${event.creator_id}`}>{event.creator_name || 'Membre'}</Link> · capacité {event.max_participants}</p>
                          <textarea
                            value={note}
                            onChange={e => setModerationNotes(current => ({ ...current, [event.id]: e.target.value }))}
                            rows={2}
                            placeholder="Note pour le membre si correction ou refus..."
                            className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#ffd166]"
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" disabled={moderatingId === event.id} onClick={() => void handleModerate(event.id, 'publish')} className="bg-emerald-500/85 text-white hover:bg-emerald-500">
                              <Check className="mr-2 h-4 w-4" /> Publier
                            </Button>
                            <Button size="sm" variant="outline" disabled={moderatingId === event.id} onClick={() => void handleModerate(event.id, 'request_correction')} className="border-[#ffd166]/40 text-[#ffe7a3]">
                              Demander une correction
                            </Button>
                            <Button size="sm" variant="outline" disabled={moderatingId === event.id} onClick={() => void handleModerate(event.id, 'reject')} className="border-red-300/30 text-red-200">
                              <X className="mr-2 h-4 w-4" /> Refuser
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
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
