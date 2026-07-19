import { describe, expect, it } from 'vitest'
import { isStaleServerActionError } from '@/lib/server-action-recovery'

describe('server action deployment recovery', () => {
  it('recognizes errors returned to browsers after a new deployment', () => {
    expect(isStaleServerActionError(new Error('Failed to find Server Action "abc".'))).toBe(true)
    expect(isStaleServerActionError(new Error('Could not find Server Action xyz'))).toBe(true)
    expect(isStaleServerActionError(new Error('An unexpected response was received from the server.'))).toBe(true)
    expect(isStaleServerActionError(Object.assign(new Error('action'), {
      name: 'UnrecognizedActionError'
    }))).toBe(true)
  })

  it('does not reload for ordinary application failures', () => {
    expect(isStaleServerActionError(new Error('Database unavailable'))).toBe(false)
  })
})
