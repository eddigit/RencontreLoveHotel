import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateProfileVideo } from '@/lib/video-upload-validation'

describe('profile presentation video', () => {
  it('accepts signed MP4 and WebM files only', async () => {
    const mp4 = new File(
      [new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])],
      'presentation.mp4',
      { type: 'video/mp4' }
    )
    const webm = new File(
      [new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f])],
      'presentation.webm',
      { type: 'video/webm' }
    )
    const fake = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], 'fake.mp4', { type: 'video/mp4' })

    await expect(validateProfileVideo(mp4)).resolves.toMatchObject({ ok: true, video: { extension: 'mp4' } })
    await expect(validateProfileVideo(webm)).resolves.toMatchObject({ ok: true, video: { extension: 'webm' } })
    await expect(validateProfileVideo(fake)).resolves.toMatchObject({ ok: false })
  })

  it('keeps storage, schema and owner controls explicit', () => {
    const migration = readFileSync('migrations/20260711_profile_intro_video.sql', 'utf8')
    const route = readFileSync('app/api/profile/video/route.ts', 'utf8')
    const manager = readFileSync('components/ProfileVideoManager.tsx', 'utf8')
    const profilePage = readFileSync('app/profile/page.tsx', 'utf8')

    expect(migration).toContain('intro_video_url')
    expect(route).toContain('getServerSession')
    expect(route).toContain('validateProfileVideo')
    expect(route).toContain('profile-videos/')
    expect(route).toContain('WHERE user_id = ${user.id}')
    expect(manager).toContain("fetch('/api/profile/video'")
    expect(profilePage).toContain('ProfileVideoManager')
  })
})
