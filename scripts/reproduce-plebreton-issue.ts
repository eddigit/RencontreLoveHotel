import { sql } from '../lib/db'
import { log } from '../utils/logger'

// Script pour reproduire le problème de l'utilisateur plebreton
async function reproduceUserIssue() {
  try {
    console.log('🔍 Reproduction du problème de plebreton...')
    
    // 1. Créer un utilisateur de test 'plebreton'
    const userId = 'plebreton-test-id'
    
    // Supprimer d'abord s'il existe
    await sql.query(`DELETE FROM users WHERE id = $1`, [userId])
    
    // Créer l'utilisateur
    await sql.query(`
      INSERT INTO users (id, email, name, password_hash, email_verified, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [userId, 'plebreton@test.com', 'plebreton', 'hash123', true])
    
    console.log('✅ Utilisateur plebreton créé')
    
    // 2. Créer une conversation
    const conversationId = 'conv-test-plebreton'
    await sql.query(`DELETE FROM conversations WHERE id = $1`, [conversationId])
    await sql.query(`
      INSERT INTO conversations (id, created_at)
      VALUES ($1, NOW())
    `, [conversationId])
    
    console.log('✅ Conversation créée')
    
    // 3. Créer un autre utilisateur pour la conversation
    const otherUserId = 'other-user-test'
    await sql.query(`DELETE FROM users WHERE id = $1`, [otherUserId])
    await sql.query(`
      INSERT INTO users (id, email, name, password_hash, email_verified, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [otherUserId, 'other@test.com', 'other user', 'hash456', true])
    
    // 4. AJOUTER seulement l'autre utilisateur comme participant (pas plebreton)
    // Cela simule le problème : plebreton peut voir la conversation mais n'est pas participant
    await sql.query(`DELETE FROM conversation_participants WHERE conversation_id = $1`, [conversationId])
    await sql.query(`
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES ($1, $2)
    `, [conversationId, otherUserId])
    
    console.log('✅ Participant ajouté (SANS plebreton)')
    
    // 5. Ajouter quelques messages
    await sql.query(`
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [conversationId, otherUserId, 'Salut plebreton! Tu peux voir ce message?'])
    
    console.log('✅ Message ajouté')
    
    // 6. Maintenant testons l'accès
    console.log('\\n🧪 Test de reproduction du problème:')
    
    try {
      const { getConversationMessages } = await import('../actions/conversation-actions')
      
      // Ceci devrait échouer avec "Access denied"
      await getConversationMessages(conversationId, userId)
      console.log('❌ PROBLÈME: L\'accès a été autorisé alors qu\'il devrait être refusé!')
      
    } catch (error: any) {
      if (error.message === 'Access denied') {
        console.log('✅ SUCCÈS: Accès correctement refusé pour plebreton')
        console.log('   Reason: plebreton n\'est pas dans conversation_participants')
      } else {
        console.log('❌ Erreur inattendue:', error.message)
      }
    }
    
    // 7. Vérifier dans la base les données
    console.log('\\n📊 Données de diagnostic:')
    
    const participants = await sql.query(`
      SELECT user_id, u.name 
      FROM conversation_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE conversation_id = $1
    `, [conversationId])
    
    console.log('Participants dans la conversation:', participants)
    
    const messages = await sql.query(`
      SELECT content, sender_id, u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE conversation_id = $1
    `, [conversationId])
    
    console.log('Messages dans la conversation:', messages)
    
    // 8. Solution: Ajouter plebreton comme participant
    console.log('\\n🔧 Application de la solution...')
    await sql.query(`
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `, [conversationId, userId])
    
    console.log('✅ plebreton ajouté comme participant')
    
    // 9. Re-test de l'accès
    try {
      const { getConversationMessages } = await import('../actions/conversation-actions')
      const messages = await getConversationMessages(conversationId, userId)
      console.log('✅ SUCCÈS: plebreton peut maintenant accéder aux messages')
      console.log('Messages récupérés:', messages.length, 'message(s)')
      
    } catch (error: any) {
      console.log('❌ Erreur après correction:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la reproduction:', error)
  }
}

// Exécuter si lancé directement
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  reproduceUserIssue()
}

export { reproduceUserIssue }
