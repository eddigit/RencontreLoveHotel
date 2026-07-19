import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('moderation investigation cockpit UI', () => {
  it('groups alerts by member and exposes a one-click profile with avatar', () => {
    const queue = read('app/moderation/page.tsx')
    expect(queue).toContain('getModerationInvestigations')
    expect(queue).toContain('ModerationAvatar')
    expect(queue).toContain('Voir le dossier complet')
    expect(queue).toContain('Priorité prostitution')
  })

  it('shows a chronological conversation thread and immediate admin actions', () => {
    const cockpit = read('app/moderation/[id]/page.tsx')
    expect(cockpit).toContain('ConversationThread')
    expect(cockpit).toContain('Profil et identité')
    expect(cockpit).toContain('Canal officiel')
    expect(cockpit).toContain('Geler les preuves')
    expect(cockpit).toContain('Exporter le dossier')
    expect(cockpit).toContain('Bannir définitivement')
    expect(cockpit).toContain('Motif obligatoire avant lecture')
    expect(cockpit).toContain('Lire le fil audité')
  })

  it('uses avatars in global user and message administration', () => {
    expect(read('app/admin/users/page.tsx')).toContain('ModerationAvatar')
    const messages = read('app/admin/messages/page.tsx')
    expect(messages).toContain('getAdminConversations')
    expect(messages).toContain('ConversationThread')
    expect(messages).toContain('ModerationAvatar')
    expect(read('components/moderation/moderation-avatar.tsx')).toContain('/default-member-couple.jpg')
  })
})
