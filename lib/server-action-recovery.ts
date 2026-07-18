const RELOAD_KEY = 'lhr-server-action-reload-at'
const RELOAD_COOLDOWN_MS = 30_000

export function isStaleServerActionError(error: unknown) {
  const name = typeof error === 'object' && error && 'name' in error
    ? String((error as { name?: unknown }).name || '')
    : ''
  const message = error instanceof Error ? error.message : String(error || '')

  return name === 'UnrecognizedActionError' ||
    /(?:failed to find|could not find|unrecognized) server action/i.test(message)
}

export function recoverFromStaleServerAction(error: unknown) {
  if (typeof window === 'undefined' || !isStaleServerActionError(error)) {
    return false
  }

  const lastReload = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0)
  if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return true

  window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  window.location.reload()
  return true
}
