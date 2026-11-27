import { describe, expect, it } from 'vitest'
import { displayMemberName } from '@/lib/display-member-name'

describe('displayMemberName', () => {
  it('formats pseudonyms in display case', () => {
    expect(displayMemberName('aLiCE-DU_75')).toBe('Alice-du_75')
    expect(displayMemberName('ÉLODIE')).toBe('Élodie')
    expect(displayMemberName('🦊 42aLiCE')).toBe('🦊 42Alice')
  })

  it('uses the display fallback for missing names', () => {
    expect(displayMemberName(undefined)).toBe('Membre')
    expect(displayMemberName('  ', 'Profil')).toBe('Profil')
  })
})
