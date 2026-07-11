import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('simplified event workflow', () => {
  const createPage = readFileSync('app/events/new.tsx', 'utf8')
  const listPage = readFileSync('app/events/page.tsx', 'utf8')

  it('starts with two visual formats and applies their native covers', () => {
    expect(createPage).toContain('Choisissez votre format')
    expect(createPage).toContain('/apero-jacuzzi-rencontre.jpg')
    expect(createPage).toContain('/rideaux-ouverts-rencontre.jpg')
    expect(createPage).toContain('defaultExperienceImages')
    expect(createPage).toContain('image = defaultExperienceImages[form.experience_type]')
  })

  it('uses three short steps and keeps secondary settings optional', () => {
    expect(createPage).toContain('Étape 1 sur 3')
    expect(createPage).toContain('Étape 2 sur 3')
    expect(createPage).toContain('Étape 3 sur 3')
    expect(createPage).toContain('Options facultatives')
    expect(createPage).toContain('<details')
    expect(createPage).not.toContain("<aside className='space-y-4'>")
  })

  it('centres the listing on upcoming events and member submissions', () => {
    expect(listPage).toContain('Événements à venir')
    expect(listPage).toContain('Créer un événement')
    expect(listPage).toContain('Mes propositions')
    expect(listPage).toContain('/apero-jacuzzi-rencontre.jpg')
    expect(listPage).toContain('/rideaux-ouverts-rencontre.jpg')
    expect(listPage).not.toContain('Des expériences qui rassurent avant d’ouvrir le jeu')
  })
})
