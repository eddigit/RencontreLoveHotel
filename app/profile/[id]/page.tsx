import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { CalendarHeart, Heart, MapPin, Wine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { MatchRequestButton } from '@/components/match-request-button'
import { ProfileMessageForm } from '@/components/profile-message-form'
import { UserGallery } from '@/components/UserGallery'
import { MemberSafetyMenu } from '@/components/member-safety-menu'
import { MemberProfileBackButton } from '@/components/member-profile-back-button'
import { sql } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { defaultMemberImage } from '@/lib/default-member-image'
import { isUserRecentlySeen } from '@/lib/presence'
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

function normalizeProfileRouteId(id: string) {
  try {
    return decodeURIComponent(id || '').trim()
  } catch {
    return ''
  }
}

export default async function ProfilePage ({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profileId = normalizeProfileRouteId(id)
  if (!profileId || profileId.length > 128) notFound()

  const userProfileData = await getUserProfile(profileId)
  if (!userProfileData || !userProfileData.user) notFound()

  const profile = userProfileData.user
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as SessionUser
  const avatar = defaultMemberImage(profile)
  const interests = Array.isArray(profile.interests) ? profile.interests : []
  const profileOnline = isUserRecentlySeen(profile.last_seen_at)

  let matchStatus: any = null
  let isRequester = false
  if (currentUser?.id && currentUser.id !== profile.user_id) {
    matchStatus = await getMatchStatus(String(currentUser.id), String(profile.user_id))
    isRequester = matchStatus && matchStatus.user_id_1 === currentUser.id
  }

  const [existingThread] = currentUser?.id && matchStatus?.status === 'accepted'
    ? await sql.query<Array<{ id: string }>>(
        `SELECT c.id FROM conversations c
         JOIN conversation_participants me ON me.conversation_id = c.id AND me.user_id = $1
         JOIN conversation_participants peer ON peer.conversation_id = c.id AND peer.user_id = $2
         WHERE (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) = 2
         ORDER BY c.updated_at DESC NULLS LAST, c.id LIMIT 1`,
        [currentUser.id, profile.user_id]
      )
    : []

  const canShowActions = currentUser && currentUser.id !== profile.user_id

  return (
    <MainLayout session={session} user={currentUser}>
      <LhrV2Shell
        user={currentUser}
        eyebrow='Profil membre'
        title={`${profile.name}${profile.age ? `, ${profile.age}` : ''}`}
        action={<><MemberProfileBackButton />{canShowActions && <a href='#contact' className='inline-flex min-h-11 items-center rounded-lg bg-[#c1121f] px-4 text-sm font-bold text-white xl:hidden'>Entrer en contact</a>}</>}
      >
        <div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]'>
          <section className='overflow-hidden rounded-3xl border border-[#111821] bg-[#0a0f15] text-[#ecebe7] shadow-2xl shadow-black/30'>
            <div className='bg-[#04070b] p-3 sm:p-5'>
              <div className='relative mx-auto aspect-[4/5] w-full max-h-[64svh] max-w-[640px] overflow-hidden rounded-2xl bg-[#111821]'>
                {avatar.startsWith('http') ? (
                  <img src={avatar} alt={profile.name} className='h-full w-full object-contain' />
                ) : (
                  <Image
                    src={avatar}
                    alt={profile.name}
                    fill
                    className='object-contain'
                    sizes='(max-width: 1280px) 100vw, 640px'
                    priority
                  />
                )}
                {profileOnline && (
                  <span
                    aria-label='En ligne'
                    className='absolute right-4 top-4 z-10 h-4 w-4 rounded-full border-2 border-[#04070b] bg-[#35e48d]'
                  />
                )}
              </div>
            </div>

            <div className='border-t border-[#111821] p-5 sm:p-8'>
              <div className='mb-4 flex flex-wrap gap-2'>
                {profile.location && <Badge className='rounded-full border border-[#c1121f]/45 bg-[#c1121f]/10 px-3 py-1.5 text-[#ecebe7]'>
                  <MapPin className='mr-1 h-3.5 w-3.5' />
                  {profile.location}
                </Badge>}
                {profileOnline && <Badge className='rounded-full border border-[#c1121f]/45 bg-[#c1121f]/10 px-3 py-1.5 text-[#ecebe7]'>En ligne</Badge>}
              </div>


              {profile.bio && (
                <p className='break-words max-w-3xl text-base leading-7 text-[#c9c7c2]'>{profile.bio}</p>
              )}
            </div>
          </section>

          <aside className='flex flex-col gap-4'>

            {interests.length > 0 && <div className='rounded-2xl border border-[#111821] bg-[#111821] p-5 text-[#ecebe7]'>
              <h3 className='font-black'>Centres d’intérêt</h3>
              <div className='mt-4 flex flex-wrap gap-2'>
                {interests.map((interest: string) => (
                  <Badge
                    key={interest}
                    className='rounded-full border border-[#c1121f]/45 bg-[#c1121f]/10 px-3 py-1.5 text-[#ecebe7]'
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>}

            {canShowActions && (
              <div id='contact' className='order-first scroll-mt-20 rounded-2xl border border-[#c1121f]/45 bg-[#111821] p-5 text-[#ecebe7]'>
                <h3 className='font-black'>Entrer en contact</h3>
                <div className='mt-4 space-y-3'>
                  {matchStatus === null && (
                    <MatchRequestButton
                      currentUserId={String(currentUser.id)}
                      profileUserId={String(profile.user_id)}
                    />
                  )}

                  {matchStatus && matchStatus.status === 'pending' && isRequester && (
                    <Button disabled className='w-full rounded-2xl bg-[#111821] text-[#c9c7c2]'>
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
                        <Button type='submit' className='w-full rounded-2xl bg-[#c1121f] text-[#ecebe7] hover:bg-[#e01b2a]'>
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
                        <Button type='submit' variant='outline' className='w-full rounded-2xl border-[#111821] bg-[#0a0f15] text-[#ecebe7] hover:bg-[#111821]'>
                          Refuser
                        </Button>
                      </form>
                    </div>
                  )}

                  {matchStatus && matchStatus.status === 'accepted' && (
                    existingThread ? (
                      <Button asChild><Link href={`/messages/${existingThread.id}`}>Ouvrir notre conversation</Link></Button>
                    ) : <ProfileMessageForm recipientId={profile.user_id} />
                  )}

                  {matchStatus && matchStatus.status === 'rejected' && (
                    <div className='rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100'>
                      Match refusé
                    </div>
                  )}

                  <div className='grid gap-2'>
                    <Button asChild variant='outline' className='w-full rounded-2xl border-[#111821] bg-[#0a0f15] text-[#ecebe7] hover:bg-[#111821]'>
                      <Link href='/love-rooms'>
                        <Wine className='mr-2 h-4 w-4' />
                        Proposer une Love Room
                      </Link>
                    </Button>
                    <Button asChild variant='outline' className='w-full rounded-2xl border-[#111821] bg-[#0a0f15] text-[#ecebe7] hover:bg-[#111821]'>
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

            <div className='rounded-2xl border border-[#111821] bg-[#111821] p-5 text-[#ecebe7]'>
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
