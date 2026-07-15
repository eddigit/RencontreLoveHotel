import { notFound } from 'next/navigation'
import EventDetailPage from '@/app/events/[id]/EventDetailPage'
import { getEventById } from '@/actions/event-actions'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { trackProductEvent } from '@/lib/product-events'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventDetail({ params }: PageProps) {
  const { id } = await params
  
  try {
    const session = await getServerSession(authOptions)
    const event = await getEventById(id, session?.user?.id || undefined) as any
    
    if (!event) {
      notFound()
    }
    
    if (session?.user?.id) {
      await trackProductEvent({
        eventName: 'event_viewed',
        userId: session.user.id,
        metadata: { event_category: event.experience_type || event.category || 'event' }
      })
    }

    return <EventDetailPage event={event} />
  } catch (error) {
    notFound()
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  
  try {
    const event = await getEventById(id) as any
    
    if (!event) {
      return {
        title: 'Événement non trouvé'
      }
    }
    
    return {
      title: `${event.title} - Love Hotel`,
      description: event.description?.substring(0, 160) || 'Découvrez cet événement exclusif chez Love Hotel'
    }
  } catch (error) {
    return {
      title: 'Événement non trouvé'
    }
  }
}
