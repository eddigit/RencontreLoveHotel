import { describe, expect, it } from 'vitest'
import { calculateProfileCompletion } from '@/lib/profile-completion'

describe('profile completion', () => {
  it('scores useful matching information and returns the next actions', () => {
    const result = calculateProfileCompletion({
      name: 'Camille',
      avatar: '/camille.jpg',
      age: 34,
      location: 'Paris',
      bio: '',
      interests: [],
      photoCount: 1,
      hasDatingPreference: false,
      hasMeetingIntent: false
    })

    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThan(100)
    expect(result.nextActions).toContain('Ajouter une bio')
    expect(result.nextActions).toContain('Choisir des centres d’intérêt')
  })

  it('caps a complete profile at one hundred percent', () => {
    const result = calculateProfileCompletion({
      name: 'Camille', avatar: '/camille.jpg', age: 34, location: 'Paris',
      status: 'couple', orientation: 'bisexual', gender: 'couple_mf',
      bio: 'Un profil suffisamment détaillé pour organiser une vraie rencontre.',
      interests: ['Jacuzzi', 'Dîner'], photoCount: 3,
      hasDatingPreference: true, hasMeetingIntent: true
    })
    expect(result.score).toBe(100)
    expect(result.nextActions).toEqual([])
  })
})
