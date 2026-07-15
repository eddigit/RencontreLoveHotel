type LogLevel = 'info' | 'warn' | 'error' | 'security'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  meta?: Record<string, string | number | boolean | null>
}

const safeMetaKeys = new Set([
  'operation',
  'event',
  'environment',
  'route',
  'method',
  'status',
  'reason',
  'count',
  'totalCount',
  'page',
  'pageSize',
  'currentPage',
  'totalPages',
  'hasMore',
  'success',
  'errorName',
  'errorCode',
  'conversationId',
  'matchId',
  'userId',
  'currentUserId',
  'targetUserId',
  'senderId',
  'requesterId',
  'receiverId'
])

export function sanitizeMeta(meta?: Record<string, any>) {
  if (!meta) return undefined

  const safe: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(meta)) {
    if (!safeMetaKeys.has(key)) continue
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean' &&
      value !== null
    ) continue

    safe[key] = typeof value === 'string' ? value.slice(0, 160) : value
  }

  return Object.keys(safe).length > 0 ? safe : undefined
}

export function log(level: LogLevel, message: string, meta?: Record<string, any>) {
  const safeMeta = sanitizeMeta(meta)
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: safeMeta,
  }

  // En production, vous pourriez envoyer à un service de logging
  if (process.env.NODE_ENV === 'production') {
    // TODO: Envoyer à un service de logging externe (Datadog, Sentry, etc.)
    console.log(JSON.stringify(entry))
  } else {
    // En développement, affichage coloré
    const colors = {
      info: '\x1b[36m',    // cyan
      warn: '\x1b[33m',    // yellow
      error: '\x1b[31m',   // red
      security: '\x1b[35m' // magenta
    }
    const reset = '\x1b[0m'
    
    console.log(
      `${colors[level]}[${level.toUpperCase()}]${reset} ${entry.timestamp} - ${message}`,
      safeMeta || ''
    )
  }
}

// Fonction spécialisée pour les événements de sécurité
export function logSecurityEvent(event: string, details: any) {
  log('security', `SECURITY_EVENT: ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
}

// Fonction pour les erreurs avec stack trace
export function logError(error: Error, context?: any) {
  log('error', 'Unhandled application error', {
    ...sanitizeMeta(context),
    errorName: error.name,
    errorCode:
      'code' in error && typeof error.code === 'string'
        ? error.code
        : undefined
  })
}
