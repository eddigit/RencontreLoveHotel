import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const usersPage = readFileSync('app/admin/users/page.tsx', 'utf8')
const messagesPage = readFileSync('app/admin/messages/page.tsx', 'utf8')
const userActions = readFileSync('actions/user-actions.ts', 'utf8')
const messageActions = readFileSync('actions/message-actions.ts', 'utf8')

describe('admin member command center', () => {
  it('loads the primary profile photo for the admin directory', () => {
    expect(userActions).toContain('primary_photo.url AS primary_photo')
    expect(userActions).toContain('FROM photos')
    expect(userActions).toContain('ORDER BY is_primary DESC')
  })

  it('shows identifiable members with typed photo fallbacks', () => {
    expect(usersPage).toContain('/default-member-couple.jpg')
    expect(usersPage).toContain('/default-member-woman.jpg')
    expect(usersPage).toContain('/default-member-man.jpg')
    expect(usersPage).toContain("alt={`Photo de ${u.name || 'ce membre'}`}")
  })

  it('supports selecting members for direct messages and email campaigns', () => {
    expect(usersPage).toContain('selectedUserIds')
    expect(usersPage).toContain('Message interne')
    expect(usersPage).toContain('Campagne email')
    expect(usersPage).toContain('sendInternalMessageToSelectedUsers')
    expect(usersPage).toContain("audience: 'manual'")
  })

  it('shows photos and profile actions in message moderation', () => {
    expect(messageActions).toContain('sender_avatar')
    expect(messageActions).toContain('primary_photo')
    expect(messagesPage).toContain('Photo de')
    expect(messagesPage).toContain('/admin/users/${')
  })
})
