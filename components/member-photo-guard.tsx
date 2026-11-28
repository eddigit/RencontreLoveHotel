'use client'

import { useEffect } from 'react'
import { toast } from '@/hooks/use-toast'

const protectedPhoto = '[data-member-photo]'

/** Soft deterrents only. System screenshots need not emit a browser event. */
export function MemberPhotoGuard() {
  useEffect(() => {
    let lastNotice = -Infinity
    function warn(message: string) {
      if (performance.now() - lastNotice < 1200) return
      lastNotice = performance.now()
      toast({ title: message })
    }
    function blockPhotoGesture(event: Event) {
      const selected = event.type === 'copy' ? window.getSelection() : null
      const range =
        selected?.rangeCount && !selected.isCollapsed
          ? selected.getRangeAt(0)
          : null
      const includesPhoto =
        range &&
        Array.from(document.querySelectorAll(protectedPhoto)).some((photo) =>
          range.intersectsNode(photo)
        )
      if (
        !(
          event.target instanceof Element &&
          event.target.closest(protectedPhoto)
        ) &&
        !includesPhoto
      )
        return
      event.preventDefault()
      warn('La copie des photos des membres est interdite.')
    }
    function onScreenshotKey(event: KeyboardEvent) {
      if (
        event.key !== 'PrintScreen' ||
        !document.querySelector(protectedPhoto)
      )
        return
      warn('Interdiction de prendre des captures d’écran.')
    }
    const gestures = ['contextmenu', 'dragstart', 'copy']
    for (const name of gestures)
      document.addEventListener(name, blockPhotoGesture, true)
    document.addEventListener('keyup', onScreenshotKey)
    return () => {
      for (const name of gestures)
        document.removeEventListener(name, blockPhotoGesture, true)
      document.removeEventListener('keyup', onScreenshotKey)
    }
  }, [])
  return null
}
