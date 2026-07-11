import { beforeEach, describe, expect, it, vi } from 'vitest'

const blobPutMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

vi.mock('@/lib/server-auth', () => ({
  requireCurrentUser: vi.fn()
}))

vi.mock('@vercel/blob', () => ({
  put: blobPutMock
}))

import {
  addWallComment,
  createWallPost,
  getCommunityWallFeed,
  getWallEventOptions,
  removeOwnWallPost,
  reportWallComment,
  reportWallPost
} from '../actions/community-wall-actions'
import { sql } from '@/lib/db'
import { requireCurrentUser } from '@/lib/server-auth'

const member = { id: 'user-1', role: 'user', email: 'member@example.com' }
const pngHeader = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
])

describe('community wall actions', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
    ;(requireCurrentUser as any).mockReset()
    ;(requireCurrentUser as any).mockResolvedValue(member)
    blobPutMock.mockReset()
    blobPutMock.mockResolvedValue({ url: 'https://blob.example/wall/photo.png' })
  })

  it('requires a member session before reading the feed', async () => {
    ;(requireCurrentUser as any).mockRejectedValueOnce(new Error('Authentification requise'))

    await expect(getCommunityWallFeed()).rejects.toThrow('Authentification requise')
    expect(sql.query).not.toHaveBeenCalled()
  })

  it('creates profile, event and rideaux ouverts posts with server-side rules', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'post-profil', status: 'active' }])
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          title: 'Soiree',
          event_date: '2026-08-01',
          event_time: '20:00'
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'post-event', status: 'active' }])
      .mockResolvedValueOnce([{ count: '2' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'post-dispo', status: 'active' }])

    await expect(
      createWallPost({ type: 'profil', body: 'Je decouvre la communaute.' })
    ).resolves.toEqual({ success: true, postId: 'post-profil', status: 'active' })

    await expect(
      createWallPost({
        type: 'evenement',
        body: 'Je cherche un binome pour cet evenement.',
        eventId: 'event-1'
      })
    ).resolves.toEqual({ success: true, postId: 'post-event', status: 'active' })

    await expect(
      createWallPost({
        type: 'dispo_rideaux_ouverts',
        body: 'Disponible ce soir.',
        venue: 'chatelet',
        roomName: 'Secrets',
        startsAt: '2026-08-06T20:00:00.000Z',
        guestCapacity: 2,
        bookingConfirmed: true,
        bookingReference: 'RES-PRIVEE-123'
      })
    ).resolves.toEqual({ success: true, postId: 'post-dispo', status: 'active' })

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO wall_posts'),
      expect.arrayContaining(['user-1', 'profil', 'Je decouvre la communaute.', null, null, 'active'])
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO wall_posts'),
      expect.arrayContaining(['user-1', 'evenement', 'Je cherche un binome pour cet evenement.', 'event-1', null, 'active'])
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO wall_posts'),
      expect.arrayContaining(['user-1', 'dispo_rideaux_ouverts', 'Disponible ce soir.', null, expect.any(Date), 'active'])
    )
  })

  it('creates an image post with a server-controlled Blob upload', async () => {
    const image = new File([pngHeader], 'rencontre.html', { type: 'image/png' })
    ;(sql.query as any)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ id: 'post-image', status: 'active' }])

    await expect(
      createWallPost({ type: 'profil', body: '', image })
    ).resolves.toEqual({ success: true, postId: 'post-image', status: 'active' })

    expect(blobPutMock.mock.calls[0][0]).toMatch(
      /^community-wall\/user-1-\d+\.png$/
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('image_url'),
      expect.arrayContaining([
        'user-1',
        'profil',
        '',
        null,
        null,
        'active',
        'https://blob.example/wall/photo.png',
        'image/png',
        image.size
      ])
    )
  })

  it('rejects invalid wall images before database writes or Blob storage', async () => {
    const image = new File(['not an image'], 'fake.jpg', { type: 'image/jpeg' })

    await expect(
      createWallPost({ type: 'profil', body: '', image })
    ).rejects.toThrow('Fichier image invalide')

    expect(blobPutMock).not.toHaveBeenCalled()
    expect(sql.query).not.toHaveBeenCalled()
  })

  it('enforces the three posts per 24 hours limit', async () => {
    ;(sql.query as any).mockResolvedValueOnce([{ count: '3' }])

    await expect(
      createWallPost({ type: 'profil', body: 'Encore une annonce.' })
    ).rejects.toThrow('3 annonces')
  })

  it('hides keyword-matched posts and creates a moderation queue item', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([
        { keyword: 'spam', severity: 'high', action: 'hide' }
      ])
      .mockResolvedValueOnce([{ id: 'post-1', status: 'hidden' }])
      .mockResolvedValueOnce([])

    await expect(
      createWallPost({ type: 'profil', body: 'Message spam a verifier.' })
    ).resolves.toEqual({ success: true, postId: 'post-1', status: 'hidden' })

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO moderation_queue'),
      expect.arrayContaining(['wall_post', 'post-1', 'user-1', 'high'])
    )
  })

  it('filters expired rideaux ouverts and past linked events from the feed query', async () => {
    ;(sql.query as any).mockResolvedValueOnce([])

    await getCommunityWallFeed()

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining("wp.type <> 'dispo_rideaux_ouverts' OR wp.expires_at > NOW()"),
      ['user-1']
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining("wp.type <> 'evenement'"),
      ['user-1']
    )
  })

  it('requires upcoming published events for linked event posts', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])

    await expect(
      createWallPost({
        type: 'evenement',
        body: 'Evenement passe.',
        eventId: 'event-past'
      })
    ).rejects.toThrow('evenement publie a venir')
  })

  it('hides keyword-matched comments and queues moderation', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([{ id: 'post-1', status: 'active' }])
      .mockResolvedValueOnce([
        { keyword: 'spam', severity: 'critical', action: 'escalate' }
      ])
      .mockResolvedValueOnce([{ id: 'comment-1', status: 'hidden' }])
      .mockResolvedValueOnce([])

    await expect(
      addWallComment({ postId: 'post-1', body: 'Commentaire spam.' })
    ).resolves.toEqual({ success: true, commentId: 'comment-1', status: 'hidden' })

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO moderation_queue'),
      expect.arrayContaining(['wall_comment', 'comment-1', 'user-1', 'critical'])
    )
  })

  it('enforces the twenty comments per hour limit', async () => {
    ;(sql.query as any).mockResolvedValueOnce([{ count: '20' }])

    await expect(
      addWallComment({ postId: 'post-1', body: 'Un commentaire.' })
    ).rejects.toThrow('20 commentaires')
  })

  it('hides a post after three distinct reports', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '3' }])
      .mockResolvedValueOnce([{ user_id: 'author-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    await expect(reportWallPost({ postId: 'post-1', reason: 'Probleme' })).resolves.toEqual({
      success: true,
      hidden: true,
      reportCount: 3
    })

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE wall_posts'),
      ['post-1']
    )
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO moderation_queue'),
      expect.arrayContaining(['wall_post', 'post-1', 'author-1', 'medium'])
    )
  })

  it('hides a comment after three distinct reports', async () => {
    ;(sql.query as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '3' }])
      .mockResolvedValueOnce([{ user_id: 'author-2' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    await expect(reportWallComment({ commentId: 'comment-1' })).resolves.toEqual({
      success: true,
      hidden: true,
      reportCount: 3
    })

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE wall_comments'),
      ['comment-1']
    )
  })

  it('only allows the author to remove a wall post', async () => {
    ;(sql.query as any).mockResolvedValueOnce([{ user_id: 'another-user' }])

    await expect(removeOwnWallPost({ postId: 'post-1' })).rejects.toThrow('auteur')
  })

  it('lists only published upcoming events for the composer', async () => {
    ;(sql.query as any).mockResolvedValueOnce([{ id: 'event-1', title: 'Soiree' }])

    await expect(getWallEventOptions()).resolves.toEqual([{ id: 'event-1', title: 'Soiree' }])

    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining("publication_status = 'published'"),
      []
    )
  })
})
