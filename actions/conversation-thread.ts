'use server'

import { getConversationMessages, getConversationSummary } from './conversation-actions'

export async function getConversationThread(conversationId: string) {
  const [messages, summary] = await Promise.all([
    getConversationMessages(conversationId),
    getConversationSummary(conversationId)
  ])
  return { messages: summary ? messages : [], summary }
}
