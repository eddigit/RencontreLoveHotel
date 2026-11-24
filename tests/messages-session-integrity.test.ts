import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const serverPage = fs.readFileSync(
  path.join(process.cwd(), 'app/messages/page.tsx'),
  'utf8'
)
const source = fs.readFileSync(path.join(process.cwd(), 'components/messages-inbox.tsx'), 'utf8')

describe('messages session integrity', () => {
  it('renders the initial member-filtered conversation list on the server, then refreshes with the hydrated user', () => {
    expect(serverPage).toContain('getServerSession(authOptions)')
    expect(serverPage).toContain('getMemberConversationSummaries(session.user.id)')
    expect(serverPage).toContain('serializeConversation')
    expect(source).not.toContain("const { data: session } = useSession()")
    expect(source).toContain('getUserConversations(authUser.id)')
    expect(source).toContain('if (refreshRequest > 0) void fetchConversations(true)')
    expect(source).toContain('no post-hydration server action')
  })
})
