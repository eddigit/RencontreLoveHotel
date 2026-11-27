import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('private photo verification UI', () => {
  it('keeps the member request private, consented and tied to the declared profile type', () => {
    const request = readFileSync('components/photo-verification-request.tsx', 'utf8')
    const profile = readFileSync('app/profile/page.tsx', 'utf8')

    expect(request).toContain("fetch('/api/photo-verifications'")
    expect(request).toContain("name='evidence'")
    expect(request).toContain("formData.set('consent', 'yes')")
    expect(request).toContain('identityKind: PhotoVerificationIdentityKind | null')
    expect(request).toContain('demande sans décision expire après 30 jours et sa photo devient inaccessible.')
    expect(request).not.toContain('URL.createObjectURL')
    expect(profile).toContain("id='photo-verification'")
    expect(profile).toContain('Faire vérifier mon profil')
  })

  it('keeps admin proof bytes out of the queue until an explicit inspection and guards async evidence', () => {
    const queue = readFileSync('components/admin-photo-verification-queue.tsx', 'utf8')
    const page = readFileSync('app/admin/verifications-photo/page.tsx', 'utf8')

    expect(queue).toContain('/api/admin/photo-verifications/${encodeURIComponent(request.id)}/evidence')
    expect(queue).toContain('evidenceLoadSequence')
    expect(queue).toContain('evidenceRequestId !== selected.id')
    expect(queue).toContain('Retirer le badge')
    expect(page).toContain("session?.user?.role !== 'admin'")
    expect(page).toContain('getAdminPhotoVerificationRequests')
  })
})
