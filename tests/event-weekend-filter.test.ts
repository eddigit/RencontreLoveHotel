import { describe, expect, it } from 'vitest'
import { isEventInCurrentOrNextWeekend } from '@/lib/event-presentation'

describe('event weekend filter', () => {
  const fridayInParis = new Date('2026-11-27T12:00:00+01:00')

  it('keeps only the imminent Saturday and Sunday when a member chooses Ce week-end', () => {
    expect(isEventInCurrentOrNextWeekend({ event_date: '2026-11-28' }, fridayInParis)).toBe(true)
    expect(isEventInCurrentOrNextWeekend({ event_date: '2026-11-29' }, fridayInParis)).toBe(true)
    expect(isEventInCurrentOrNextWeekend({ event_date: '2026-12-05' }, fridayInParis)).toBe(false)
    expect(isEventInCurrentOrNextWeekend({ event_date: '2026-11-21' }, fridayInParis)).toBe(false)
  })

  it('keeps the current weekend when it is already Sunday', () => {
    const sundayInParis = new Date('2026-11-29T12:00:00+01:00')
    expect(isEventInCurrentOrNextWeekend({ event_date: '2026-11-28' }, sundayInParis)).toBe(true)
    expect(isEventInCurrentOrNextWeekend({ event_date: '2026-11-29' }, sundayInParis)).toBe(true)
    expect(isEventInCurrentOrNextWeekend({ event_date: '2026-12-05' }, sundayInParis)).toBe(false)
  })
})
