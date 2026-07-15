'use client'

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import {
  getProductActivitySummary,
  type ProductActivitySummaryItem
} from '@/actions/product-activity-actions'
import type { ProductActivityType } from '@/lib/product-activity'
import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'

const labels: Record<ProductActivityType, string> = {
  member_search: 'Recherches',
  profile_viewed: 'Profils consultés',
  match_requested: 'Demandes de contact',
  match_accepted: 'Matchs acceptés',
  conversation_started: 'Conversations lancées',
  message_sent: 'Messages envoyés',
  event_created: 'Événements créés',
  event_joined: 'Participations',
  wall_post_created: 'Annonces publiées'
}

export function AdminProductActivity() {
  const [items, setItems] = useState<ProductActivitySummaryItem[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const result = await getProductActivitySummary()
        if (active) setItems(result)
      } catch (error) {
        if (!recoverFromStaleServerAction(error)) {
          console.error('Activité produit indisponible:', error)
        }
      }
    }
    load()
    const interval = setInterval(load, 120_000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <section className='mb-8 border-y border-white/10 py-5'>
      <div className='mb-4 flex items-center gap-2'>
        <Activity className='h-5 w-5 text-emerald-400' />
        <div>
          <h2 className='text-xl font-semibold'>Parcours communautaires</h2>
          <p className='text-sm text-muted-foreground'>Actions réelles, sans contenu privé</p>
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[560px] text-sm'>
          <thead className='text-left text-xs uppercase text-muted-foreground'>
            <tr className='border-b border-white/10'>
              <th className='px-2 py-2 font-medium'>Parcours</th>
              <th className='px-2 py-2 text-right font-medium'>24 heures</th>
              <th className='px-2 py-2 text-right font-medium'>7 jours</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.eventType} className='border-b border-white/5'>
                <td className='px-2 py-2.5 font-medium'>{labels[item.eventType]}</td>
                <td className='px-2 py-2.5 text-right tabular-nums'>{item.last24h.toLocaleString('fr-FR')}</td>
                <td className='px-2 py-2.5 text-right tabular-nums text-muted-foreground'>{item.last7d.toLocaleString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
