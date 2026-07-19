import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(
  path.join(process.cwd(), 'app/messages/page.tsx'),
  'utf8'
)

describe('messages session integrity', () => {
  it('uses the hydrated application user for both loading and querying conversations', () => {
    expect(source).not.toContain("const { data: session } = useSession()")
    expect(source).toContain('getUserConversations(authUser.id)')
    expect(source).toContain('}, [authUser?.id])')
  })
})
