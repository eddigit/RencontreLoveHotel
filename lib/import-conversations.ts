import { config } from 'dotenv';
config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { executeQuery } from './db.ts';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define types for data sources
interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

// Add detailed logging in test mode
const isTestMode = process.argv.includes('--test');
const log = (message: string, data?: any) => {
  if (isTestMode) {
    console.log(message, data);
  }
};

async function importConversations(testMode = false) {
  // Use the same source files for both test and full mode
  const conversationsPath = path.join(__dirname, '../docs/conversations.json');
  const profilesPath = path.join(__dirname, '../docs/profiles.json');
  const messagesPath = path.join(__dirname, '../docs/messages.json');

  // Load JSON files
  const conversations: Conversation[] = JSON.parse(fs.readFileSync(conversationsPath, 'utf8'));
  const profiles: Profile[] = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  const messages: Message[] = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

  log('Loaded data sources:', {
    conversations: conversations.length,
    profiles: profiles.length,
    messages: messages.length
  });

  let importedCount = 0;
  const maxToImport = testMode ? 1 : Number.MAX_SAFE_INTEGER;

  // Import each conversation
  for (const conversation of conversations) {
    if (importedCount >= maxToImport) {
      log('Reached import limit for test mode. Stopping import.');
      break;
    }

    try {
      // Find profiles for both users
      const profile1 = profiles.find(p => p.id === conversation.user1_id);
      const profile2 = profiles.find(p => p.id === conversation.user2_id);

      if (!profile1 || !profile2) {
        log('Missing profile(s) for conversation:', {
          conversationId: conversation.id,
          user1Found: !!profile1,
          user2Found: !!profile2
        });
        continue;
      }

      // Check if both users exist in the database
      const user1 = await executeQuery('SELECT * FROM users WHERE id = $1', [profile1.user_id]);
      const user2 = await executeQuery('SELECT * FROM users WHERE id = $1', [profile2.user_id]);

      if (user1.length === 0 || user2.length === 0) {
        log('One or both users not found in database:', {
          user1Id: profile1.user_id,
          user2Id: profile2.user_id,
          user1Found: user1.length > 0,
          user2Found: user2.length > 0
        });
        continue;
      }

      // Check for existing match to prevent duplicates
      const existingMatch = await executeQuery(
        `SELECT * FROM user_matches
         WHERE (user_id_1 = $1 AND user_id_2 = $2)
         OR (user_id_1 = $2 AND user_id_2 = $1)`,
        [profile1.user_id, profile2.user_id]
      );

      if (existingMatch.length > 0) {
        log('Match already exists:', {
          user1Id: profile1.user_id,
          user2Id: profile2.user_id,
          matchId: existingMatch[0].id
        });
        continue;
      }

      // Begin transaction
      await executeQuery('BEGIN');

      try {
        // Create match
        const matchResult = await executeQuery(
          `INSERT INTO user_matches (user_id_1, user_id_2, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            profile1.user_id,
            profile2.user_id,
            'accepted',
            conversation.created_at,
            conversation.updated_at
          ]
        );

        const matchId = matchResult[0].id;
        log('Created match:', { matchId });

        // Create conversation
        const conversationResult = await executeQuery(
          `INSERT INTO conversations (created_at, updated_at)
           VALUES ($1, $2)
           RETURNING id`,
          [conversation.created_at, conversation.updated_at]
        );

        const conversationId = conversationResult[0].id;
        log('Created conversation:', { conversationId });

        // Add participants
        await executeQuery(
          `INSERT INTO conversation_participants (conversation_id, user_id, created_at)
           VALUES ($1, $2, $3)`,
          [conversationId, profile1.user_id, conversation.created_at]
        );

        await executeQuery(
          `INSERT INTO conversation_participants (conversation_id, user_id, created_at)
           VALUES ($1, $2, $3)`,
          [conversationId, profile2.user_id, conversation.created_at]
        );

        log('Added conversation participants');

        // Import messages for this conversation
        const conversationMessages = messages.filter(m => m.conversation_id === conversation.id);
        log('Found messages for conversation:', { count: conversationMessages.length });

        for (const message of conversationMessages) {
          let senderId: string | null = null;

          // Determine sender
          if (message.sender_id === profile1.id) {
            senderId = profile1.user_id;
          } else if (message.sender_id === profile2.id) {
            senderId = profile2.user_id;
          } else {
            log('Unknown sender for message:', {
              messageId: message.id,
              senderId: message.sender_id
            });
            continue;
          }

          // Create message
          await executeQuery(
            `INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              conversationId,
              senderId,
              message.content,
              message.read_at !== null && message.read_at !== '',
              message.created_at,
              message.created_at
            ]
          );
        }

        // Commit transaction
        await executeQuery('COMMIT');

        importedCount++;

        log('Successfully imported conversation and messages', {
          conversationId,
          messageCount: conversationMessages.length,
          importedCount
        });
      } catch (error) {
        // Rollback transaction on error
        await executeQuery('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error processing conversation:', conversation.id, error);
    }
  }

  console.log(`Conversation import completed successfully in ${testMode ? 'test' : 'full'} mode.`);
  console.log(`Total conversations imported: ${importedCount}`);
}

// Run the script in test mode or full mode based on an environment variable or argument
importConversations(isTestMode).catch(error => {
  console.error('Error importing conversations:', error);
});
