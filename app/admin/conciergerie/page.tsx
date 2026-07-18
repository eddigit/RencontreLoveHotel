import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import MainLayout from '@/components/layout/main-layout'
import { AdminHeader } from '@/components/admin-header'
import { AdminTabs } from '@/components/admin-tabs'

interface RequestRecord {
  id: string
  nom: string
  email: string
  phone: string | null
  request_type: string | null
  response_preference: string | null
  conversation_id: string | null
  venue_preference: string | null
  desired_date: string | null
  party_size: string | null
  mood: string | null
  besoin: string
  budget: string | null
  email_sent: boolean | null
  created_at: string
}

const requestTypeLabels: Record<string, string> = {
  custom_evening: 'Soirée sur mesure',
  weekend: 'Week-end particulier',
  love_room: 'Love Room préparée',
  limousine: 'Limousine / arrivée scénarisée',
  restaurant: 'Restaurant ou partenaire sur étude',
  open_curtains: 'Rideaux ouverts',
  jacuzzi: 'Apéro jacuzzi privé',
  libertine_event: 'Événement libertin spécifique',
  other: 'Autre demande'
}

async function ensureConciergerieSchema() {
  await sql.query(
    `
      CREATE TABLE IF NOT EXISTS conciergerie_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        nom VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        request_type VARCHAR(100) NOT NULL DEFAULT 'custom_evening',
        response_preference VARCHAR(20) NOT NULL DEFAULT 'email',
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        venue_preference VARCHAR(160),
        desired_date VARCHAR(160),
        party_size VARCHAR(160),
        mood VARCHAR(120),
        besoin TEXT NOT NULL,
        budget VARCHAR(100),
        email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        admin_notified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `,
    []
  )

  await sql.query(
    `
      ALTER TABLE conciergerie_requests
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS phone VARCHAR(100),
        ADD COLUMN IF NOT EXISTS request_type VARCHAR(100) NOT NULL DEFAULT 'custom_evening',
        ADD COLUMN IF NOT EXISTS response_preference VARCHAR(20) NOT NULL DEFAULT 'email',
        ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS venue_preference VARCHAR(160),
        ADD COLUMN IF NOT EXISTS desired_date VARCHAR(160),
        ADD COLUMN IF NOT EXISTS party_size VARCHAR(160),
        ADD COLUMN IF NOT EXISTS mood VARCHAR(120),
        ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS admin_notified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    `,
    []
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function responseLabel(value?: string | null) {
  return value === 'chat' ? 'Chat interne' : 'Email'
}

export default async function AdminConciergeriePage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user || user.role !== 'admin') {
    redirect('/unauthorized')
  }

  await ensureConciergerieSchema()

  let demandes: RequestRecord[] = []
  try {
    demandes = (await sql.query<RequestRecord[]>(
      `
        SELECT
          id,
          nom,
          email,
          phone,
          request_type,
          response_preference,
          conversation_id,
          venue_preference,
          desired_date,
          party_size,
          mood,
          besoin,
          budget,
          email_sent,
          created_at
        FROM conciergerie_requests
        ORDER BY created_at DESC
      `,
      []
    )) as RequestRecord[]
  } catch (error) {
    console.error('Erreur récupération demandes conciergerie:', error)
    return (
      <MainLayout user={user}>
        <div className='container py-8'>
          <AdminHeader user={user} />
          <AdminTabs />
          <div className='rounded-2xl border border-red-400/30 bg-red-950/40 p-5 text-red-100'>
            Erreur serveur lors de la récupération des demandes.
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout user={user}>
      <div className='container py-8'>
        <AdminHeader user={user} />
        <AdminTabs />

        <div className='mb-8 rounded-3xl border border-white/10 bg-[#2d0737]/80 p-6 text-white'>
          <p className='text-sm font-black uppercase tracking-[0.2em] text-[#ff7ac0]'>
            Conciergerie Love Hotel
          </p>
          <h1 className='mt-2 text-3xl font-black'>Demandes de conciergerie</h1>
          <p className='mt-3 max-w-3xl text-sm leading-6 text-white/70'>
            Suivi des demandes privées : soirées sur mesure, week-ends,
            jacuzzis, rideaux ouverts, Love Rooms et scénarios plus classiques
            ou libertins. Le canal demandé permet de répondre directement par
            chat ou par email.
          </p>
        </div>

        {demandes.length === 0 ? (
          <div className='rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/70'>
            Aucune demande de conciergerie pour le moment.
          </div>
        ) : (
          <div className='grid gap-5'>
            {demandes.map(demande => {
              const requestLabel =
                requestTypeLabels[demande.request_type || ''] || 'Demande sur mesure'
              const chatLink = demande.conversation_id
                ? `/messages/${demande.conversation_id}`
                : null

              return (
                <article
                  key={demande.id}
                  className='rounded-3xl border border-white/10 bg-[#24002d]/80 p-5 text-white shadow-xl'
                >
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='rounded-full bg-[#ff3b8b] px-3 py-1 text-xs font-black uppercase text-white'>
                          {requestLabel}
                        </span>
                        <span className='rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/75'>
                          Canal de réponse : {responseLabel(demande.response_preference)}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            demande.email_sent
                              ? 'bg-emerald-400/15 text-emerald-200'
                              : 'bg-amber-400/15 text-amber-200'
                          }`}
                        >
                          {demande.email_sent ? 'Email envoyé' : 'Email non confirmé'}
                        </span>
                      </div>

                      <h2 className='mt-4 text-2xl font-black'>{demande.nom}</h2>
                      <p className='mt-1 text-sm text-white/65'>
                        {demande.email}
                        {demande.phone ? ` · ${demande.phone}` : ''}
                      </p>
                      <p className='mt-1 text-xs uppercase tracking-wide text-white/45'>
                        {formatDate(demande.created_at)}
                      </p>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                      {chatLink ? (
                        <Link
                          href={chatLink}
                          className='rounded-xl bg-[#ff3b8b] px-4 py-2 text-sm font-black text-white transition hover:brightness-110'
                        >
                          Répondre dans le chat
                        </Link>
                      ) : null}
                      <a
                        href={`mailto:${demande.email}`}
                        className='rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15'
                      >
                        Répondre par email
                      </a>
                    </div>
                  </div>

                  <div className='mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4'>
                    <p className='whitespace-pre-wrap text-sm leading-6 text-white/85'>
                      {demande.besoin}
                    </p>
                  </div>

                  <dl className='mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-2 xl:grid-cols-3'>
                    <div className='rounded-2xl bg-white/[0.04] p-3'>
                      <dt className='font-bold text-white'>Lieu souhaité</dt>
                      <dd>{demande.venue_preference || 'À définir'}</dd>
                    </div>
                    <div className='rounded-2xl bg-white/[0.04] p-3'>
                      <dt className='font-bold text-white'>Date ou période</dt>
                      <dd>{demande.desired_date || 'À définir'}</dd>
                    </div>
                    <div className='rounded-2xl bg-white/[0.04] p-3'>
                      <dt className='font-bold text-white'>Participants</dt>
                      <dd>{demande.party_size || 'À définir'}</dd>
                    </div>
                    <div className='rounded-2xl bg-white/[0.04] p-3'>
                      <dt className='font-bold text-white'>Ambiance</dt>
                      <dd>{demande.mood || 'À définir'}</dd>
                    </div>
                    <div className='rounded-2xl bg-white/[0.04] p-3'>
                      <dt className='font-bold text-white'>Budget</dt>
                      <dd>{demande.budget || 'Non précisé'}</dd>
                    </div>
                    <div className='rounded-2xl bg-white/[0.04] p-3'>
                      <dt className='font-bold text-white'>Référence</dt>
                      <dd className='break-all'>{demande.id}</dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
