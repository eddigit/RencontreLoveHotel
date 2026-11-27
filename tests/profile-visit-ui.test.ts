import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

describe('profile visit UI', () => {
  it('records only after the profile is mounted in a visible tab and tells the visitor', () => {
    const source = fs.readFileSync(path.join(root, 'components/profile-visit-tracker.tsx'), 'utf8')
    expect(source).toContain("'use client'")
    expect(source).toContain("document.visibilityState !== 'visible'")
    expect(source).toContain('useEffect')
    expect(source).toContain('recordProfileVisit(profileUserId)')
    expect(source).toContain('Cette visite apparaîtra dans l’historique de ce membre.')
  })

  it('exposes the named home component requested for discover integration', () => {
    const source = fs.readFileSync(path.join(root, 'components/profile-visitors.tsx'), 'utf8')
    expect(source).toContain('export function ProfileVisitors')
    expect(source).toContain("'use client'")
    expect(source).toContain('getProfileVisitors(limit)')
    expect(source).toContain('Visites des 30 derniers jours, de la plus récente à la plus ancienne.')
    expect(source).toContain('Aucune visite enregistrée pour le moment.')
    expect(source).toContain('Impossible de charger votre historique de visites pour le moment.')
  })
})
