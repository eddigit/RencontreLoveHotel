'use client'

import { useEffect, useRef, useState } from 'react'

export default function PwaUpdateNotification() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [show, setShow] = useState(false)
  const [applying, setApplying] = useState(false)
  const reloadAfterControllerChange = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    let registration: ServiceWorkerRegistration | undefined
    let disposed = false
    const offerWaitingWorker = (worker: ServiceWorker | null) => {
      if (!worker || !navigator.serviceWorker.controller || disposed) return
      setWaitingWorker(worker)
      setShow(true)
    }
    const observeInstallingWorker = () => {
      const worker = registration?.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') offerWaitingWorker(worker)
      })
    }
    const revalidate = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void registration?.update()
    }
    const onControllerChange = () => {
      // Another tab may activate an update; never discard a draft here.
      if (!reloadAfterControllerChange.current) return
      window.location.reload()
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
      if (disposed) return
      registration = reg
      offerWaitingWorker(reg.waiting)
      reg.addEventListener('updatefound', observeInstallingWorker)
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
      window.addEventListener('focus', revalidate)
      window.addEventListener('online', revalidate)
      window.addEventListener('pageshow', revalidate)
      revalidate()
    }).catch(() => {})

    return () => {
      disposed = true
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      window.removeEventListener('focus', revalidate)
      window.removeEventListener('online', revalidate)
      window.removeEventListener('pageshow', revalidate)
    }
  }, [])

  const applyUpdate = () => {
    if (!waitingWorker || applying) return
    reloadAfterControllerChange.current = true
    setApplying(true)
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!show) return null
  return (
    <section aria-live='polite' className='fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[1000] mx-auto max-w-md rounded-2xl border border-[#d6bc87]/40 bg-[#0d0e11] p-4 text-center text-[#f1eee8] shadow-2xl shadow-black/50'>
      <p className='text-sm font-medium'>Une nouvelle version est disponible.</p>
      <p className='mt-1 text-xs text-[#aaa69e]'>Vos saisies dans les autres onglets ne seront pas rechargées.</p>
      <button type='button' onClick={applyUpdate} disabled={applying} className='mt-3 rounded-xl bg-[#d6bc87] px-4 py-2 text-sm font-semibold text-[#191714] disabled:cursor-wait disabled:opacity-70'>
        {applying ? 'Mise à jour…' : 'Mettre à jour'}
      </button>
    </section>
  )
}
