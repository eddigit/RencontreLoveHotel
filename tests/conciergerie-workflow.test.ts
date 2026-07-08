import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('conciergerie workflow', () => {
  it('routes bespoke concierge requests to the operational admin mailbox and app workflow', () => {
    const route = readFileSync('app/api/conciergerie/route.ts', 'utf8')

    expect(route).toContain('CONCIERGERIE_RECIPIENT_EMAIL')
    expect(route).not.toContain('loolyyb@gmail.com')
    expect(route).toContain('getConciergerieRecipientEmail')
    expect(route).not.toContain('lovehotelaparis@gmail.com')
    expect(route).toContain('response_preference')
    expect(route).toContain('conversation_id')
    expect(route).toContain('INSERT INTO notifications')
    expect(route).toContain('sendMail')
  })

  it('lets members request erotic concierge support through an email-only form', () => {
    const form = readFileSync('components/ConciergerieForm.tsx', 'utf8')

    expect(form).toContain('Conciergerie coquine')
    expect(form).toContain('/conciergerie-service.jpg')
    expect(form).toContain('Conciergerie privée Love Hotel')
    expect(form).not.toContain('/images/conciergerie-service.jpg')
    expect(form).toContain('Choisissez le point de départ')
    expect(form).toContain("responsePreference: 'email'")
    expect(form).toContain('venuePreference')
    expect(form).toContain('desiredDate')
    expect(form).toContain('partySize')
    expect(form).toContain('mood')
    expect(form).toContain('Demande envoyée uniquement par formulaire')
    expect(form).toContain('responsePreference')
    expect(form).toContain('email')
    expect(form).toContain('limousine')
    expect(form).toContain('restaurant')
    expect(form).toContain('week-end')
    expect(form).toContain('libertin')
  })

  it('promotes concierge as a main member navigation destination', () => {
    const header = readFileSync('components/header.tsx', 'utf8')
    const shell = readFileSync('components/lhr-v2-shell.tsx', 'utf8')
    const page = readFileSync('app/conciergerie/page.tsx', 'utf8')
    const discover = readFileSync('app/discover/page.tsx', 'utf8')

    expect(header).toContain("href='/conciergerie'")
    expect(header).toContain('Conciergerie')
    expect(header).not.toContain('Escapade')
    expect(shell).toContain("href: '/conciergerie'")
    expect(page).toContain('Conciergerie coquine')
    expect(page).toContain('/conciergerie-service.jpg')
    expect(page).toContain('Conciergerie privée Love Hotel')
    expect(page).not.toContain('/images/conciergerie-service.jpg')
    expect(page).toContain('Faire une demande')
    expect(page).toContain('ConciergerieForm')
    expect(discover).toContain('/conciergerie-service.jpg')
    expect(discover).toContain('Soirée sur mesure')
    expect(discover).not.toContain('/images/conciergerie-service.jpg')
  })

  it('surfaces the preferred response channel in the admin concierge backend', () => {
    const adminPage = readFileSync('app/admin/conciergerie/page.tsx', 'utf8')

    expect(adminPage).toContain('response_preference')
    expect(adminPage).toContain('Canal de réponse')
    expect(adminPage).toContain('/messages/')
    expect(adminPage).toContain('conversation_id')
  })
})
