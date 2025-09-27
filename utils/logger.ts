type LogLevel = 'info' | 'warn' | 'error' | 'security'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  meta?: any
  userId?: string
  ip?: string
  userAgent?: string
}

export function log(level: LogLevel, message: string, meta?: Record<string, any>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta,
    userId: meta?.userId || meta?.currentUserId,
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
      meta ? '\n' + JSON.stringify(meta, null, 2) : ''
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
  log('error', error.message, {
    stack: error.stack,
    context,
    name: error.name
  })
}
