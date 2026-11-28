import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ executeQuery: vi.fn(async () => []) }))

import { executeQuery } from '@/lib/db'
import {
  AGE_MISMATCH_MESSAGE,
  INVALID_BIRTHDAY_MESSAGE,
  MINOR_AGE_MESSAGE,
  ageFromBirthday,
  latestAdultBirthday,
  requireAdultAge
} from '@/lib/member-age'
import { saveOnboardingData } from '@/lib/onboarding-service'

const TODAY = new Date('2026-11-28T10:00:00Z')
const MEMBER = '11111111-1111-4111-8111-111111111111'

describe('member age rule', () => {
  it('counts full years and refuses impossible dates', () => {
    expect(ageFromBirthday('2008-11-28', TODAY)).toBe(18)
    expect(ageFromBirthday('2008-11-29', TODAY)).toBe(17)
    expect(ageFromBirthday('1990-02-30', TODAY)).toBeNull()
    expect(ageFromBirthday('2030-01-01', TODAY)).toBeNull()
    expect(ageFromBirthday('pas une date', TODAY)).toBeNull()
    expect(latestAdultBirthday(TODAY)).toBe('2008-11-28')
  })

  it('refuses a minor, an invalid date and an age that contradicts the date', () => {
    expect(() => requireAdultAge({ birthday: '2011-05-01', declaredAge: 25 }, TODAY)).toThrow(MINOR_AGE_MESSAGE)
    expect(() => requireAdultAge({ birthday: '1990-13-01' }, TODAY)).toThrow(INVALID_BIRTHDAY_MESSAGE)
    expect(() => requireAdultAge({ birthday: '1990-05-01', declaredAge: 25 }, TODAY)).toThrow(AGE_MISMATCH_MESSAGE)
    expect(() => requireAdultAge({ birthday: '', birthdayRequired: true }, TODAY)).toThrow(INVALID_BIRTHDAY_MESSAGE)
    expect(() => requireAdultAge({ birthday: null, declaredAge: 16 }, TODAY)).toThrow(MINOR_AGE_MESSAGE)
  })

  it('returns the age given by the birthday for an adult', () => {
    expect(requireAdultAge({ birthday: '1990-05-01', declaredAge: 36 }, TODAY)).toBe(36)
    expect(requireAdultAge({ birthday: '1990-05-01' }, TODAY)).toBe(36)
    expect(requireAdultAge({ birthday: null, declaredAge: 40 }, TODAY)).toBe(40)
  })
})

describe('onboarding refuses minors on the server', () => {
  beforeEach(() => (executeQuery as any).mockClear())

  it('writes nothing when the birthday gives less than 18 years', async () => {
    const minor = new Date()
    minor.setUTCFullYear(minor.getUTCFullYear() - 15)
    await expect(
      saveOnboardingData(MEMBER, { birthday: minor.toISOString().slice(0, 10), age: 25, status: 'single_male' } as any)
    ).rejects.toThrow(MINOR_AGE_MESSAGE)
    expect(executeQuery).not.toHaveBeenCalled()
  })

  it('writes nothing without a birthday', async () => {
    await expect(saveOnboardingData(MEMBER, { birthday: '', age: 30 } as any)).rejects.toThrow(INVALID_BIRTHDAY_MESSAGE)
    expect(executeQuery).not.toHaveBeenCalled()
  })
})
