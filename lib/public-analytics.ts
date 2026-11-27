const PUBLIC_PATHS = new Set([
  '/', '/about', '/concept', '/community-safety', '/events', '/forgot-password',
  '/goodbye', '/lieux', '/login', '/loolyyb', '/loolyyb-memecoin', '/love-rooms',
  '/publicite', '/premium', '/privacy', '/register', '/rencontres',
  '/reset-password', '/tarifs-publicite', '/terms', '/unauthorized',
  '/verify-email', '/verify-email-pending'
])

const MEMBER_PREFIXES = ['/account', '/conciergerie', '/discover', '/en-direct', '/matches', '/members', '/messages', '/notifications', '/onboarding', '/profile', '/unsubscribe']

export function sanitizeAnalyticsPath(rawUrl: string): string | null {
  const pathname = new URL(rawUrl, 'https://rencontrelovehotel.com').pathname
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/moderation' || pathname.startsWith('/moderation/') || pathname.startsWith('/api/')) return null
  if (MEMBER_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) return '/espace-membre'
  if (pathname.startsWith('/events/') || pathname.startsWith('/love-rooms/')) return pathname.split('/')[1] === 'events' ? '/events' : '/love-rooms'
  return PUBLIC_PATHS.has(pathname) ? pathname : null
}

export function analyticsPageUrl(rawUrl: string, origin: string, referrer: string): string | null {
  try {
    // The analytics script adds external referrers after beforeSend. A previous
    // site's referrer policy can expose its full URL, so omit that page view.
    if (referrer) {
      const source = new URL(referrer)
      if (source.origin !== origin && source.href !== source.origin + '/') return null
    }
    const page = new URL(rawUrl, origin)
    if (page.origin !== origin) return null
    const path = sanitizeAnalyticsPath(page.href)
    return path ? new URL(path, origin).href : null
  } catch {
    return null
  }
}
