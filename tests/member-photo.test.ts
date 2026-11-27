import { describe, expect, it } from 'vitest'
import { hasEligibleMemberPhoto } from '@/lib/member-photo'

describe('member photo eligibility', () => {
  it('accepts the deployed public Blob hostname', () => {
    expect(hasEligibleMemberPhoto('https://xjgijnw9atfqarka.public.blob.vercel-storage.com/user-photos/member.jpg')).toBe(true)
  })

  it('keeps Google generated initials and native placeholders out of the photo tier', () => {
    expect(hasEligibleMemberPhoto('https://lh3.googleusercontent.com/a/generated-avatar=s96-c')).toBe(false)
    expect(hasEligibleMemberPhoto('/default-member-woman.jpg')).toBe(false)
  })
})
