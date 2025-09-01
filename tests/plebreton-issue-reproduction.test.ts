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

import { getConversationMessages, sendMessage } from '../actions/conversation-actions'
import { sql } from '@/lib/db'

describe('Reproduction du problème plebreton', () => {
  beforeEach(() => {
    ;(sql.query as any).mockReset()
  })

  it('reproduit le problème exact de plebreton: utilisateur pas dans conversation_participants', async () => {
    // Simulation: plebreton essaie d'accéder à une conversation où il n'est pas participant
    
    // Première requête: vérification des participants - retourne vide (plebreton pas dedans)
    ;(sql.query as any).mockResolvedValueOnce([])
    
    // Test: plebreton essaie de lire ses messages
    await expect(getConversationMessages('conv-123', 'plebreton-id'))
      .rejects.toThrow('Access denied')
    
    // Vérification que la requête SQL de vérification des participants a été appelée
    expect(sql.query).toHaveBeenCalledWith(
      expect.stringContaining('conversation_participants'),
      expect.arrayContaining(['conv-123', 'plebreton-id'])
    )
  })

  it('démontre la solution: après ajout comme participant, accès autorisé', async () => {
    // Simulation: après avoir ajouté plebreton dans conversation_participants
    
    // Première requête: vérification des participants - maintenant il y est
    ;(sql.query as any).mockResolvedValueOnce([
      { user_id: 'plebreton-id', conversation_id: 'conv-123' }
    ])
    
    // Deuxième requête: récupération des messages
    ;(sql.query as any).mockResolvedValueOnce([
      {
        id: 'msg-1',
        content: 'Salut plebreton!',
        sender_id: 'other-user',
        created_at: new Date(),
        sender_name: 'Other User'
      }
    ])
    
    // Test: plebreton peut maintenant accéder aux messages
    const messages = await getConversationMessages('conv-123', 'plebreton-id')
    
    // Vérifications
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toBe('Salut plebreton!')
    
    // Vérification des appels SQL
    expect(sql.query).toHaveBeenCalledTimes(2)
    expect(sql.query).toHaveBeenNthCalledWith(1,
      expect.stringContaining('conversation_participants'),
      ['conv-123', 'plebreton-id']
    )
    expect(sql.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining('SELECT m.*'),
      ['conv-123']
    )
  })

  it('empêche plebreton d\'envoyer des messages s\'il n\'est pas participant', async () => {
    // Simulation: plebreton essaie d'envoyer un message sans être participant
    
    // Première requête: vérification des participants - retourne vide
    ;(sql.query as any).mockResolvedValueOnce([])
    
    // Test: plebreton essaie d'envoyer un message
    await expect(sendMessage({
      conversationId: 'conv-123',
      senderId: 'plebreton-id',
      content: 'Mon message'
    })).rejects.toThrow('Access denied')
    
    // Seule la vérification de participant a été appelée, pas l'insertion
    expect(sql.query).toHaveBeenCalledTimes(1)
  })

  it('permet à plebreton d\'envoyer des messages une fois participant', async () => {
    // Simulation: plebreton est maintenant participant
    
    // Première requête: vérification des participants - il y est
    ;(sql.query as any).mockResolvedValueOnce([
      { user_id: 'plebreton-id', conversation_id: 'conv-123' }
    ])
    
    // Deuxième requête: insertion du message
    ;(sql.query as any).mockResolvedValueOnce([
      { id: 'new-msg-id' }
    ])
    
    // Troisième requête: mise à jour de la conversation
    ;(sql.query as any).mockResolvedValueOnce([])
    
    // Quatrième requête: récupération des destinataires pour notifications
    ;(sql.query as any).mockResolvedValueOnce([
      { user_id: 'other-user-id' }
    ])
    
    // Test: plebreton envoie un message
    const result = await sendMessage({
      conversationId: 'conv-123',
      senderId: 'plebreton-id',
      content: 'Mon message'
    })
    
    // Vérifications
    expect(result.id).toBe('new-msg-id')
    expect(sql.query).toHaveBeenCalledTimes(4)
    
    // Vérification de l'insertion du message
    expect(sql.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining('INSERT INTO messages'),
      expect.arrayContaining(['conv-123', 'plebreton-id', 'Mon message'])
    )
  })
})
