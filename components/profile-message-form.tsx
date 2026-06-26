"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sendMessage, findOrCreateConversation } from "@/actions/conversation-actions"
import { useAuth } from "@/contexts/auth-context"

export function ProfileMessageForm({ recipientId }: { recipientId: string }) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const { user } = useAuth()
  const router = useRouter()

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError("")
    setSuccess(false)
    try {
      if (!user?.id) throw new Error("Vous devez être connecté pour envoyer un message.")
      const conversationId = await findOrCreateConversation(user.id, recipientId)
      const result = await sendMessage({ conversationId, senderId: user.id, content: message })
      if (result) {
        setSuccess(true)
        setMessage("")
        router.push(`/messages/${conversationId}`)
      } else {
        setError("Erreur lors de l'envoi du message.")
      }
    } catch (err) {
      setError("Erreur lors de l'envoi du message.")
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSend} className="mt-4 rounded-2xl border border-[#94ffc9]/20 bg-[#94ffc9]/10 p-4">
      <div className="mb-3 flex items-center gap-2 font-black text-white">
        <MessageCircle className="h-4 w-4 text-[#94ffc9]" />
        Conversation fluide
      </div>
      <p className="mb-3 text-sm leading-6 text-white/62">
        Message ouvert après match accepté. Votre échange s’ouvre dans la messagerie complète.
      </p>
      <textarea
        className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.07] p-3 text-white outline-none placeholder:text-white/40 focus:border-[#94ffc9]"
        placeholder="Écrivez un message court, élégant, concret..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        required
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={sending || !message.trim()} className="rounded-2xl bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] border-0">
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Envoi..." : "Écrire"}
        </Button>
        {success && <span className="text-sm text-[#94ffc9]">Message envoyé.</span>}
        {error && <span className="text-sm text-red-200">{error}</span>}
      </div>
    </form>
  )
}
