import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getMemberConversationSummaries } from '@/lib/member-relationship-service'
import { MessagesInbox, type InboxConversation } from '@/components/messages-inbox'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function serializeConversation (conversation: InboxConversation): InboxConversation {
  return {
    ...conversation,
    last_message_date: conversation.last_message_date
      ? new Date(conversation.last_message_date).toISOString()
      : null,
    other_user_online: Boolean(conversation.other_user_online)
  }
}

export default async function MessagesPage () {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  try {
    const conversations = await getMemberConversationSummaries(session.user.id)
    return <MessagesInbox key={session.user.id} initialConversations={conversations.map(serializeConversation)} initialUserId={session.user.id} />
  } catch {
    return <MessagesInbox key={session.user.id} initialConversations={[]} initialUserId={session.user.id} initialError='Impossible de charger vos conversations pour le moment. Réessayez.' />
  }
}
