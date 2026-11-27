'use client'

import { useEffect, useState } from 'react'
import { getMatchingCoverage } from '@/actions/matching-coverage'

export function AdminMatchingCoverage() {
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof getMatchingCoverage>> | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    getMatchingCoverage().then(result => {
      if (active) setCounts(result)
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [])
  return <section className='mb-6 rounded-2xl border border-[#494136] bg-[#191819] p-5' aria-labelledby='matching-coverage-title'>
    <h2 id='matching-coverage-title' className='text-lg font-bold'>Préférences de matching renseignées</h2>
    {counts ? <p className='mt-2 text-sm text-[#d1ccc3]'>Sur {counts.total} profils visibles, {counts.targets} ont indiqué les types de profils recherchés, {counts.intents} la relation souhaitée et {counts.both} les deux.</p>
      : <p role='status'>{failed ? 'Données indisponibles.' : 'Chargement…'}</p>}
  </section>
}
