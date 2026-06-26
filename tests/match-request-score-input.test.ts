import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('match request score input', () => {
  it('feeds profile identity preferences and meeting types into the matching engine', () => {
    const actions = readFileSync('actions/user-actions.ts', 'utf8')

    expect(actions).toContain('buildMatchingProfile')
    expect(actions).toContain('status: profile.user.status')
    expect(actions).toContain('orientation: profile.user.orientation')
    expect(actions).toContain('gender: profile.user.gender')
    expect(actions).toContain('interested_in_events: profile.preferences?.interested_in_events')
    expect(actions).toContain('open_to_other_couples: profile.meetingTypes?.open_to_other_couples')
    expect(actions).toContain('join_exclusive_events: profile.additionalOptions?.join_exclusive_events')
  })
})
