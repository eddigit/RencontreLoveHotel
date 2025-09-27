import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock complet de la base de données pour simulation réaliste
vi.mock('@/lib/db', () => ({
  sql: {
    query: vi.fn()
  }
}))

vi.mock('@/actions/notification-actions', () => ({
  createNotification: vi.fn()
}))

vi.mock('../utils/logger', () => ({
  log: vi.fn()
}))

// Mock NextAuth pour les tests
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

import { getConversationMessages, sendMessage } from '../actions/conversation-actions'
import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth/next'

describe('Reproduction du problème plebreton', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
    ;(getServerSession as any).mockReset()
  })

  it('reproduit le problème exact de plebreton: utilisateur pas dans conversation_participants', async () => {
    // Simulation: plebreton essaie d'accéder à une conversation où il n'est pas participant
    
    // Mock de la session utilisateur
    ;(getServerSession as any).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440002' } })
    
    // Première requête: vérification des participants - retourne vide (plebreton pas dedans)
    ;(sql.query as any).mockResolvedValueOnce([])
    
    // Test: plebreton essaie de lire ses messages
    await expect(getConversationMessages('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'))
      .rejects.toThrow('Access denied')
    
    // Vérification que la requête SQL de vérification des participants a été appelée
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('conversation_participants'),
      expect.arrayContaining(['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'])
    )
  })

  it('démontre la solution: après ajout comme participant, accès autorisé', async () => {
    // Simulation: après avoir ajouté plebreton dans conversation_participants
    
    // Mock de la session utilisateur
    ;(getServerSession as any).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440002' } })
    
    // Première requête: vérification des participants - maintenant il y est
    ;(sql.query as any).mockResolvedValueOnce([
      { user_id: '550e8400-e29b-41d4-a716-446655440002', conversation_id: '550e8400-e29b-41d4-a716-446655440001' }
    ])
    
    // Deuxième requête: récupération des messages
    ;(sql.query as any).mockResolvedValueOnce([
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        content: 'Salut plebreton!',
        sender_id: '550e8400-e29b-41d4-a716-446655440004',
        created_at: new Date(),
        sender_name: 'Other User'
      }
    ])
    
    // Test: plebreton peut maintenant accéder aux messages
    const messages = await getConversationMessages('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002')
    
    // Vérifications
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toBe('Salut plebreton!')
    
    // Vérification des appels SQL
    expect(sql.query).toHaveBeenCalledTimes(2)
    expect(sql.query).toHaveBeenNthCalledWith(1,
      expect.stringContaining('conversation_participants'),
      ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
    )
    expect(sql.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining('SELECT m.*'),
      ['550e8400-e29b-41d4-a716-446655440001']
    )
  })

  it('empêche plebreton d\'envoyer des messages s\'il n\'est pas participant', async () => {
    // Simulation: plebreton essaie d'envoyer un message sans être participant
    
    // Mock de la session utilisateur
    ;(getServerSession as any).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440002' } })
    
    // Première requête: vérification des participants - retourne vide
    ;(sql.query as any).mockResolvedValueOnce([])
    
    // Test: plebreton essaie d'envoyer un message
    await expect(sendMessage({
      conversationId: '550e8400-e29b-41d4-a716-446655440001',
      senderId: '550e8400-e29b-41d4-a716-446655440002',
      content: 'Mon message'
    })).rejects.toThrow('Access denied')
    
    // Seule la vérification de participant a été appelée, pas l'insertion
    expect(sql.query).toHaveBeenCalledTimes(1)
  })

  it('permet à plebreton d\'envoyer des messages une fois participant', async () => {
    // Simulation: plebreton est maintenant participant
    
    // Mock de la session utilisateur
    ;(getServerSession as any).mockResolvedValue({ user: { id: '550e8400-e29b-41d4-a716-446655440002' } })
    
    // Première requête: vérification des participants - il y est
    ;(sql.query as any).mockResolvedValueOnce([
      { user_id: '550e8400-e29b-41d4-a716-446655440002', conversation_id: '550e8400-e29b-41d4-a716-446655440001' }
    ])
    
    // Deuxième requête: insertion du message
    ;(sql.query as any).mockResolvedValueOnce([
      { id: '550e8400-e29b-41d4-a716-446655440005' }
    ])
    
    // Troisième requête: mise à jour de la conversation
    ;(sql.query as any).mockResolvedValueOnce([])
    
    // Quatrième requête: récupération des destinataires pour notifications
    ;(sql.query as any).mockResolvedValueOnce([
      { user_id: '550e8400-e29b-41d4-a716-446655440006' }
    ])
    
    // Test: plebreton envoie un message
    const result = await sendMessage({
      conversationId: '550e8400-e29b-41d4-a716-446655440001',
      senderId: '550e8400-e29b-41d4-a716-446655440002',
      content: 'Mon message'
    })
    
    // Vérifications
    expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440005')
    expect(sql.query).toHaveBeenCalledTimes(4)
    
    // Vérification de l'insertion du message
    expect(sql.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining('INSERT INTO messages'),
      expect.arrayContaining(['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Mon message'])
    )
  })
})
