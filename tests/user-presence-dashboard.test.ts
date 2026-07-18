import { existsSync, readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('community presence dashboard', () => {
  it('does not fake every discover profile as online', () => {
    const source = readFileSync('actions/user-actions.ts', 'utf8')
    const presence = readFileSync('lib/presence.ts', 'utf8')

    expect(source).not.toContain('true as online')
    expect(source).not.toContain('online: true,')
    expect(source).toContain('last_seen_at')
    expect(source).toContain('onlineOnly')
    expect(presence).toContain("INTERVAL '${ONLINE_USER_WINDOW_MINUTES} minutes'")
  })

  it('updates member presence from authenticated app sessions', () => {
    expect(existsSync('components/presence-heartbeat.tsx')).toBe(true)

    const heartbeat = readFileSync('components/presence-heartbeat.tsx', 'utf8')
    const providers = readFileSync('components/providers.tsx', 'utf8')
    const action = readFileSync('actions/presence-actions.ts', 'utf8')
    const migration = readFileSync(
      'migrations/20260626_add_user_presence.sql',
      'utf8'
    )

    expect(heartbeat).toContain('touchCurrentUserPresence')
    expect(heartbeat).toContain('setInterval')
    expect(providers).toContain('<PresenceHeartbeat />')
    expect(action).toContain('requireCurrentUser')
    expect(action).toContain('markUserSeen')
    expect(migration).toContain('last_seen_at TIMESTAMPTZ')
    expect(migration).toContain('idx_users_last_seen_at')
  })

  it('feeds the online module independently from matching filters', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')
    const actions = readFileSync('actions/user-actions.ts', 'utf8')

    expect(page).toContain('getOnlineCommunityMembers')
    expect(page).toContain('setOnlineMembers')
    expect(page).toContain("profile.is_current_user ? 'Vous' : profile.name")
    expect(actions).toContain('export async function getOnlineCommunityMembers')
    expect(actions).toContain('onlinePresenceCondition')
    expect(actions).not.toContain("u.last_seen_at >= NOW() - INTERVAL '5 minutes'")
  })

  it('makes dashboard stats navigable', () => {
    const page = readFileSync('app/discover/page.tsx', 'utf8')

    expect(page).toContain("href='#new-profiles'")
    expect(page).toContain("href='/matches'")
    expect(page).toContain("href='/events'")
    expect(page).toContain("id='online-now'")
    expect(page).toContain("id='new-profiles'")
  })
})
