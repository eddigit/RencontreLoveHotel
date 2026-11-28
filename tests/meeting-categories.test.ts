import { describe, expect, it } from 'vitest'
import { meetingCategories, selectedMeetingCategories } from '@/lib/meeting-categories'

describe('meeting category selection', () => {
  it('supports every combination of the four categories', () => {
    for (let bits = 0; bits < 16; bits++) {
      const selected = meetingCategories.filter((_, i) => bits & (1 << i)).map(item => item.value)
      expect(selectedMeetingCategories(selected, false, ['dominant'])).toEqual(selected)
    }
  })

  it('only derives a category from a role that is explicitly shared', () => {
    expect(selectedMeetingCategories([], true, ['none'])).toEqual([])
    expect(selectedMeetingCategories([], true, ['switch'])).toEqual(['bdsm'])
    expect(selectedMeetingCategories(['bdsm'], false, [])).toEqual(['bdsm'])
  })
})
