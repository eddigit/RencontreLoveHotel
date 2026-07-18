import { existsSync, readFileSync } from 'fs'
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
    expect(route).toContain('venue_preference')
    expect(route).toContain('desired_date')
    expect(route).toContain('party_size')
    expect(route).toContain('mood')
  })

  it('lets members request erotic concierge support through an email-only form', () => {
    const form = readFileSync('components/ConciergerieForm.tsx', 'utf8')

    expect(form).toContain('Conciergerie coquine')
    expect(form).toContain('/conciergerie-service.jpg')
    expect(form).toContain('Conciergerie privée Love Hotel')
    expect(form).not.toContain('/images/conciergerie-service.jpg')
    expect(form).toContain('Qu’avez-vous envie de vivre ?')
    expect(form).toContain("responsePreference: 'email'")
    expect(form).toContain('venuePreference')
    expect(form).toContain('desiredDate')
    expect(form).toContain('partySize')
    expect(form).toContain('mood')
    expect(form).toContain('Demande envoyée uniquement par formulaire')
    expect(form).toContain('responsePreference')
    expect(form).toContain('email')
    expect(form).toContain('limousine')
    expect(form).not.toContain("value: 'restaurant'")
    expect(form).toContain('week-end')
    expect(form).toContain('libertin')
    expect(form).toContain('initialName')
    expect(form).toContain('initialEmail')
    expect(form).toContain('aria-pressed')
    expect(form).toContain("aria-live='polite'")
    expect(form).toContain('Parlez-nous de votre idée')
  })

  it('promotes concierge as a main member navigation destination', () => {
    const shell = readFileSync('components/site-shell.tsx', 'utf8')
    const page = readFileSync('app/conciergerie/page.tsx', 'utf8')
    const discover = readFileSync('app/discover/page.tsx', 'utf8')

    expect(shell).toContain("href: '/conciergerie'")
    expect(shell).toContain("label: 'Conciergerie'")
    expect(shell).not.toContain('Escapade')
    expect(page).toContain('Conciergerie coquine')
    expect(page).toContain('/conciergerie-service.jpg')
    expect(page).toContain('Conciergerie privée Love Hotel')
    expect(page).not.toContain('/images/conciergerie-service.jpg')
    expect(page).toContain('Parler de mon projet')
    expect(page).toContain('ConciergerieForm')
    expect(page).toContain('Vous avez une envie')
    expect(page).toContain('Nous savons qui appeler')
    expect(page).toContain('Des lieux que nous connaissons')
    expect(page).toContain('Des partenaires et des connexions')
    expect(page).toContain('Une communauté qui partage les mêmes codes')
    expect(page).toContain('initialName={user?.name ||')
    expect(page).toContain('initialEmail={user?.email ||')
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
    expect(adminPage).toContain('venue_preference')
    expect(adminPage).toContain('desired_date')
    expect(adminPage).toContain('party_size')
    expect(adminPage).toContain('mood')
  })

  it('versions the complete concierge request details in the database', () => {
    const migrationPath = 'migrations/20260713_conciergerie_request_details.sql'

    expect(existsSync(migrationPath)).toBe(true)

    const migration = readFileSync(migrationPath, 'utf8')

    expect(migration).toContain('venue_preference')
    expect(migration).toContain('desired_date')
    expect(migration).toContain('party_size')
    expect(migration).toContain('mood')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS')
  })
})
