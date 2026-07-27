import { describe, expect, it } from 'vitest'
import { isMemberId } from '@/lib/member-id'

describe('member identifiers', () => {
  it('accepts legacy UUID-shaped member identifiers used by profile routes', () => {
    expect(isMemberId('88888888-8888-8888-8888-888888888888')).toBe(true)
  })

  it('rejects malformed identifiers', () => {
    expect(isMemberId('not-a-member-id')).toBe(false)
  })
})
