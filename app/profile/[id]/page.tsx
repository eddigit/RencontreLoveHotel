import { getPublicProfileVerified } from '@/actions/photo-verification-actions'
import { VerifiedProfileBadge } from '@/components/verified-profile-badge'
import { parseProfileTags } from '@/lib/profile-likes-dislikes'
import { DesireIcon } from '@/components/desire-icon'
import { publicDesires } from '@/lib/public-desires'
import { directoryProfileTypeLabel, seekingProfileTypeOptions } from '@/lib/member-profile-types'
import { PresenceDot } from '@/components/presence-dot'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { CalendarHeart, Heart, MapPin, Wine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import MainLayout from '@/components/layout/main-layout'
import { MatchRequestButton } from '@/components/match-request-button'
import { ProfileMessageForm } from '@/components/profile-message-form'
import { UserGallery } from '@/components/UserGallery'
import { MemberSafetyMenu } from '@/components/member-safety-menu'
import { MemberProfileBackButton } from '@/components/member-profile-back-button'
import { ProfileVisitTracker } from '@/components/profile-visit-tracker'
import { PostMeetingWordForm } from '@/components/post-meeting-word'
import { PublicPostMeetingWordsClient } from '@/components/public-post-meeting-words'
import { getPublicPostMeetingWords, submitPostMeetingWord } from '@/actions/post-meeting-word-actions'
import { sql } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { defaultMemberImage } from '@/lib/default-member-image'
import { displayMemberName } from '@/lib/display-member-name'
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
  const photos = userProfileData.photos || []
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as SessionUser
  const avatar = defaultMemberImage(profile)
  const interests = parseProfileTags(profile.interests)
  const likes = parseProfileTags(profile.likes)
  const dislikes = parseProfileTags(profile.dislikes)
  const targets = parseProfileTags(profile.seeking_profile_types)
  const lookingFor = seekingProfileTypeOptions.filter(option => targets.includes(option.value)).map(option => option.label)
  const desires = publicDesires(profile)
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

  const photoVerified = await getPublicProfileVerified(String(profile.user_id))
  const publicPostMeetingWords = await getPublicPostMeetingWords(String(profile.user_id)).catch(() => [])
  const canShowActions = currentUser && currentUser.id !== profile.user_id

  return (
    <MainLayout session={session} user={currentUser}>
      <main className='mx-auto w-full max-w-[1440px] px-3 pb-8 text-[#ecebe7] sm:px-6'>
        <div className='flex flex-wrap items-center justify-between gap-2 py-3'>
          <MemberProfileBackButton />
          {canShowActions && <ProfileVisitTracker profileUserId={String(profile.user_id)} />}
        </div>
        <header className='overflow-hidden rounded-2xl bg-[#181819]'>
          <div aria-hidden='true' className='h-24 bg-[#251f19] bg-cover bg-[center_48%] saturate-[.35] sm:h-36' style={{backgroundImage: "linear-gradient(0deg, #181819, #15131670 75%), url('/guide-love-rooms.webp')"}} />
          <div className='relative -mt-8 flex flex-wrap items-end gap-x-5 gap-y-3 px-4 pb-5 sm:px-6'>
              <div className='relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-[#111214] ring-4 ring-[#181819] sm:w-32'>
                {avatar.startsWith('http') ? (
                  <img src={avatar} alt={displayMemberName(profile.name)} className='h-full w-full object-contain' />
                ) : (
                  <Image
                    src={avatar}
                    alt={displayMemberName(profile.name)}
                    fill
                    className='object-contain'
                    sizes='(min-width: 768px) 128px, 112px'
                    priority
                  />
                )}
                {profileOnline && (
                  <PresenceDot className='right-4 top-4' />
                )}
              </div>
            <div className='min-w-0 flex-1'>
              <h1 className='break-words text-2xl font-bold tracking-tight sm:text-3xl'>{displayMemberName(profile.name)}{profile.age ? `, ${profile.age}` : ''}</h1>
                <div className='mt-2 flex flex-wrap gap-2'>
                <span className='self-center text-sm text-stone-300'>{directoryProfileTypeLabel(profile)}</span>
                {photoVerified && <VerifiedProfileBadge />}
                {profile.location && <Badge className='rounded-full border border-[#d6bc87]/45 bg-[#d6bc87]/10 px-3 py-1.5 text-[#ecebe7]'>
                  <MapPin className='mr-1 h-3.5 w-3.5' />
                  {profile.location}
                </Badge>}
                {profileOnline && <Badge className='rounded-full border border-[#d6bc87]/45 bg-[#d6bc87]/10 px-3 py-1.5 text-[#ecebe7]'>En ligne</Badge>}
                </div>
            </div>
            {canShowActions && <a href='#contact' className='inline-flex min-h-11 items-center rounded-lg bg-[#d6bc87] px-4 text-sm font-bold text-[#191714]'>Entrer en contact</a>}
          </div>
          {desires.length > 0 && <ul aria-label='Envies de rencontre' className='flex flex-wrap gap-2 px-4 pb-5 sm:px-6'>
            {desires.map(({ value, label }) => <li key={value} className='inline-flex items-center gap-2 rounded-full bg-[#272521] px-3 py-1.5 text-sm text-[#ead6aa]'>
              <DesireIcon value={value} className='size-7 shrink-0' />{label}
            </li>)}
          </ul>}
        </header>
        <nav aria-label='Sections du profil' className='my-4 flex flex-wrap gap-1 rounded-xl bg-[#19191c] p-1.5 text-sm font-semibold text-[#d6bc87] [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_a:hover]:bg-white/10'>
          <a href='#descriptif'>Présentation</a><a href='#gouts'>Goûts et limites</a><a href='#galerie'>Galerie</a><a href='#mots'>Commentaires</a>
        </nav>
        <div className='grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]'>
          <div className='grid min-w-0 gap-5'>
            <section id='descriptif' className='scroll-mt-20 rounded-2xl bg-[#181819] p-5'>
              <h2 className='text-xl font-bold'>Présentation</h2>
              <p className='mt-3 whitespace-pre-line break-words leading-7 text-stone-300'>{profile.bio?.trim() || 'Ce membre n’a pas encore rédigé sa présentation.'}</p>
            </section>
            <section id='galerie' className='rounded-2xl border border-[#111821] bg-[#111821] p-5 text-[#ecebe7]'>
              <h3 className='flex items-center gap-2 font-black'>
                <Heart className='h-4 w-4 text-[#d6bc87]' />
                Galerie
              </h3>
              <div className='mt-4'>
                <UserGallery photos={photos} />
              </div>
            </section>
            <section id='mots' className='scroll-mt-20 rounded-2xl bg-[#181819] p-5'>
              <h2 className='text-lg font-bold'>Commentaires après rencontre</h2>
              {publicPostMeetingWords.length ? <PublicPostMeetingWordsClient words={publicPostMeetingWords} /> : <p className='mt-2 text-sm text-stone-400'>Aucun mot publié pour le moment.</p>}
              {canShowActions && <details className='mt-3'><summary className='cursor-pointer py-2 text-sm font-semibold text-[#d6bc87]'>Laisser un mot après une rencontre</summary><PostMeetingWordForm recipientUserId={String(profile.user_id)} onSubmit={submitPostMeetingWord} /></details>}
            </section>
          </div>
          <aside className='grid min-w-0 gap-5'>
            <section id='gouts' className='rounded-2xl border border-[#111821] bg-[#111821] p-5 text-[#ecebe7]'>
              <h3 className='font-black'>Goûts et limites déclarés</h3>
              <p className='mt-4 text-sm font-semibold'>Ce que je recherche</p>
              <p className='mt-1 text-sm text-stone-300'>{lookingFor.join(' · ') || 'Non renseigné'}</p>
              <p className='mt-4 text-sm font-semibold'>Centres d’intérêt</p>
              <div className='mt-2 flex flex-wrap gap-2'>
                {!interests.length && <span className='text-sm text-stone-400'>Non renseignés</span>}
                {interests.map((interest: string) => (
                  <Badge
                    key={interest}
                    className='rounded-full border border-[#d6bc87]/45 bg-[#d6bc87]/10 px-3 py-1.5 text-[#ecebe7]'
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
              <div className='mt-4'><p className='text-xs font-bold uppercase tracking-wide text-[#d6bc87]'>J’aime</p><p className='mt-1 text-sm text-[#c9c7c2]'>{likes.length ? likes.join(' · ') : 'Non renseigné'}</p><p className='mt-3 text-xs font-bold uppercase tracking-wide text-[#d6bc87]'>Je préfère éviter</p><p className='mt-1 text-sm text-[#c9c7c2]'>{dislikes.length ? dislikes.join(' · ') : 'Non renseigné'}</p></div>
            </section>


            {canShowActions && (
              <section id='contact' className=' scroll-mt-20 rounded-2xl border border-[#d6bc87]/45 bg-[#111821] p-5 text-[#ecebe7]'><div>
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
                        <Button type='submit' className='w-full rounded-2xl bg-[#d6bc87] text-[#191714] hover:bg-[#e5d1aa]'>
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
                  <details className='pt-3'><summary className='cursor-pointer py-2 text-sm font-semibold'>Signaler ou bloquer ce profil</summary><MemberSafetyMenu targetUserId={String(profile.user_id)} /></details>

                </div></div>
              </section>
            )}

          </aside>
        </div>
      </main>
    </MainLayout>
  )
}
