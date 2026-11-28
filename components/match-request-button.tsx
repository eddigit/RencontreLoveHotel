"use client"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { sendMatchRequest } from "@/actions/user-actions"

export function MatchRequestButton({ currentUserId, profileUserId }: { currentUserId: string, profileUserId: string }) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<"idle"|"sent"|"error">("idle")
  const [error, setError] = useState("")

  const handleSend = () => {
    setError("")
    startTransition(async () => {
      const result = await sendMatchRequest(currentUserId, profileUserId)
      if (result.success) {
        setStatus("sent")
      } else {
        setStatus("error")
        setError(result.error || "Erreur lors de l'envoi de la demande.")
      }
    })
  }

  if (status === "sent") {
    return <Button disabled className="bg-[#111821] text-[#c9c7c2]">Demande envoyée (en attente)</Button>
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={handleSend} disabled={pending} className="bg-graphite text-graphite-ink hover:bg-graphite-hover border-0">
        {pending ? "Envoi..." : "Envoyer une demande de match"}
      </Button>
      {status === "error" && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  )
}
