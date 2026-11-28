import { describe, expect, it } from 'vitest'
import { publicDesires } from '@/lib/public-desires'

describe('public profile desire icons', () => {
  it('keeps historical role choices private regardless of relationship intentions', () => {
    expect(publicDesires({ relationship_intents: ['libertine'], bdsm_roles: ['dominant'] }).map(item => item.value)).toEqual(['libertine'])
    expect(publicDesires({ bdsm_roles: ['discovery'], bdsm_roles_public: false })).toEqual([])
  })

  it('shows declared choices once and never treats a missing preference as a desire', () => {
    const desires = publicDesires({ relationship_intents: ['discreet', 'discreet'], bdsm_roles_public: true, bdsm_roles: ['switch'] })
    expect(desires.map(item => item.value)).toEqual(['discreet', 'switch'])
    expect(publicDesires({ bdsm_roles_public: true, bdsm_roles: ['none'] })).toEqual([])
    expect(publicDesires({})).toEqual([])
  })
})
