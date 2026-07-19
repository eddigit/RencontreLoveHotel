import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Love Hotel experiences UI', () => {
  const createPage = fs.readFileSync(path.join(process.cwd(), 'app/events/new.tsx'), 'utf8')
  const listPage = fs.readFileSync(path.join(process.cwd(), 'app/events/page.tsx'), 'utf8')
  const loveRoomsPage = fs.readFileSync(path.join(process.cwd(), 'app/love-rooms/page.tsx'), 'utf8')
  const eventCard = fs.readFileSync(path.join(process.cwd(), 'components/event-card.tsx'), 'utf8')
  const adminCreatePage = fs.readFileSync(path.join(process.cwd(), 'app/admin/events/new/page.tsx'), 'utf8')
  const adminEventsPage = fs.readFileSync(path.join(process.cwd(), 'app/admin/events/page.tsx'), 'utf8')
  const adminEditPage = fs.readFileSync(path.join(process.cwd(), 'app/admin/events/[id]/edit/page.tsx'), 'utf8')
  const memberEditPage = fs.readFileSync(path.join(process.cwd(), 'app/events/edit.tsx'), 'utf8')
  const adminOptionsPage = fs.readFileSync(path.join(process.cwd(), 'app/admin/options/page.tsx'), 'utf8')

  it('reframes creation around Love Hotel experiences', () => {
    expect(createPage).toContain('Créer une expérience')
    expect(createPage).toContain('Pigalle')
    expect(createPage).toContain('Châtelet')
    expect(createPage).toContain('Apéro jacuzzi - 2 à 4 couples')
    expect(createPage).toContain('Rideaux ouverts')
    expect(createPage).toContain('Rideaux ouverts - 2 ou 3 chambres')
    expect(createPage).toContain('Capacité')
    expect(createPage).not.toContain("value='restaurant'")
    expect(createPage).not.toContain("value='champagne'")
    expect(createPage).not.toContain("value='love_room'")
    expect(createPage).not.toContain("value='spa_couples'")
    expect(createPage).not.toContain("value='libertine'")
    expect(createPage).toContain('max_participants: 4')
  })

  it('puts restaurant and bar offers in standby on the Love Rooms page', () => {
    expect(loveRoomsPage).toContain('Offres en standby')
    expect(loveRoomsPage).toContain('Restaurant et bar indisponibles')
    expect(loveRoomsPage).toContain('Rideaux ouverts')
    expect(loveRoomsPage).toContain('2 ou 3 chambres')
    expect(loveRoomsPage).toContain('Apéro jacuzzi')
    expect(loveRoomsPage).toContain('2, 3 ou 4 couples maximum')
    expect(loveRoomsPage).not.toContain('Petit-déjeuner & Love Room')
    expect(loveRoomsPage).not.toContain('Lunch & Love Room')
    expect(loveRoomsPage).not.toContain('Drink & Love Room')
    expect(loveRoomsPage).not.toContain('Eat & Love Room')
    expect(loveRoomsPage).not.toContain('lovehotelaparis.fr/wp-content/uploads/2025/01/petit-dejeuner')
    expect(loveRoomsPage).not.toContain("router.replace('/login')")
    expect(loveRoomsPage).not.toContain('if (!authUser?.id)')
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
    expect(listPage).toContain('Expériences Love Hotel')
    expect(listPage).toContain('Événements à venir')
    expect(listPage).toContain('Apéros jacuzzi')
    expect(listPage).toContain('Rideaux ouverts')
    expect(listPage).toContain('Créées par la communauté')
  })

  it('puts the actionable event list before editorial content', () => {
    const upcomingIndex = listPage.indexOf('Événements à venir')
    const editorialIndex = listPage.indexOf('Créer une rencontre autour d’un lieu réel')

    expect(upcomingIndex).toBeGreaterThan(-1)
    expect(editorialIndex).toBeGreaterThan(upcomingIndex)
    expect(listPage).toContain('Aucun événement programmé pour le moment')
    expect(listPage).toContain('Événements passés')
  })

  it('event cards show experience metadata', () => {
    expect(eventCard).toContain('experienceType')
    expect(eventCard).toContain('venue')
    expect(eventCard).toContain('maxParticipants')
    expect(eventCard).toContain('isPast')
    expect(eventCard).toContain('Terminé')
    expect(eventCard).not.toContain('Publié en bêta')
    expect(eventCard).not.toContain('Format en standby')
    expect(eventCard).not.toContain('/placeholder.svg')
  })

  it('uses event photo uploads and previews in creation and edition forms', () => {
    const eventPhotoField = fs.readFileSync(path.join(process.cwd(), 'components/event-photo-field.tsx'), 'utf8')
    const detailPage = fs.readFileSync(path.join(process.cwd(), 'app/events/[id]/EventDetailPage.tsx'), 'utf8')

    for (const source of [createPage, adminCreatePage, adminEditPage, memberEditPage, adminEventsPage]) {
      expect(source).toContain('EventPhotoField')
      expect(source).not.toContain('Image (URL)')
    }

    expect(createPage).not.toContain('Publication bêta')
    expect(eventPhotoField).toContain('/api/events/photos/upload')
    expect(eventPhotoField).toContain('Aperçu')
    expect(detailPage).not.toContain('/placeholder.svg')
  })
})
