import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member links and safety UI', () => {
  const conversation = readFileSync('app/messages/[id]/page.tsx', 'utf8')
  const messages = readFileSync('app/messages/page.tsx', 'utf8')
  const profile = readFileSync('app/profile/[id]/page.tsx', 'utf8')
  const controls = readFileSync('components/member-safety-controls.tsx', 'utf8')
  const participant = readFileSync('components/participant-profile-popup.tsx', 'utf8')
  const wall = readFileSync('components/community-wall.tsx', 'utf8')

  it('links member identities to their profiles in messaging and events', () => {
    expect(conversation).toContain('href={`/profile/${conversationDetails.other_user_id}`}')
    expect(messages).toContain('href={`/profile/${conversation.other_user_id}`}')
    expect(participant).toContain('href={`/profile/${participant.id}`}')
    expect(wall).toContain('href={`/profile/${post.user_id}`}')
    expect(wall).toContain('href={`/profile/${comment.user_id}`}')
  })

  it('offers separate block and profile report controls', () => {
    expect(profile).toContain('<MemberSafetyControls')
    expect(conversation).toContain('<MemberSafetyControls')
    expect(controls).toContain('Bloquer ce membre')
    expect(controls).toContain('Signaler ce profil')
    expect(controls).toContain('Débloquer ce membre')
    expect(controls).toContain('reportProfile')
  })

  it('keeps blocked conversations readable while disabling interaction tools', () => {
    expect(conversation).toContain('Conversation en lecture seule')
    expect(conversation).toContain('conversationDetails?.can_interact')
    expect(conversation).toContain('disabled={!conversationDetails?.can_interact')
  })
})
