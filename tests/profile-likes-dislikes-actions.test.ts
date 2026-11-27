import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
const { query, requireCurrentUser, ensureSchema } = vi.hoisted(() => ({ query: vi.fn(), requireCurrentUser: vi.fn(), ensureSchema: vi.fn() }))
vi.mock('@/lib/db', () => ({ sql: { query } })); vi.mock('@/lib/server-auth', () => ({ requireCurrentUser })); vi.mock('@/lib/profile-likes-dislikes', async importOriginal => ({ ...(await importOriginal<any>()), ensureProfileLikesDislikesSchema: ensureSchema }))
import { getPublicProfilePreferences } from '@/actions/profile-likes-dislikes-actions'
const viewer = '550e8400-e29b-41d4-a716-446655440001', profile = '550e8400-e29b-41d4-a716-446655440002'
describe('profile likes and dislikes', () => { beforeEach(() => { query.mockReset(); requireCurrentUser.mockReset(); ensureSchema.mockReset(); requireCurrentUser.mockResolvedValue({ id: viewer }) })
it('keeps free text drafts intact until the profile form is submitted', () => { const editor = readFileSync('components/UserProfileEditor.tsx', 'utf8'); expect(editor).toContain('const [likesDraft, setLikesDraft]'); expect(editor).toContain('setLikesDraft(e.target.value)'); expect(editor).toContain("draft.split(',')") })
it('returns preferences only for active visible unblocked profiles', async () => { query.mockResolvedValueOnce([{ bio: 'Bonjour', interests: '["Musique"]', likes: '["Danse"]', dislikes: '["Fumée"]' }]); await expect(getPublicProfilePreferences(profile)).resolves.toEqual({ bio: 'Bonjour', interests: ['Musique'], likes: ['Danse'], dislikes: ['Fumée'] }); const statement=query.mock.calls[0][0]; expect(statement).toContain('up.display_profile = TRUE'); expect(statement).toContain('FROM user_blocks') })
it('preloads and saves both optional fields through Mon profil', () => { const editor = readFileSync('components/UserProfileEditor.tsx', 'utf8'); const page = readFileSync('app/profile/page.tsx', 'utf8'); expect(editor).toContain('likes: parseTags(user.likes)'); expect(editor).toContain('dislikes: parseTags(user.dislikes)'); expect(page).toContain('likes = ${JSON.stringify(likes)}'); expect(page).toContain('dislikes = ${JSON.stringify(dislikes)}') })
})
