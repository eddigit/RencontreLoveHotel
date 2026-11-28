'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, ArrowRight } from 'lucide-react'

interface InstallationPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallJoug() {
  const [prompt, setPrompt] = useState<InstallationPrompt | null>(null)
  const [installed, setInstalled] = useState(false)
  const [guide, setGuide] = useState(false)

  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
    function ready(event: Event) {
      event.preventDefault()
      setPrompt(event as InstallationPrompt)
    }
    function done() {
      setInstalled(true)
      setGuide(false)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', ready)
    window.addEventListener('appinstalled', done)
    return () => {
      window.removeEventListener('beforeinstallprompt', ready)
      window.removeEventListener('appinstalled', done)
    }
  }, [])

  async function install() {
    if (!prompt) { setGuide(!guide); return }
    setPrompt(null)
    try {
      await prompt.prompt()
      await prompt.userChoice
    } catch { setGuide(true) }
  }

  if (installed) return <Link href='/discover' className='inline-flex items-center gap-2 font-semibold text-[#e1c791]'>Ouvrir le cercle <ArrowRight size={16} /></Link>
  return (
    <div>
      <button type='button' onClick={install} aria-expanded={guide} aria-controls='installation-joug'
        className='inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d6bc87]/60 px-5 text-sm font-semibold text-[#ead7b0] hover:bg-white/5'>
        <Download size={16} /> Ajouter à mon écran d’accueil
      </button>
      {guide && <p id='installation-joug' role='status' className='mt-3 max-w-lg text-sm leading-6 text-stone-300'>
        Sur iPhone, ouvrez cette page dans Safari, touchez Partager puis « Sur l’écran d’accueil ».
        Sur Android ou ordinateur, ouvrez le menu du navigateur et choisissez « Installer l’application » si cette option est proposée.
      </p>}
    </div>
  )
}
