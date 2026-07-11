import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Love Hotel experiences UI', () => {
  const createPage = fs.readFileSync(path.join(process.cwd(), 'app/events/new.tsx'), 'utf8')
  const listPage = fs.readFileSync(path.join(process.cwd(), 'app/events/page.tsx'), 'utf8')
  const loveRoomsPage = fs.readFileSync(path.join(process.cwd(), 'app/love-rooms/page.tsx'), 'utf8')
  const eventCard = fs.readFileSync(path.join(process.cwd(), 'components/event-card.tsx'), 'utf8')
  const adminCreatePage = fs.readFileSync(path.join(process.cwd(), 'app/admin/events/new/page.tsx'), 'utf8')
  const adminEditPage = fs.readFileSync(path.join(process.cwd(), 'app/admin/events/[id]/edit/page.tsx'), 'utf8')
  const memberEditPage = fs.readFileSync(path.join(process.cwd(), 'app/events/edit.tsx'), 'utf8')
  const adminOptionsPage = fs.readFileSync(path.join(process.cwd(), 'app/admin/options/page.tsx'), 'utf8')

  it('reframes creation around Love Hotel experiences', () => {
    expect(createPage).toContain('Créer une expérience')
    expect(createPage).toContain('Pigalle')
    expect(createPage).toContain('Châtelet')
    expect(createPage).toContain("label: 'Apéro jacuzzi'")
    expect(createPage).toContain("detail: '2 à 4 couples'")
    expect(createPage).toContain('Rideaux ouverts')
    expect(createPage).toContain("label: 'Rideaux ouverts'")
    expect(createPage).toContain("detail: '2 ou 3 chambres'")
    expect(createPage).toContain('Capacité')
    expect(createPage).not.toContain("value='restaurant'")
    expect(createPage).not.toContain("value='champagne'")
    expect(createPage).not.toContain("value='love_room'")
    expect(createPage).not.toContain("value='spa_couples'")
    expect(createPage).not.toContain("value='libertine'")
    expect(createPage).toContain('max_participants: 4')
  })

  it('turns the Love Rooms page into a booking-first experience', () => {
    expect(loveRoomsPage).toContain('Réserver une Love Room')
    expect(loveRoomsPage).toContain('Réservation officielle Love Hotel')
    expect(loveRoomsPage).toContain('LoveHotelBookingWidget')
    expect(loveRoomsPage).toContain('Rideaux ouverts')
    expect(loveRoomsPage).toContain('Apéro jacuzzi')
    expect(loveRoomsPage).not.toContain('Offres en standby')
    expect(loveRoomsPage).not.toContain('Petit-déjeuner & Love Room')
    expect(loveRoomsPage).not.toContain('Lunch & Love Room')
    expect(loveRoomsPage).not.toContain('Drink & Love Room')
    expect(loveRoomsPage).not.toContain('Eat & Love Room')
    expect(loveRoomsPage).not.toContain('lovehotelaparis.fr/wp-content/uploads/2025/01/petit-dejeuner')
  })

  it('limits admin and member event categories to active hotel formats', () => {
    const activeFallback = 'jacuzzi|Apéro jacuzzi 2 à 4 couples\\nopen_curtains|Rideaux ouverts 2 ou 3 chambres'

    for (const source of [listPage, adminCreatePage, adminEditPage, memberEditPage, adminOptionsPage]) {
      expect(source).toContain(activeFallback)
      expect(source).not.toContain('speed-dating|Speed Dating\\njacuzzi|Jacuzzi\\nrestaurant|Restaurant')
    }

    expect(adminCreatePage).toContain('activeEventCategoryValues')
    expect(adminEditPage).toContain('activeEventCategoryValues')
    expect(memberEditPage).toContain('activeEventCategoryValues')
  })

  it('reframes the listing as a commercial community experience page', () => {
    expect(listPage).toContain('Événements à venir')
    expect(listPage).toContain('Apéro jacuzzi')
    expect(listPage).toContain('Rideaux ouverts')
    expect(listPage).toContain('Mes propositions')
  })

  it('event cards show experience metadata', () => {
    expect(eventCard).toContain('experienceType')
    expect(eventCard).toContain('venue')
    expect(eventCard).toContain('maxParticipants')
    expect(eventCard).toContain('Publié en bêta')
  })
})
