// Utilitaire simple pour le rate limiting en mémoire
// En production, utilisez Redis ou une solution plus robuste

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute par défaut
): { success: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now()
  const key = identifier

  // Nettoyer les entrées expirées
  if (store[key] && now > store[key].resetTime) {
    delete store[key]
  }

  // Initialiser ou récupérer l'entrée
  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs
    }
    return {
      success: true,
      remainingRequests: maxRequests - 1,
      resetTime: store[key].resetTime
    }
  }

  // Vérifier la limite
  if (store[key].count >= maxRequests) {
    return {
      success: false,
      remainingRequests: 0,
      resetTime: store[key].resetTime
    }
  }

  // Incrémenter le compteur
  store[key].count++

  return {
    success: true,
    remainingRequests: maxRequests - store[key].count,
    resetTime: store[key].resetTime
  }
}

// Helper pour créer un identifier unique
export function createRateLimitIdentifier(
  ip: string,
  endpoint: string,
  userId?: string
): string {
  return `${ip}:${endpoint}${userId ? `:${userId}` : ''}`
}

// Middleware rate limiting pour les routes API
export function withRateLimit(
  maxRequests: number = 10,
  windowMs: number = 60000
) {
  return function rateLimitMiddleware(
    req: Request,
    endpoint: string,
    userId?: string
  ) {
    const ip = req.headers.get('x-forwarded-for') || 
              req.headers.get('x-real-ip') || 
              'unknown'
    
    const identifier = createRateLimitIdentifier(ip, endpoint, userId)
    const result = rateLimit(identifier, maxRequests, windowMs)

    if (!result.success) {
      const resetTimeSeconds = Math.ceil((result.resetTime - Date.now()) / 1000)
      throw new Error(`Rate limit exceeded. Try again in ${resetTimeSeconds} seconds.`)
    }

    return result
  }
}
