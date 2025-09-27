import { z } from 'zod'

// ==============================
// SCHÉMAS DE VALIDATION POUR LES MESSAGES
// ==============================

export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Le message ne peut pas être vide')
    .max(1000, 'Le message ne peut pas dépasser 1000 caractères')
    .refine(
      (content) => content.trim().length > 0,
      'Le message ne peut pas contenir uniquement des espaces'
    ),
  conversationId: z.string().uuid('ID de conversation invalide'),
  senderId: z.string().uuid('ID d\'expéditeur invalide')
})

export const getMessagesSchema = z.object({
  conversationId: z.string().uuid('ID de conversation invalide'),
  userId: z.string().uuid('ID d\'utilisateur invalide').optional()
})

// ==============================
// SCHÉMAS DE VALIDATION POUR LES CONVERSATIONS
// ==============================

export const conversationSchema = z.object({
  participants: z.array(z.string().uuid())
    .min(2, 'Une conversation doit avoir au moins 2 participants')
    .max(10, 'Une conversation ne peut pas avoir plus de 10 participants')
})

export const createConversationSchema = z.object({
  userId1: z.string().uuid('Premier utilisateur invalide'),
  userId2: z.string().uuid('Deuxième utilisateur invalide')
}).refine(
  (data) => data.userId1 !== data.userId2,
  'Les deux utilisateurs doivent être différents'
)

// ==============================
// SCHÉMAS DE VALIDATION POUR LES UTILISATEURS
// ==============================

export const userRegistrationSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom contient des caractères invalides'),
  email: z.string()
    .email('Adresse email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères')
    .regex(/(?=.*[a-z])/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/(?=.*[A-Z])/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/(?=.*\d)/, 'Le mot de passe doit contenir au moins un chiffre'),
  agreeTerms: z.boolean().refine(
    (val) => val === true,
    'Vous devez accepter les conditions d\'utilisation'
  )
})

export const userLoginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis')
})

export const userProfileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  age: z.number().int().min(18).max(120).optional(),
  location: z.string().max(100).optional(),
  interests: z.array(z.string()).max(10).optional()
})

// ==============================
// SCHÉMAS DE VALIDATION POUR LES ÉVÉNEMENTS
// ==============================

export const eventSchema = z.object({
  title: z.string()
    .min(5, 'Le titre doit contenir au moins 5 caractères')
    .max(255, 'Le titre ne peut pas dépasser 255 caractères'),
  description: z.string()
    .max(2000, 'La description ne peut pas dépasser 2000 caractères')
    .optional(),
  event_date: z.string().refine(
    (date) => new Date(date) > new Date(),
    'La date de l\'événement doit être dans le futur'
  ),
  event_time: z.string().regex(
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    'Format d\'heure invalide (HH:MM)'
  ),
  location: z.string()
    .min(5, 'L\'adresse doit contenir au moins 5 caractères')
    .max(255, 'L\'adresse ne peut pas dépasser 255 caractères'),
  price: z.number().min(0, 'Le prix ne peut pas être négatif').optional(),
  max_participants: z.number().int().min(2).max(1000).optional()
})

// ==============================
// SCHÉMAS DE VALIDATION POUR LES PHOTOS
// ==============================

export const photoUploadSchema = z.object({
  file: z.object({
    size: z.number().max(10 * 1024 * 1024, 'La taille du fichier ne peut pas dépasser 10MB'),
    type: z.string().refine(
      (type) => ['image/jpeg', 'image/png', 'image/webp'].includes(type),
      'Format de fichier non supporté (JPEG, PNG, WebP uniquement)'
    )
  }),
  isPrimary: z.boolean().optional()
})

// ==============================
// SCHÉMAS GÉNÉRIQUES
// ==============================

export const uuidSchema = z.string().uuid('ID invalide')

export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20)
})

// ==============================
// HELPER FUNCTIONS
// ==============================

export type MessageInput = z.infer<typeof messageSchema>
export type ConversationInput = z.infer<typeof conversationSchema>
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>
export type UserLoginInput = z.infer<typeof userLoginSchema>
export type EventInput = z.infer<typeof eventSchema>

// Fonction utilitaire pour valider et extraire les erreurs
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    return {
      success: false,
      errors: ['Erreur de validation inconnue']
    }
  }
}
