"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEventParticipants, getUpcomingEvents } from "@/actions/event-actions"
import { createNotification } from "@/actions/notification-actions"
import { ProtectedRoute } from "@/components/protected-route"
import MainLayout from "@/components/layout/main-layout"
import { AdminTabs } from "@/components/admin-tabs"
import { AdminHeader } from "@/components/admin-header"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

export default function AdminEventNotifyPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params?.id as string
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [eventTitle, setEventTitle] = useState("")

  useEffect(() => {
    async function fetchEventTitle() {
      const events = await getUpcomingEvents()
      const event = events.find((e: any) => String(e.id) === String(eventId))
      if (event) setEventTitle(event.title)
    }
    if (eventId) fetchEventTitle()
  }, [eventId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)
    try {
      const subscribers = await getEventParticipants(eventId)
      await Promise.all(
        subscribers.map((user: any) =>
          createNotification({
            userId: user.id,
            type: "event",
            title,
            description,
            link: `/events/${eventId}`
          })
        )
      )
      setSuccess(true)
      setTitle("")
      setDescription("")
    } catch (err) {
      setError("Erreur lors de l'envoi de la notification.")
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
              <CardTitle>Notifier les inscrits à {eventTitle ? `« ${eventTitle} »` : "l'événement"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <input
                  className="w-full border rounded p-2"
                  placeholder="Titre de la notification"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
                <textarea
                  className="w-full border rounded p-2"
                  placeholder="Message"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">Notification envoyée !</div>}
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Envoi..." : "Envoyer la notification"}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
