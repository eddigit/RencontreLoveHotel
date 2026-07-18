import { describe, expect, it } from 'vitest'
import {
  assertMemberContentAllowed,
  ContactSafetyError,
  evaluateMemberContent
} from '@/lib/contact-safety-policy'

describe('off-platform contact safety policy', () => {
  const blocked = [
    ['Téléphone', 'appelle-moi au 06 12 34 56 78', 'phone_number'],
    ['Téléphone international', 'mon numéro est +33 (0)6 12 34 56 78', 'phone_number'],
    ['Téléphone compact', 'tel 0612345678', 'phone_number'],
    ['Téléphone écrit', 'contacte moi au zero six 12 34 56 78', 'phone_number'],
    ['Email', 'écris-moi à membre@example.com', 'email_address'],
    ['Email obfusqué', 'membre arobase example point com', 'email_address'],
    ['WhatsApp', 'ajoute moi sur whatsapp au 612345678', 'external_messaging'],
    ['Telegram', 'viens sur telegram @rencontre75', 'external_messaging'],
    ['Signal', 'mon signal est +33612345678', 'external_messaging'],
    ['Snapchat', 'snap : nuitparis', 'external_messaging'],
    ['Social contact', 'contacte moi sur insta @nuitparis', 'external_messaging'],
    ['Paiement', 'paypal.me/nuitparis', 'payment_handle'],
    ['Paiement direct', 'envoie sur revolut @nuitparis', 'payment_handle'],
    ['Invitation', 'rejoins moi https://t.me/nuitparis', 'external_redirect'],
    ['URL courte', 'on discute sur bit.ly/3contact', 'external_redirect']
  ] as const

  it.each(blocked)('blocks %s before persistence', (_label, content, category) => {
    const result = evaluateMemberContent({ surface: 'message', content, origin: 'member' })
    expect(result.decision).toBe('block')
    expect(result.categories).toContain(category)
    expect(result.ruleIds.length).toBeGreaterThan(0)
    expect(result.maskedExcerpt).not.toContain('0612345678')
    expect(result.engineVersion).toBe('contact-safety-2026-07-18')
  })

  it.each([
    'La chambre coûte 120 € pour la soirée.',
    'Rendez-vous le 18/07/2026 à 20 h.',
    'Le Love Hotel est situé dans le 75001 à Paris.',
    'Je préfère discuter ici avant de nous rencontrer.',
    'Le prix officiel de cet événement est affiché sur LHR.'
  ])('allows legitimate platform content: %s', content => {
    expect(evaluateMemberContent({ surface: 'message', content, origin: 'member' }).decision).toBe('allow')
  })

  it('allows a server-authenticated official channel without weakening member rules', () => {
    const content = 'Contact officiel : securite@example.test — 01 23 45 67 89'
    expect(evaluateMemberContent({ surface: 'message', content, origin: 'official' }).decision).toBe('allow')
    expect(evaluateMemberContent({ surface: 'message', content, origin: 'member' }).decision).toBe('block')
  })

  it('throws a stable domain error for blocked member content', () => {
    expect(() => assertMemberContentAllowed({
      surface: 'profile', content: 'mon email est moi@example.com', origin: 'member'
    })).toThrow(ContactSafetyError)

    try {
      assertMemberContentAllowed({ surface: 'profile', content: '06 12 34 56 78', origin: 'member' })
    } catch (error) {
      expect(error).toMatchObject({ code: 'OFF_PLATFORM_CONTACT_BLOCKED' })
    }
  })
})
