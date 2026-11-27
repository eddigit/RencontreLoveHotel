import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('message receipt and presence UI', () => {
  it('does not turn synchronization or generic updates into an online status', () => {
    const thread = readFileSync(join(root, 'app/messages/[id]/page.tsx'), 'utf8')
    const relationships = readFileSync(join(root, 'lib/member-relationship-service.ts'), 'utf8')

    expect(thread).toContain("? 'En ligne'")
    expect(thread).toContain("if (!value) return 'Hors ligne'")
    expect(thread).toContain('formatLastSeen(conversationDetails?.other_user_last_seen_at)')
    expect(thread).not.toContain('Synchronisé à')
    expect(relationships).not.toContain("'other_user.updated_at'")
    expect(relationships).toContain("? 'other_user.last_seen_at' : 'NULL'")
  })

  it('renders a distinct sent, received, and read receipt for outgoing messages', () => {
    const thread = readFileSync(join(root, 'app/messages/[id]/page.tsx'), 'utf8')

    expect(thread).toContain("aria-label='Envoyé'")
    expect(thread).toContain("aria-label='Reçu'")
    expect(thread).toContain("aria-label='Lu'")
    expect(thread).toContain('<MessageReceipt message={msg} />')
  })

  it('keeps presence dots outside the image clipping container', () => {
    const inbox = readFileSync(join(root, 'components/messages-inbox.tsx'), 'utf8')
    const thread = readFileSync(join(root, 'app/messages/[id]/page.tsx'), 'utf8')

    expect(inbox).toContain("<PresenceDot className='-bottom-0.5 -right-0.5'")
    expect(thread).toContain("<PresenceDot className='-bottom-0.5 -right-0.5'")
  })

  it('acknowledges fetched delivery separately from visible reads in bounded batches', () => {
    const thread = readFileSync(join(root, 'app/messages/[id]/page.tsx'), 'utf8')
    const inbox = readFileSync(join(root, 'components/messages-inbox.tsx'), 'utf8')

    expect(thread).toContain('IntersectionObserver')
    expect(thread).toContain('messageElementRefs')
    expect(thread).toContain('acknowledgeConversationMessageDelivery')
    expect(thread).toContain('markConversationMessagesAsRead')
    expect(thread).toContain('slice(0, 80)')
    expect(thread).toContain('lastPresenceRefreshAtRef.current = 0')
    expect(inbox).toContain('previewAckedIds')
    expect(inbox).toContain('last_message_sender_id === user?.id')
  })
})
