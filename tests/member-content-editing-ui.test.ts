import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('member content editing UI', () => {
  it('offers edit and delete controls on own private messages', () => {
    const conversation = readFileSync('app/messages/[id]/page.tsx', 'utf8')

    expect(conversation).toContain('updateOwnMessage')
    expect(conversation).toContain('deleteOwnMessage')
    expect(conversation).toContain('Modifier le message')
    expect(conversation).toContain('Supprimer le message')
    expect(conversation).toContain('modifié')
  })

  it('offers edit and delete controls on own wall posts and comments', () => {
    const wall = readFileSync('components/community-wall.tsx', 'utf8')

    expect(wall).toContain('updateOwnWallPost')
    expect(wall).toContain('removeOwnWallComment')
    expect(wall).toContain('Modifier l’annonce')
    expect(wall).toContain('Modifier le commentaire')
    expect(wall).toContain('Supprimer le commentaire')
  })

  it('ships the database fields required for edits and soft deletion', () => {
    const migration = readFileSync(
      'migrations/20260713_member_content_editing.sql',
      'utf8'
    )

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS edited_at')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS deleted_at')
    expect(migration).toContain('ALTER TABLE wall_comments')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS updated_at')
  })
})
