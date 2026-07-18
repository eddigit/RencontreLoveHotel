import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : ''

describe('moderation evidence export', () => {
  it('builds an admin-only ZIP with a readable report and SHA-256 manifest', () => {
    const route = read('app/api/admin/moderation/investigations/[id]/export/route.ts')
    expect(route).toContain('requireAdmin')
    expect(route).toContain('JSZip')
    expect(route).toContain('rapport.html')
    expect(route).toContain('manifest.json')
    expect(route).toContain("createHash('sha256')")
    expect(route).toContain('moderation_exports')
  })

  it('does not transmit evidence automatically', () => {
    const route = read('app/api/admin/moderation/investigations/[id]/export/route.ts')
    expect(route).not.toMatch(/fetch\(|sendMail|nodemailer|PHAROS|police@/)
  })
})
