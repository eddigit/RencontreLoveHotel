import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('message composer media UI', () => {
  it('exposes controls and renderers for image audio and video messages', () => {
    const page = readFileSync('app/messages/[id]/page.tsx', 'utf8')

    expect(page).toContain("accept='image/*,audio/*,video/*'")
    expect(page).toContain('navigator.mediaDevices?.getUserMedia')
    expect(page).toContain('MediaRecorder')
    expect(page).toContain('Enregistrer un vocal')
    expect(page).toContain('getConversationMessagesAfter')
    expect(page).toContain('setInterval(syncNewMessages')
    expect(page).toContain('Synchronisé')
    expect(page).toContain('<audio')
    expect(page).toContain('<video')
    expect(page).toContain('Apero jacuzzi')
    expect(page).toContain('Love Room')
    expect(page).toContain("newMessage.delivery_status === 'blocked'")
    expect(page).toContain('newMessage.reason || CONTACT_SAFETY_EXPLANATION')
  })
})
