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
    expect(page).not.toContain('formatLastSeen')
    expect(page).not.toContain("'Hors ligne'")
    expect(page).toContain('<audio')
    expect(page).toContain('<video')
    expect(page).toContain('Échange privé')
    expect(page).toContain('Conseils de sécurité')
    expect(page).toContain('messageDayLabel')
    expect(page).toContain('getConversationThread')
    expect(page).toContain('getConversationMessagesBefore')
    expect(page).toContain('Afficher les messages précédents')
    expect(page).toContain('preservedScrollRef')
    expect(page).toContain('scrollContainer.scrollHeight - preservedScroll.height + preservedScroll.top')
    expect(page).toContain("newMessage.delivery_status === 'blocked'")
    expect(page).toContain('newMessage.reason || CONTACT_SAFETY_EXPLANATION')
    expect(page).toContain('grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex')
    expect(page).not.toContain("className='col-span-3 row-start-1 h-12 w-full")
    expect(page).toContain('refocusComposerAfterSendRef')
    expect(page).toContain('messageInputRef.current?.focus()')
    expect(page).toContain('window.visualViewport')
    expect(page).toContain("viewport?.addEventListener('resize', updateThreadHeight)")
    expect(page).toContain("aria-label='Retour à la liste des messages'")
    expect(page).toContain("aria-label='Historique des messages'")
    expect(page).toContain('showJumpToLatest')
    expect(page).toContain("aria-label='Aller aux derniers messages'")
    expect(page).toContain('isAtLatestRef')
    expect(page).toContain("scrollToLatest('auto')")
  })

  it('preserves mobile return, empty, and safe-area states', () => {
    const page = readFileSync('app/messages/[id]/page.tsx', 'utf8')

    expect(page).toContain("aria-label='Retour à la liste des messages'")
    expect(page).toContain('Premier message')
    expect(page).toContain('safe-area-inset-bottom')
  })
})
