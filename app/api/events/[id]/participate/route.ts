import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { requestParticipation, withdrawParticipation } from '@/lib/event-participation-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    // Validation de l'ID (UUID)
    const { id } = await params
    const eventId = id
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'ID événement invalide' }, { status: 400 })
    }

    const body = await request.json()
    const { userId: requestedUserId, action } = body
    const userId = session.user.role === 'admin' && requestedUserId
      ? requestedUserId
      : session.user.id

    if (
      requestedUserId &&
      requestedUserId !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 })
    }

    if (!action || !['join', 'leave'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const result = action === 'join'
      ? await requestParticipation({ eventId, actorId: userId })
      : await withdrawParticipation({ eventId, actorId: userId })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      action: action === 'join' ? 'requested' : 'withdrawn'
    })

  } catch (error) {
    console.error('Erreur lors de la gestion de la participation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
