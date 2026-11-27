'use client'

import { useRouter } from 'next/navigation'
import {
  reportPostMeetingWord,
  type PostMeetingWord,
} from '@/actions/post-meeting-word-actions'
import { PublicPostMeetingWords } from '@/components/post-meeting-word'

export function PublicPostMeetingWordsClient({
  words,
}: {
  words: PostMeetingWord[]
}) {
  const router = useRouter()
  return (
    <PublicPostMeetingWords
      words={words}
      onReport={async (id) => {
        await reportPostMeetingWord(id, { reason: 'inappropriate_content' })
        router.refresh()
      }}
    />
  )
}
