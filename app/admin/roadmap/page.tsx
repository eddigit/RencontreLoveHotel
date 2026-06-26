import MainLayout from '@/components/layout/main-layout'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import {
  getRoadmapItemsByStatus,
  getRoadmapSummary,
  roadmapItems,
  type RoadmapItem,
  type RoadmapStatus
} from '@/lib/admin-roadmap'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, Clock3, Hammer, ListChecks } from 'lucide-react'

const sections: Array<{
  status: RoadmapStatus
  title: string
  description: string
  icon: typeof CheckCircle2
  badgeClassName: string
}> = [
  {
    status: 'ok',
    title: 'Points OK',
    description: 'Ce qui est fonctionnel ou validé dans la bêta.',
    icon: CheckCircle2,
    badgeClassName: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
  },
  {
    status: 'issue',
    title: 'Points pas bons',
    description: 'Bugs, incohérences, dette technique ou sujets à reprendre.',
    icon: AlertTriangle,
    badgeClassName: 'border-red-500/40 bg-red-500/10 text-red-200'
  },
  {
    status: 'developed',
    title: 'Points développés',
    description: 'Changements déjà livrés ou stabilisés sur la bêta.',
    icon: Hammer,
    badgeClassName: 'border-pink-500/40 bg-pink-500/10 text-pink-200'
  },
  {
    status: 'planned',
    title: 'À développer',
    description: 'Travaux prévus pour rendre la bêta présentable et exploitable.',
    icon: Clock3,
    badgeClassName: 'border-sky-500/40 bg-sky-500/10 text-sky-200'
  }
]

function RoadmapItemCard ({ item }: { item: RoadmapItem }) {
  return (
    <li className='rounded-md border border-white/10 bg-white/[0.03] p-4'>
      <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='font-semibold leading-snug text-white'>{item.title}</h3>
          <p className='mt-1 text-sm text-white/70'>{item.note}</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='outline' className='border-white/20 text-white/80'>
            {item.priority}
          </Badge>
          <Badge variant='outline' className='border-white/20 text-white/70'>
            {item.owner}
          </Badge>
        </div>
      </div>
      <div className='space-y-2 text-sm text-white/70'>
        <p>
          <span className='font-medium text-white/85'>Impact : </span>
          {item.impact}
        </p>
        <p>
          <span className='font-medium text-white/85'>Prochaine action : </span>
          {item.nextAction}
        </p>
      </div>
      <div className='mt-4 flex flex-wrap gap-2 text-xs text-white/60'>
        <span>{item.category}</span>
        <span>{item.phase}</span>
        <span>
          Mis à jour le {new Date(item.updatedAt).toLocaleDateString('fr-FR')}
        </span>
      </div>
    </li>
  )
}

export default async function AdminRoadmapPage () {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user || user.role !== 'admin') {
    redirect('/unauthorized')
  }

  const summary = getRoadmapSummary(roadmapItems)

  return (
    <MainLayout user={user}>
      <div className='container py-10'>
        <AdminHeader user={user} />
        <AdminTabs />

        <div className='mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div>
            <div className='mb-2 flex items-center gap-2 text-primary'>
              <ListChecks className='h-5 w-5' />
              <span className='text-sm font-medium uppercase tracking-wide'>
                Suivi bêta
              </span>
            </div>
            <h1 className='text-3xl font-bold text-white'>Roadmap projet</h1>
            <p className='mt-2 max-w-3xl text-sm text-white/70'>
              Vue de pilotage pour suivre ce qui est valide, ce qui ne va pas et
              ce qui a été développé sur la bêta Love Hotel Rencontres.
            </p>
          </div>
          <div className='grid grid-cols-2 gap-3 text-center md:grid-cols-4'>
            <div className='rounded-md border border-white/10 bg-white/[0.04] px-4 py-3'>
              <div className='text-2xl font-bold text-emerald-200'>{summary.ok}</div>
              <div className='text-xs text-white/60'>OK</div>
            </div>
            <div className='rounded-md border border-white/10 bg-white/[0.04] px-4 py-3'>
              <div className='text-2xl font-bold text-red-200'>{summary.issue}</div>
              <div className='text-xs text-white/60'>Pas bons</div>
            </div>
            <div className='rounded-md border border-white/10 bg-white/[0.04] px-4 py-3'>
              <div className='text-2xl font-bold text-pink-200'>{summary.developed}</div>
              <div className='text-xs text-white/60'>Développés</div>
            </div>
            <div className='rounded-md border border-white/10 bg-white/[0.04] px-4 py-3'>
              <div className='text-2xl font-bold text-sky-200'>{summary.planned}</div>
              <div className='text-xs text-white/60'>À développer</div>
            </div>
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-2'>
          {sections.map(section => {
            const Icon = section.icon
            const items = getRoadmapItemsByStatus(roadmapItems, section.status)

            return (
              <Card key={section.status} className='border-white/10 bg-black/20'>
                <CardHeader>
                  <div className='mb-3 flex items-center justify-between gap-3'>
                    <Icon className='h-5 w-5 text-primary' />
                    <Badge variant='outline' className={section.badgeClassName}>
                      {items.length}
                    </Badge>
                  </div>
                  <CardTitle className='text-xl text-white'>{section.title}</CardTitle>
                  <CardDescription className='text-white/60'>
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-3'>
                    {items.map(item => (
                      <RoadmapItemCard key={item.id} item={item} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </MainLayout>
  )
}
