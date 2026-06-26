import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { acceptMatchRequest } from "@/actions/user-actions"
import { findOrCreateConversation } from "@/actions/conversation-actions"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentification requise" }, { status: 401 })
    }

    const { requesterId, receiverId } = await req.json()
    if (!requesterId || !receiverId || typeof requesterId !== "string" || typeof receiverId !== "string") {
      return NextResponse.json({ success: false, error: "Missing user IDs" }, { status: 400 })
    }

    if (session.user.id !== receiverId && session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Action non autorisée" }, { status: 403 })
    }

    // Accept the match
    const result = await acceptMatchRequest(requesterId, receiverId)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Failed to accept match" }, { status: 500 })
    }
    // Create/find conversation
    const conversationId = await findOrCreateConversation(receiverId, requesterId)
    if (!conversationId) {
      return NextResponse.json({ success: false, error: "Could not create conversation" }, { status: 500 })
    }
    return NextResponse.json({ success: true, conversationId })
  } catch (err) {
    console.error("[ACCEPT-MATCH] Server error:", err)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
