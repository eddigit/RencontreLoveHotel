import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { ArrowLeft, CalendarHeart, Heart, MapPin, MessageCircle, Sparkles, Wine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { MatchRequestButton } from '@/components/match-request-button'
import { ProfileMessageForm } from '@/components/profile-message-form'
import { UserGallery } from '@/components/UserGallery'
import { MemberSafetyMenu } from '@/components/member-safety-menu'
import { authOptions } from '@/lib/auth'
import {
  acceptMatchRequest,
  declineMatchRequest,
  getMatchStatus,
  getUserProfile
} from '@/actions/user-actions'

type SessionUser = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
  avatar?: string
  onboardingCompleted?: boolean
}

function compatibilityFromProfile (profile: any) {
  const interests = Array.isArray(profile.interests) ? profile.interests.length : 0
  return Math.min(96, 86 + interests)
}

export default async function ProfilePage ({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!id || !uuidRegex.test(id)) notFound()

  const userProfileData = await getUserProfile(id)
  if (!userProfileData || !userProfileData.user) notFound()

  const profile = userProfileData.user
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as SessionUser
  const avatar = profile.avatar || '/elegant-woman-purple-glow.png'
  const interests = Array.isArray(profile.interests) ? profile.interests : []

  let matchStatus: any = null
  let isRequester = false
  if (currentUser?.id && currentUser.id !== profile.user_id) {
    matchStatus = await getMatchStatus(String(currentUser.id), String(profile.user_id))
    isRequester = matchStatus && matchStatus.user_id_1 === currentUser.id
  }

  const canShowActions = currentUser && currentUser.id !== profile.user_id

  return (
    <MainLayout session={session} user={currentUser}>
      <LhrV2Shell
        user={currentUser}
        eyebrow='Profil membre'
        title={`${profile.name}${profile.age ? `, ${profile.age}` : ''}`}
        subtitle='Une fiche claire pour décider vite : intention, compatibilité, contexte et action.'
        action={
          <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
            <Link href='/discover'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Découvrir
            </Link>
          </Button>
        }
      >
        <div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]'>
          <section className='overflow-hidden rounded-3xl border border-white/10 bg-black/18'>
            <div className='relative min-h-[640px]'>
              {avatar.startsWith('http') ? (
                <img src={avatar} alt={profile.name} className='absolute inset-0 h-full w-full object-cover' />
              ) : (
                <Image
                  src={avatar}
                  alt={profile.name}
                  fill
                  className='object-cover'
                  sizes='(max-width: 1280px) 100vw, 900px'
                  priority
                />
              )}
              <div className='absolute inset-0 bg-gradient-to-t from-[#100118] via-[#100118]/58 to-[#100118]/8' />

              <div className='absolute inset-x-0 bottom-0 p-5 sm:p-8'>
                <div className='mb-4 flex flex-wrap gap-2'>
                  <Badge className='rounded-full border border-white/12 bg-white/14 px-3 py-1.5 text-white backdrop-blur-md'>
                    <MapPin className='mr-1 h-3.5 w-3.5' />
                    {profile.location || 'Paris'}
                  </Badge>
                  <Badge className='rounded-full border border-white/12 bg-white/14 px-3 py-1.5 text-white backdrop-blur-md'>
                    Disponible ce soir
                  </Badge>
                  <Badge className='rounded-full border border-white/12 bg-white/14 px-3 py-1.5 text-white backdrop-blur-md'>
                    Premium
                  </Badge>
                </div>

                <h2 className='text-4xl font-black sm:text-6xl'>
                  {profile.name}
                  {profile.age ? `, ${profile.age}` : ''}
                </h2>
                <p className='mt-4 max-w-3xl text-base leading-7 text-white/76'>
                  {profile.bio ||
                    'Une personnalité élégante et spontanée. Recherche une rencontre discrète, dans un lieu premium, avec une vraie conversation avant tout.'}
                </p>

                <div className='mt-6 grid gap-3 sm:grid-cols-3'>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-4'>
                    <div className='text-3xl font-black'>{compatibilityFromProfile(profile)}%</div>
                    <div className='text-sm font-bold text-white/72'>compatibilité</div>
                  </div>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-4'>
                    <div className='text-3xl font-black'>4 km</div>
                    <div className='text-sm font-bold text-white/72'>distance</div>
                  </div>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-4'>
                    <div className='text-3xl font-black'>{interests.length}</div>
                    <div className='text-sm font-bold text-white/72'>intérêts</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className='space-y-4'>
            <div className='rounded-2xl border border-[#94ffc9]/20 bg-[#94ffc9]/10 p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <MessageCircle className='h-4 w-4 text-[#94ffc9]' />
                Message ouvert
              </h3>
              <p className='mt-3 text-sm leading-6 text-white/66'>
                Après match accepté, la conversation devient disponible avec texte, vocaux, images et vidéos.
              </p>
            </div>

            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <Sparkles className='h-4 w-4 text-[#ff8cc8]' />
                Intentions
              </h3>
              <p className='mt-3 text-sm leading-6 text-white/68'>
                {profile.bio ||
                  'Rencontre élégante, lieu discret, ambiance premium, échange avant rendez-vous.'}
              </p>
            </div>

            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='font-black'>Centres d’intérêt</h3>
              <div className='mt-4 flex flex-wrap gap-2'>
                {(interests.length ? interests : ['Jacuzzi', 'Cocktails', 'Dîner privé']).map((interest: string) => (
                  <Badge
                    key={interest}
                    className='rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-white'
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            {canShowActions && (
              <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
                <h3 className='font-black'>Actions</h3>
                <div className='mt-4 space-y-3'>
                  {matchStatus === null && (
                    <MatchRequestButton
                      currentUserId={String(currentUser.id)}
                      profileUserId={String(profile.user_id)}
                    />
                  )}

                  {matchStatus && matchStatus.status === 'pending' && isRequester && (
                    <Button disabled className='w-full rounded-2xl bg-white/16'>
                      Demande envoyée
                    </Button>
                  )}

                  {matchStatus && matchStatus.status === 'pending' && !isRequester && (
                    <div className='grid gap-2'>
                      <form
                        action={async () => {
                          'use server'
                          const accepted = await acceptMatchRequest(
                            matchStatus.user_id_1,
                            matchStatus.user_id_2
                          )
                          if (accepted?.conversationId) redirect(`/messages/${accepted.conversationId}`)
                        }}
                      >
                        <Button type='submit' className='w-full rounded-2xl bg-[#21b56f] hover:bg-[#25c97d]'>
                          Accepter
                        </Button>
                      </form>
                      <form
                        action={async () => {
                          'use server'
                          await declineMatchRequest(
                            matchStatus.user_id_1,
                            matchStatus.user_id_2
                          )
                        }}
                      >
                        <Button type='submit' variant='outline' className='w-full rounded-2xl border-white/12 bg-white/[0.04]'>
                          Refuser
                        </Button>
                      </form>
                    </div>
                  )}

                  {matchStatus && matchStatus.status === 'accepted' && (
                    <ProfileMessageForm recipientId={profile.user_id} />
                  )}

                  {matchStatus && matchStatus.status === 'rejected' && (
                    <div className='rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100'>
                      Match refusé
                    </div>
                  )}

                  <div className='grid gap-2'>
                    <Button asChild variant='outline' className='w-full rounded-2xl border-white/12 bg-white/[0.04]'>
                      <Link href='/love-rooms'>
                        <Wine className='mr-2 h-4 w-4' />
                        Proposer une Love Room
                      </Link>
                    </Button>
                    <Button asChild variant='outline' className='w-full rounded-2xl border-white/12 bg-white/[0.04]'>
                      <Link href='/events'>
                        <CalendarHeart className='mr-2 h-4 w-4' />
                        Inviter à un Événement
                      </Link>
                    </Button>
                  </div>
                  <MemberSafetyMenu targetUserId={String(profile.user_id)} />
                </div>
              </div>
            )}

            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <Heart className='h-4 w-4 text-[#ff8cc8]' />
                Galerie
              </h3>
              <div className='mt-4'>
                <UserGallery userId={profile.user_id} />
              </div>
            </div>
          </aside>
        </div>
      </LhrV2Shell>
    </MainLayout>
  )
}
