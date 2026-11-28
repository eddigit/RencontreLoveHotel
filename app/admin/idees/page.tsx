import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Bug, Lightbulb } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'
import MainLayout from '@/components/layout/main-layout'
import { listCommunityFeedbackAdmin } from '@/actions/community-feedback-actions'
import { FeedbackStatusControl } from './status-control'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Boîte à idées · Administration', robots: { index: false, follow: false } }

type Filters = Record<string, string | string[] | undefined>
const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris'
})
const controlClass = 'block min-h-11 w-full rounded-xl border border-white/20 bg-[#1c1d20] px-3 text-sm text-white focus-visible:ring-2 focus-visible:ring-[#d6bc87]'

export default async function AdminIdeasPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin') redirect('/unauthorized')
  const filters = await searchParams
  const kind = filters.kind === 'bug' || filters.kind === 'suggestion' ? filters.kind : undefined
  const status = filters.status === 'open' || filters.status === 'in_progress' || filters.status === 'resolved' ? filters.status : undefined
  const rawPage = typeof filters.page === 'string' ? Number(filters.page) : 1
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100000) : 1
  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams()
    if (kind) params.set('kind', kind)
    if (status) params.set('status', status)
    if (targetPage > 1) params.set('page', String(targetPage))
    return params.size ? '/admin/idees?' + params.toString() : '/admin/idees'
  }
  const data = await listCommunityFeedbackAdmin({ kind, status, page }).catch(() => null)
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  if (data && page > pageCount) redirect(hrefFor(pageCount))
  return (
    <MainLayout>
      <div className="container py-8 text-white">
        <AdminHeader user={session.user} />
        <AdminTabs />
        <section aria-labelledby="feedback-heading" className="mx-auto max-w-5xl">
          <header className="mb-6 flex items-center gap-4">
            <Lightbulb aria-hidden="true" className="h-9 w-9 shrink-0 text-[#d6bc87]" />
            <div><h2 id="feedback-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">Boîte à idées</h2>
              <p className="mt-1 text-sm text-white/70">Les idées et les problèmes envoyés depuis l’espace membre.</p></div>
            {data && data.openBugCount > 0 && <span className="rounded-full border border-amber-300/40 bg-graphite px-3 py-1 text-sm font-bold text-amber-100">{data.openBugCount} bug{data.openBugCount > 1 ? 's' : ''} ouvert{data.openBugCount > 1 ? 's' : ''}</span>}
          </header>
          <form action="/admin/idees" method="get" className="mb-6 grid items-end gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1 text-sm font-semibold"><span>Type de retour</span>
              <select key={kind ?? 'all'} name="kind" defaultValue={kind ?? ''} className={controlClass}>
                <option value="">Tous les retours</option><option value="suggestion">Idées</option><option value="bug">Problèmes</option>
              </select></label>
            <label className="space-y-1 text-sm font-semibold"><span>Avancement</span>
              <select key={status ?? 'all'} name="status" defaultValue={status ?? ''} className={controlClass}>
                <option value="">Tous les statuts</option><option value="open">À lire</option><option value="in_progress">En cours</option><option value="resolved">Traité</option>
              </select></label>
            <button className="min-h-11 rounded-xl bg-graphite px-5 font-bold text-graphite-ink hover:bg-graphite-hover">Filtrer</button>
          </form>
          {!data ? (
            <p role="alert" className="rounded-xl border border-rose-300/30 p-4">Les retours n’ont pas pu être chargés. <Link className="underline" href={hrefFor(page)}>Réessayer</Link></p>
          ) : (
            <>
              <p className="mb-3 text-sm text-white/65">{data.total} retour{data.total > 1 ? 's' : ''}</p>
              {data.items.length === 0 && <div className="rounded-2xl border border-dashed border-white/20 p-6">
                {kind || status ? <>Aucun retour ne correspond à ces filtres. <Link href="/admin/idees" className="text-[#d6bc87] underline">Voir tous les retours</Link></> : <>Aucun retour disponible. Les prochaines contributions des membres apparaîtront ici.</>}
              </div>}
              <ol className="space-y-3">
                {data.items.map(item => {
                  const isIdea = item.kind === 'suggestion'
                  const Icon = isIdea ? Lightbulb : Bug
                  return <li key={item.id} className="rounded-2xl border border-white/10 bg-white/[.045] p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="inline-flex items-center gap-2 font-bold"><Icon aria-hidden="true" className={isIdea ? 'h-4 w-4 text-[#d6bc87]' : 'h-4 w-4 text-[#d6bc87]'} />{isIdea ? 'Idée' : 'Problème'} · {item.reporter_name}</h3>
                      <time dateTime={new Date(item.created_at).toISOString()} className="text-sm text-white/65">{dateFormat.format(new Date(item.created_at))}</time>
                    </div>
                    <p className="my-4 whitespace-pre-wrap break-words text-base leading-7">{item.message}</p>
                    <FeedbackStatusControl id={item.id} status={item.status} />
                  </li>
                })}
              </ol>
              {pageCount > 1 && <nav aria-label="Pages de retours" className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                {page > 1 && <Link href={hrefFor(page - 1)} className="text-[#d6bc87] underline">Précédente</Link>}
                <span>Page {page} sur {pageCount}</span>
                {page < pageCount && <Link href={hrefFor(page + 1)} className="text-[#d6bc87] underline">Suivante</Link>}
              </nav>}
            </>
          )}
        </section>
      </div>
    </MainLayout>
  )
}
