import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getServerSession, submit, requireAdmin, readEvidence } = vi.hoisted(() => ({ getServerSession: vi.fn(), submit: vi.fn(), requireAdmin: vi.fn(), readEvidence: vi.fn() }))
vi.mock('next-auth/next', () => ({ getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/private-photo-verification', () => ({ submitPrivatePhotoVerification: submit, readPrivatePhotoVerificationEvidence: readEvidence }))
vi.mock('@/lib/server-auth', () => ({ requireAdmin }))

const memberId = '550e8400-e29b-41d4-a716-446655440001'
function request(form: FormData, origin = 'https://lhr.test') { return new Request('https://lhr.test/api/photo-verifications', { method: 'POST', headers: { origin, host: 'lhr.test' }, body: form }) as any }

describe('private photo verification submission route', () => {
  beforeEach(() => { getServerSession.mockReset(); submit.mockReset() })
  it('rejects cross-origin mutation before reading the session or proof', async () => {
    const { POST } = await import('@/app/api/photo-verifications/route')
    const response = await POST(request(new FormData(), 'https://evil.test'))
    expect(response.status).toBe(403); expect(getServerSession).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled()
  })
  it('requires authenticated consent and never returns a proof URL', async () => {
    getServerSession.mockResolvedValue({ user: { id: memberId } })
    const form = new FormData(); form.set('consent', 'yes'); form.set('evidence', new File(['test'], 'proof.png', { type: 'image/png' }))
    submit.mockResolvedValue('request')
    const { POST } = await import('@/app/api/photo-verifications/route')
    const response = await POST(request(form))
    expect(response.status).toBe(201); expect(response.headers.get('cache-control')).toContain('no-store')
    await expect(response.json()).resolves.toEqual({ verification: { id: 'request', status: 'pending', evidenceAvailable: true } })
    expect(submit).toHaveBeenCalledWith(memberId, expect.any(File))
  })
})

describe('private photo evidence route', () => {
  beforeEach(() => { requireAdmin.mockReset(); readEvidence.mockReset() })
  it('blocks a non-admin before any proof read', async () => {
    requireAdmin.mockRejectedValue(new Error('Accès administrateur requis'))
    const { GET } = await import('@/app/api/admin/photo-verifications/[id]/evidence/route')
    const response = await GET(new Request('https://lhr.test/api/admin/photo-verifications/x/evidence') as any, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440002' }) })
    expect(response.status).toBe(403); expect(response.headers.get('cache-control')).toContain('no-store'); expect(readEvidence).not.toHaveBeenCalled()
  })
  it('streams only a pending admin proof with non-cacheable headers', async () => {
    requireAdmin.mockResolvedValue({ id: memberId, role: 'admin' }); readEvidence.mockResolvedValue({ image: Buffer.from([1, 2]), mimeType: 'image/webp' })
    const { GET } = await import('@/app/api/admin/photo-verifications/[id]/evidence/route')
    const response = await GET(new Request('https://lhr.test/api/admin/photo-verifications/x/evidence') as any, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440002' }) })
    expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('image/webp'); expect(response.headers.get('cache-control')).toContain('no-store')
  })
})
