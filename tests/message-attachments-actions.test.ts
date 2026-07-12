import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

vi.mock('@/lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

vi.mock('@/lib/notification-service', () => ({
  createNotificationRecord: vi.fn()
}))

vi.mock('@/lib/member-safety', () => ({
  assertUsersCanInteract: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('../utils/logger', () => ({
  log: vi.fn()
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

import { sendMessage } from '../actions/conversation-actions'
import { sql } from '../lib/db'
import { getServerSession } from 'next-auth/next'

describe('sendMessage attachments', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
    ;(getServerSession as any).mockReset()
  })

  it('persists image audio and video attachments on the created message', async () => {
    ;(getServerSession as any).mockResolvedValue({
      user: { id: '550e8400-e29b-41d4-a716-446655440002' }
    })
    ;(sql.query as any)
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([{ user_id: '550e8400-e29b-41d4-a716-446655440003' }])
      .mockResolvedValueOnce([{ access_mode: 'match', has_history: false }])
      .mockResolvedValueOnce([{ ok: true }])
      .mockResolvedValueOnce([
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          conversation_id: '550e8400-e29b-41d4-a716-446655440001',
          sender_id: '550e8400-e29b-41d4-a716-446655440002',
          content: 'Souvenir de la suite',
          created_at: new Date('2026-06-10T12:00:00Z')
        }
      ])
      .mockResolvedValueOnce([
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          media_type: 'image',
          url: 'https://cdn.example.com/image.jpg'
        }
      ])
      .mockResolvedValueOnce([
        {
          id: '550e8400-e29b-41d4-a716-446655440021',
          media_type: 'audio',
          url: 'https://cdn.example.com/voice.webm'
        }
      ])
      .mockResolvedValueOnce([
        {
          id: '550e8400-e29b-41d4-a716-446655440022',
          media_type: 'video',
          url: 'https://cdn.example.com/video.mp4'
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await sendMessage({
      conversationId: '550e8400-e29b-41d4-a716-446655440001',
      senderId: '550e8400-e29b-41d4-a716-446655440002',
      content: 'Souvenir de la suite',
      attachments: [
        {
          mediaType: 'image',
          url: 'https://cdn.example.com/image.jpg',
          fileName: 'image.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 42
        },
        {
          mediaType: 'audio',
          url: 'https://cdn.example.com/voice.webm',
          fileName: 'voice.webm',
          mimeType: 'audio/webm',
          sizeBytes: 43
        },
        {
          mediaType: 'video',
          url: 'https://cdn.example.com/video.mp4',
          fileName: 'video.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 44
        }
      ]
    } as any)

    expect(result.attachments).toHaveLength(3)
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO message_attachments'),
      expect.arrayContaining([
        '550e8400-e29b-41d4-a716-446655440010',
        'https://cdn.example.com/image.jpg',
        'image',
        'image.jpg',
        'image/jpeg',
        42,
        null,
        null,
        null,
        0
      ])
    )
  })
})
