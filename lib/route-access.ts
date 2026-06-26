const exactPublicPaths = new Set([
  '/',
  '/about',
  '/concept',
  '/forgot-password',
  '/goodbye',
  '/login',
  '/loolyyb',
  '/loolyyb-memecoin',
  '/love-rooms',
  '/publicite',
  '/register',
  '/reset-password',
  '/tarifs-publicite',
  '/terms',
  '/unauthorized',
  '/manifest.webmanifest',
  '/version.json',
  '/verify-email',
  '/verify-email-pending'
])

const publicPrefixes = [
  '/api/auth',
  '/api/verify-email',
  '/api/account/request-password-reset',
  '/api/account/reset-password',
  '/love-rooms/'
]

const protectedPagePrefixes = [
  '/admin',
  '/conciergerie',
  '/discover',
  '/en-direct',
  '/events',
  '/matches',
  '/messages',
  '/notifications',
  '/onboarding',
  '/premium',
  '/profile',
  '/rencontres',
  '/unsubscribe'
]

const authenticatedApiPrefixes = [
  '/api/accept-match',
  '/api/events',
  '/api/messages',
  '/api/photos',
  '/api/users'
]

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isPublicPath(pathname: string) {
  const normalized = normalizePath(pathname)
  if (exactPublicPaths.has(normalized)) return true
  return publicPrefixes.some(prefix => matchesPrefix(normalized, prefix))
}

export function isAdminPath(pathname: string) {
  const normalized = normalizePath(pathname)
  return matchesPrefix(normalized, '/admin') || matchesPrefix(normalized, '/api/admin')
}

export function isProtectedPagePath(pathname: string) {
  const normalized = normalizePath(pathname)
  return protectedPagePrefixes.some(prefix => matchesPrefix(normalized, prefix))
}

export function isAuthenticatedApiPath(pathname: string) {
  const normalized = normalizePath(pathname)
  return authenticatedApiPrefixes.some(prefix => matchesPrefix(normalized, prefix))
}

export function requiresVerifiedEmail(pathname: string) {
  const normalized = normalizePath(pathname)
  return matchesPrefix(normalized, '/messages')
}
