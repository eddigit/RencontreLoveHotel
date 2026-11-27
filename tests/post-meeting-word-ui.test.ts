import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('post meeting words UI', () => {
  it('keeps publication consensual and score-free', () => {
    const component = readFileSync('components/post-meeting-word.tsx', 'utf8')
    expect(component).toMatch(/confirmMeeting: true,\s*acceptPublication: true/)
    expect(component).toContain('Décliner, garder privé')
    expect(component).toContain('Partagé avec l’accord des deux personnes')
    expect(component).not.toContain("import { Star")
    expect(component).not.toContain('rating=')
  })

  it('connects profile pages to private decisions and accepted public words', () => {
    const own = readFileSync('app/profile/page.tsx', 'utf8')
    const publicPage = readFileSync('app/profile/[id]/page.tsx', 'utf8')
    expect(own).toContain('getReceivedPostMeetingWords')
    expect(own).toContain('PostMeetingWordInbox')
    expect(publicPage).toContain('getPublicPostMeetingWords')
    expect(publicPage).toContain('PostMeetingWordForm')
    expect(publicPage).toContain('PublicPostMeetingWordsClient')
    expect(readFileSync('components/public-post-meeting-words.tsx', 'utf8')).toContain('reportPostMeetingWord')
  })
})
