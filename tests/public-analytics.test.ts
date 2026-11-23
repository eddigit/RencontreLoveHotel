import { describe, expect, it } from 'vitest'
import { analyticsPageUrl, sanitizeAnalyticsPath } from '@/lib/public-analytics'
import { readFileSync } from 'node:fs'

describe('public analytics sanitisation', () => {
  it('preserves the page origin and skips detailed external referrers', () => {
    const origin = 'https://example.test'
    expect(analyticsPageUrl('/profile/id?secret=1', origin, 'https://search.test/')).toBe(origin + '/espace-membre')
    expect(analyticsPageUrl('/', origin, 'https://search.test/private?q=x')).toBeNull()
    expect(analyticsPageUrl('/admin', origin, '')).toBeNull()
  })
  it('keeps only an allowlisted public path and removes query and fragment', () => {
    expect(sanitizeAnalyticsPath('https://rencontrelovehotel.com/love-rooms?room=private#details')).toBe('/love-rooms')
  })
  it('maps every member route to one generic category', () => {
    expect(sanitizeAnalyticsPath('/messages/conversation-private-123?token=no')).toBe('/espace-membre')
    expect(sanitizeAnalyticsPath('/profile/member-id')).toBe('/espace-membre')
  })
  it('rejects admin, moderation, APIs and unknown paths', () => {
    expect(sanitizeAnalyticsPath('/admin/users')).toBeNull()
    expect(sanitizeAnalyticsPath('/moderation/case-42')).toBeNull()
    expect(sanitizeAnalyticsPath('/api/users/private')).toBeNull()
    expect(sanitizeAnalyticsPath('/unknown/secret')).toBeNull()
  })
  it('uses the route-free React SDK entry point', () => {
    const component = readFileSync('components/public-analytics.tsx', 'utf8')
    expect(component).toContain("@vercel/analytics/react")
    expect(component).not.toContain("@vercel/analytics/next")
  })
})
