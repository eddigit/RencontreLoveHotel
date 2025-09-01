export function log(level: 'info'|'warn'|'error', message: string, meta?: Record<string, any>) {
  const timestamp = new Date().toISOString()
  if (meta) {
    console[level](`[${timestamp}] ${level.toUpperCase()} - ${message} -`, meta)
  } else {
    console[level](`[${timestamp}] ${level.toUpperCase()} - ${message}`)
  }
}
