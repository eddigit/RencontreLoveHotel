import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('member online messaging entrypoint', () => {
  it('routes the message icon through the member profile workflow', () => {
    const page = readFileSync(join(root, 'app/members/page.tsx'), 'utf8')

    expect(page).not.toContain('/messages?user=')
    expect(page).toContain("title='Voir le profil pour matcher ou écrire'")
    expect(page).toContain('Après match accepté')
  })
})
