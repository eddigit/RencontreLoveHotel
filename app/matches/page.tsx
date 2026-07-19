'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarHeart, Check, Clock, Heart, MessageCircle, Search, Send, Sparkles, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import {
  declineMatchRequest,
  getMemberRelationships,
  removeMatch
} from '@/actions/user-actions'
import { recoverFromStaleServerAction } from '@/lib/server-action-recovery'
import { defaultMemberImage } from '@/lib/default-member-image'

type MatchProfile = {
  id: string
  name: string
  age?: number
  location?: string
  image: string
  matchScore?: number | null
}

function toProfile (relationship: any): MatchProfile {
  return {
    id: relationship.other_user_id,
    name: relationship.other_user_name || 'Membre',
    age: relationship.other_user_age,
    location: relationship.other_user_location || 'Paris',
    image: defaultMemberImage({
      avatar: relationship.other_user_avatar,
      status: relationship.other_user_profile_status,
      gender: relationship.other_user_gender
    }),
    matchScore: relationship.match_score
  }
}

function scoreLabel (score?: number | null) {
  if (typeof score !== 'number') return 'Compatibilité'
  return `${Math.round(score)}% compatible`
}

export default function MatchesPage () {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchProfile[]>([])
  const [incoming, setIncoming] = useState<MatchProfile[]>([])
  const [outgoing, setOutgoing] = useState<MatchProfile[]>([])

  useEffect(() => {
    if (!authLoading && !user?.id) {
      router.replace('/login')
      return
    }

    if (authLoading) return

    async function fetchMatches () {
      if (!user?.id) return
      setLoading(true)
      setError(null)
      try {
        const overview = await getMemberRelationships(user.id)
        setMatches(overview.accepted.map(toProfile))
        setIncoming(overview.incoming.map(toProfile))
        setOutgoing(overview.outgoing.map(toProfile))
      } catch (err) {
        if (!recoverFromStaleServerAction(err)) {
          setError('Impossible de charger les matchs pour le moment. Rechargez la page pour réessayer.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [authLoading, user?.id, router])

  async function acceptIncoming (profile: MatchProfile) {
    if (!user?.id) return
    const response = await fetch('/api/accept-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId: profile.id, receiverId: user.id })
    })
    const data = await response.json()
    if (data.success) {
      setIncoming(items => items.filter(item => item.id !== profile.id))
      setMatches(items => [profile, ...items])
      if (data.conversationId) router.push(`/messages/${data.conversationId}`)
      return
    }
    setError(data.error || "La demande n'a pas pu être acceptée.")
  }

  async function rejectIncoming (profile: MatchProfile) {
    if (!user?.id) return
    const result = await declineMatchRequest(profile.id, user.id)
    if (result.success) {
      setIncoming(items => items.filter(item => item.id !== profile.id))
      return
    }
    setError(result.error || "La demande n'a pas pu être refusée.")
  }

  async function removeAccepted (profile: MatchProfile) {
    if (!user?.id) return
    const result = await removeMatch(user.id, profile.id)
    if (result.success) {
      setMatches(items => items.filter(item => item.id !== profile.id))
      return
    }
    setError(result.error || "Le match n'a pas pu être supprimé.")
  }

  if (authLoading || !user?.id) return null

  return (
    <MainLayout user={user}>
      <LhrV2Shell
        user={user}
        eyebrow='Relations'
        title='Matchs'
        subtitle='Demandes à traiter, matchs actifs, conversation ouverte et passage naturel vers une rencontre réelle.'
        action={
          <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>
            <Link href='/discover'>
              <Search className='mr-2 h-4 w-4' />
              Découvrir
            </Link>
          </Button>
        }
      >
        <div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]'>
          <section className='space-y-5'>
            <div className='grid gap-3 sm:grid-cols-3'>
              <StatCard label='Matchs actifs' value={matches.length} icon={<Heart className='h-5 w-5' />} />
              <StatCard label='Demandes à traiter' value={incoming.length} icon={<Clock className='h-5 w-5' />} />
              <StatCard label='Demandes envoyées' value={outgoing.length} icon={<Send className='h-5 w-5' />} />
            </div>

            {error && (
              <div className='rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100'>
                {error}
              </div>
            )}

            {loading ? (
              <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-white/68'>
                Chargement des relations...
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className='grid h-auto w-full grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.04] p-1'>
                  <TabsTrigger value='active' className='rounded-xl data-[state=active]:bg-[#ff4fa3] data-[state=active]:text-white'>
                    Matchs actifs
                  </TabsTrigger>
                  <TabsTrigger value='incoming' className='rounded-xl data-[state=active]:bg-[#ff4fa3] data-[state=active]:text-white'>
                    Demandes reçues
                  </TabsTrigger>
                  <TabsTrigger value='outgoing' className='rounded-xl data-[state=active]:bg-[#ff4fa3] data-[state=active]:text-white'>
                    Demandes envoyées
                  </TabsTrigger>
                </TabsList>

                <TabsContent value='active' className='mt-5'>
                  <MatchGrid
                    emptyTitle='Aucun match actif'
                    emptyText='Les matchs acceptés apparaîtront ici avec accès au profil et à la messagerie.'
                    profiles={matches}
                    renderActions={profile => (
                      <>
                        <Button asChild className='flex-1 bg-[#ff4fa3] text-white hover:bg-[#ff6db4]'>
                          <Link href={`/profile/${profile.id}`}>
                            <MessageCircle className='mr-2 h-4 w-4' />
                            Écrire
                          </Link>
                        </Button>
                        <Button onClick={() => removeAccepted(profile)} variant='outline' className='border-white/12 bg-white/[0.04]'>
                          <X className='h-4 w-4' />
                        </Button>
                      </>
                    )}
                  />
                </TabsContent>

                <TabsContent value='incoming' className='mt-5'>
                  <MatchGrid
                    emptyTitle='Aucune demande reçue'
                    emptyText='Les demandes à accepter ou refuser seront séparées ici.'
                    profiles={incoming}
                    badge='Demande reçue'
                    renderActions={profile => (
                      <>
                        <Button onClick={() => acceptIncoming(profile)} className='flex-1 bg-[#21b56f] text-white hover:bg-[#27c87c]'>
                          <Check className='mr-2 h-4 w-4' />
                          Accepter
                        </Button>
                        <Button onClick={() => rejectIncoming(profile)} variant='outline' className='flex-1 border-white/12 bg-white/[0.04]'>
                          <X className='mr-2 h-4 w-4' />
                          Refuser
                        </Button>
                      </>
                    )}
                  />
                </TabsContent>

                <TabsContent value='outgoing' className='mt-5'>
                  <MatchGrid
                    emptyTitle='Aucune demande envoyée'
                    emptyText='Les demandes envoyées en attente de réponse apparaîtront ici.'
                    profiles={outgoing}
                    badge='En attente'
                    renderActions={profile => (
                      <Button asChild variant='outline' className='w-full border-white/12 bg-white/[0.04]'>
                        <Link href={`/profile/${profile.id}`}>Voir le profil</Link>
                      </Button>
                    )}
                  />
                </TabsContent>
              </Tabs>
            )}
          </section>

          <aside className='space-y-4'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='font-black'>Priorité relation</h3>
              <p className='mt-3 text-sm leading-6 text-white/62'>
                Les demandes reçues sont isolées pour action rapide. Une fois acceptée, la relation passe en Conversation ouverte.
              </p>
            </div>
            <div className='rounded-2xl border border-[#ff8cc8]/20 bg-[#ff3b8b]/12 p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <Sparkles className='h-4 w-4 text-[#ff8cc8]' />
                Rencontre réelle
              </h3>
              <p className='mt-3 text-sm leading-6 text-white/62'>
                Après quelques échanges, proposez un événement, un apéro jacuzzi ou une Love Room pour transformer le match en rendez-vous.
              </p>
              <div className='mt-4 grid gap-2'>
                <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                  <Link href='/events'>
                    <CalendarHeart className='mr-2 h-4 w-4' />
                    Événements
                  </Link>
                </Button>
                <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
                  <Link href='/love-rooms'>Love Rooms</Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </LhrV2Shell>
    </MainLayout>
  )
}

function StatCard ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
      <div className='flex items-center justify-between text-white/58'>
        {icon}
        <span className='text-3xl font-black text-white'>{value}</span>
      </div>
      <div className='mt-3 text-sm font-bold text-white/72'>{label}</div>
    </div>
  )
}

function MatchGrid ({
  profiles,
  emptyTitle,
  emptyText,
  badge,
  renderActions
}: {
  profiles: MatchProfile[]
  emptyTitle: string
  emptyText: string
  badge?: string
  renderActions: (profile: MatchProfile) => React.ReactNode
}) {
  if (profiles.length === 0) {
    return (
      <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center'>
        <h3 className='text-xl font-black'>{emptyTitle}</h3>
        <p className='mx-auto mt-2 max-w-md text-sm leading-6 text-white/58'>{emptyText}</p>
      </div>
    )
  }

  return (
    <div className='grid gap-4 md:grid-cols-2'>
      {profiles.map(profile => (
        <article key={profile.id} className='overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]'>
          <div className='grid sm:grid-cols-[150px_minmax(0,1fr)]'>
            <Link href={`/profile/${profile.id}`} className='relative block min-h-[180px] overflow-hidden bg-white/10'>
              {profile.image.startsWith('http') ? (
                <img src={profile.image} alt={profile.name} className='h-full w-full object-cover' />
              ) : (
                <Image src={profile.image} alt={profile.name} fill className='object-cover' sizes='180px' />
              )}
              <div className='absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1 text-xs font-bold backdrop-blur'>
                {scoreLabel(profile.matchScore)}
              </div>
            </Link>
            <div className='p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <h3 className='truncate text-lg font-black'>
                    {profile.name}
                    {profile.age ? `, ${profile.age}` : ''}
                  </h3>
                  <p className='truncate text-sm text-white/58'>{profile.location}</p>
                </div>
                {badge && <Badge className='shrink-0 rounded-full bg-white/10 text-white'>{badge}</Badge>}
              </div>
              <div className='mt-5 flex gap-2'>{renderActions(profile)}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
