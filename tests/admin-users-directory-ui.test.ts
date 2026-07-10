import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const pageSource = readFileSync(join(process.cwd(), 'app/admin/users/page.tsx'), 'utf8')

describe('admin users directory UI', () => {
  it('exposes the complete searchable directory with server-side filters and pagination', () => {
    expect(pageSource).toContain('searchAdminUsers')
    expect(pageSource).toContain('Répertoire complet')
    expect(pageSource).toContain('directoryTotal')
    expect(pageSource).toContain('profileStatus')
    expect(pageSource).toContain('meetingCriterion')
    expect(pageSource).toContain('totalPages')
    expect(pageSource).toContain('ChevronLeft')
    expect(pageSource).toContain('ChevronRight')
    expect(pageSource).not.toContain('filteredUsers')
    expect(pageSource).not.toContain('value={search}')
  })
})
