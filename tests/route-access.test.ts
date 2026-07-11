import { describe, expect, it } from 'vitest'
import {
  isAdminPath,
  isAuthenticatedApiPath,
  isProtectedPagePath,
  isPublicPath,
  requiresVerifiedEmail
} from '@/lib/route-access'

describe('route access policy', () => {
  it('keeps the landing page public without making every route public', () => {
    expect(isPublicPath('/')).toBe(true)
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/rencontres')).toBe(true)
    expect(isPublicPath('/premium')).toBe(true)
    expect(isPublicPath('/version.json')).toBe(true)
    expect(isPublicPath('/manifest.webmanifest')).toBe(true)
    expect(isPublicPath('/login/help')).toBe(false)
    expect(isPublicPath('/discover')).toBe(false)
    expect(isPublicPath('/matches')).toBe(false)
  })

  it('keeps auth and account recovery endpoints public', () => {
    expect(isPublicPath('/api/auth/signin')).toBe(true)
    expect(isPublicPath('/api/account/request-password-reset')).toBe(true)
    expect(isPublicPath('/api/account/reset-password')).toBe(true)
  })

  it('protects community pages and sensitive APIs', () => {
    expect(isProtectedPagePath('/discover')).toBe(true)
    expect(isProtectedPagePath('/members')).toBe(true)
    expect(isProtectedPagePath('/conciergerie')).toBe(true)
    expect(isProtectedPagePath('/messages/abc')).toBe(true)
    expect(isProtectedPagePath('/notifications')).toBe(true)
    expect(isAuthenticatedApiPath('/api/accept-match')).toBe(true)
    expect(isAuthenticatedApiPath('/api/messages/attachments')).toBe(true)
    expect(isAuthenticatedApiPath('/api/events/event-1/participate')).toBe(true)
  })

  it('identifies admin and verified-email routes', () => {
    expect(isAdminPath('/admin')).toBe(true)
    expect(isAdminPath('/admin/users')).toBe(true)
    expect(isAdminPath('/api/admin/events/1')).toBe(true)
    expect(requiresVerifiedEmail('/messages')).toBe(true)
    expect(requiresVerifiedEmail('/messages/abc')).toBe(true)
    expect(requiresVerifiedEmail('/profile')).toBe(false)
  })
})
