import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import {
  ArrowLeft,
  CalendarHeart,
  Compass,
  HeartHandshake,
  Images,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserRound,
  Wine
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import MainLayout from '@/components/layout/main-layout'
import { MobileNavigation } from '@/components/mobile-navigation'
import { MatchRequestButton } from '@/components/match-request-button'
import { ProfileMessageForm } from '@/components/profile-message-form'
import { UserGallery } from '@/components/UserGallery'
import { authOptions } from '@/lib/auth'
import {
  acceptMatchRequest,
  declineMatchRequest,
  getMatchStatus,
  getUserProfile
} from '@/actions/user-actions'
import { findOrCreateConversation } from '@/actions/conversation-actions'

type SessionUser = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
  avatar?: string
  onboardingCompleted?: boolean
}

const relationshipLabels: Record<string, string> = {
  single_male: 'Homme',
  single_female: 'Femme',
  married_male: 'Homme en couple',
  married_female: 'Femme en couple',
  couple: 'Couple',
  couple_mf: 'Couple',
  couple_mm: 'Couple',
  couple_ff: 'Couple'
}

const orientationLabels: Record<string, string> = {
  hetero: 'Hétérosexuel',
  straight: 'Hétérosexuel',
  bisexual: 'Bisexuel',
  bi: 'Bisexuel',
  gay: 'Homosexuel',
  homo: 'Homosexuel'
}

function profileType (profile: any) {
  const value = String(profile.status || profile.gender || '').toLowerCase()
  if (value.includes('couple')) return 'Couple'
  if (value.includes('female') || value.includes('woman') || value === 'femme') return 'Femme'
  if (value.includes('male') || value.includes('man') || value === 'homme') return 'Homme'
  return relationshipLabels[value] || 'Membre'
}

function profileImage (profile: any) {
  const avatar = String(profile.avatar || '').trim()
  if (avatar) return avatar
  const type = profileType(profile)
  if (type === 'Couple') return '/default-member-couple.jpg'
  if (type === 'Femme') return '/default-member-woman.jpg'
  if (type === 'Homme') return '/default-member-man.jpg'
  return '/elegant-woman-purple-glow.png'
}

function realIntentions (data: any) {
  const intentions: string[] = []
  const meeting = data.meetingTypes || {}
  const preferences = data.preferences || {}

  if (meeting.friendly) intentions.push('Rencontre amicale')
  if (meeting.romantic) intentions.push('Rencontre romantique')
  if (meeting.playful) intentions.push('Rencontre complice')
  if (meeting.open_curtains) intentions.push('Rideaux ouverts')
  if (meeting.libertine) intentions.push('Rencontre libertine')
  if (meeting.open_to_other_couples) intentions.push('Rencontrer d’autres couples')
  if (preferences.interested_in_events) intentions.push('Événements')
  if (preferences.interested_in_restaurant) intentions.push('Dîner')

  return [...new Set(intentions)]
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
  if (!userProfileData?.user) notFound()

  const profile = userProfileData.user
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as SessionUser
  const galleryPortrait = userProfileData.photos.find((photo: any) => photo.is_primary)?.url || userProfileData.photos[0]?.url
  const avatar = galleryPortrait || profileImage(profile)
  const interests = Array.isArray(profile.interests) ? profile.interests : []
  const intentions = realIntentions(userProfileData)
  const type = profileType(profile)
  const orientation = orientationLabels[String(profile.orientation || '').toLowerCase()]

  let matchStatus: any = null
  let isRequester = false
  if (currentUser?.id && currentUser.id !== profile.user_id) {
    matchStatus = await getMatchStatus(String(currentUser.id), String(profile.user_id))
    isRequester = Boolean(matchStatus && matchStatus.user_id_1 === currentUser.id)
  }

  const canShowActions = Boolean(currentUser?.id && currentUser.id !== profile.user_id)

  return (
    <MainLayout session={session} user={currentUser}>
      <LhrV2Shell
        user={currentUser}
        eyebrow='Communauté'
        title='Profil membre'
        subtitle='Découvrez la personne, ses envies, ses photos et sa présentation.'
        action={
          <Button asChild variant='outline' className='border-white/12 bg-white/[0.04]'>
            <Link href='/members'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Tous les membres
            </Link>
          </Button>
        }
      >
        <div className='mx-auto max-w-6xl space-y-4 pb-20 lg:space-y-5 lg:pb-0'>
          <section
            data-testid='profile-summary'
            className='overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]'
          >
            <div className='grid grid-cols-[112px_minmax(0,1fr)] gap-4 p-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-5 sm:p-5 lg:grid-cols-[220px_minmax(0,1fr)_290px] lg:gap-6 lg:p-6'>
              <div
                data-testid='profile-portrait'
                className='relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#110318] sm:rounded-2xl'
              >
                {avatar.startsWith('http') ? (
                  <img src={avatar} alt={profile.name} className='h-full w-full object-cover' />
                ) : (
                  <Image
                    src={avatar}
                    alt={profile.name}
                    fill
                    className='object-cover'
                    sizes='(max-width: 640px) 112px, (max-width: 1024px) 180px, 220px'
                    priority
                  />
                )}
              </div>

              <div className='min-w-0 self-center'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge className='border border-[#94ffc9]/25 bg-[#94ffc9]/10 text-[#b8ffda]'>
                    <ShieldCheck className='mr-1 h-3.5 w-3.5' />
                    Profil membre
                  </Badge>
                  <Badge variant='outline' className='border-white/15 text-white/76'>
                    {type}
                  </Badge>
                </div>

                <h2 className='mt-3 break-words text-2xl font-black leading-tight sm:text-4xl lg:text-5xl'>
                  {profile.name}
                  {profile.age ? <span className='font-semibold text-white/58'>, {profile.age}</span> : null}
                </h2>

                <div className='mt-3 flex flex-col gap-1.5 text-sm text-white/66 sm:flex-row sm:flex-wrap sm:gap-x-5'>
                  {profile.location && (
                    <span className='flex items-center gap-1.5'>
                      <MapPin className='h-4 w-4 text-[#ff8cc8]' />
                      {profile.location}
                    </span>
                  )}
                  {orientation && (
                    <span className='flex items-center gap-1.5'>
                      <Compass className='h-4 w-4 text-[#ff8cc8]' />
                      {orientation}
                    </span>
                  )}
                </div>

              </div>

              <aside
                data-testid='profile-action-panel'
                className='col-span-2 border-t border-white/10 pt-4 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0'
              >
                <div data-testid='profile-primary-action'>
                  <span data-testid='profile-mobile-action' className='sr-only'>Actions du profil</span>
                  <h3 className='flex items-center gap-2 font-black'>
                    <MessageCircle className='h-4 w-4 text-[#ff8cc8]' />
                    {canShowActions ? 'Entrer en contact' : 'Votre profil'}
                  </h3>
                  <p className='mt-2 text-sm leading-5 text-white/55'>
                    {matchStatus?.status === 'accepted'
                      ? 'Message ouvert. Organisez maintenant votre rencontre.'
                      : 'Après match accepté, la messagerie privée devient disponible.'}
                  </p>

                  <div className='mt-4'>
                  {matchStatus === null && (
                    canShowActions ? (
                      <MatchRequestButton
                        currentUserId={String(currentUser.id)}
                        profileUserId={String(profile.user_id)}
                      />
                    ) : (
                      <Button asChild className='w-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8]'>
                        <Link href='/profile'>Modifier mon profil</Link>
                      </Button>
                    )
                  )}

                  {matchStatus?.status === 'pending' && isRequester && (
                    <Button disabled className='w-full bg-white/12'>
                      Demande envoyée
                    </Button>
                  )}

                  {matchStatus?.status === 'pending' && !isRequester && (
                      <div className='grid gap-2'>
                      <form
                        action={async () => {
                          'use server'
                          const accepted = await acceptMatchRequest(
                            matchStatus.user_id_1,
                            matchStatus.user_id_2
                          )
                          if (accepted?.success) {
                            const conversationId = await findOrCreateConversation(
                              matchStatus.user_id_2,
                              matchStatus.user_id_1
                            )
                            if (conversationId) redirect(`/messages/${conversationId}`)
                          }
                        }}
                      >
                        <Button type='submit' className='w-full bg-[#21b56f] hover:bg-[#25c97d]'>
                          Accepter la demande
                        </Button>
                      </form>
                      <form
                        action={async () => {
                          'use server'
                          await declineMatchRequest(matchStatus.user_id_1, matchStatus.user_id_2)
                        }}
                      >
                        <Button type='submit' variant='outline' className='w-full border-white/15 bg-transparent'>
                          Refuser
                        </Button>
                      </form>
                    </div>
                  )}

                  {matchStatus?.status === 'accepted' && (
                    <ProfileMessageForm recipientId={profile.user_id} />
                  )}

                  {matchStatus?.status === 'rejected' && (
                    <div className='text-sm text-white/58'>Cette demande de match a été refusée.</div>
                  )}
                  </div>
                </div>

                {canShowActions && (
                  <div className='mt-4 grid gap-2 border-t border-white/10 pt-4'>
                    <Button asChild variant='outline' className='w-full justify-start border-white/12 bg-transparent'>
                      <Link href='/events'>
                        <CalendarHeart className='mr-2 h-4 w-4' />
                        Inviter à un événement
                      </Link>
                    </Button>
                    <Button asChild variant='outline' className='w-full justify-start border-white/12 bg-transparent'>
                      <Link href='/love-rooms'>
                        <Wine className='mr-2 h-4 w-4' />
                        Proposer une Love Room
                      </Link>
                    </Button>
                  </div>
                )}
              </aside>
            </div>
          </section>

          <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5'>
            <section className='space-y-4'>
              <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:p-6'>
                <h3 className='flex items-center gap-2 text-lg font-black'>
                  <UserRound className='h-5 w-5 text-[#ff8cc8]' />
                  À propos
                </h3>
                <p className='mt-4 whitespace-pre-line text-[15px] leading-7 text-white/72'>
                  {profile.bio || 'Ce profil n’a pas encore ajouté de présentation.'}
                </p>
              </div>

              {profile.intro_video_url && (
                <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:p-6'>
                  <h3 className='flex items-center gap-2 text-lg font-black'>
                    <MessageCircle className='h-5 w-5 text-[#94ffc9]' />
                    Vidéo de présentation
                  </h3>
                  <video
                    className='mt-4 aspect-video w-full rounded-xl bg-black object-contain'
                    controls
                    playsInline
                    preload='metadata'
                  >
                    <source src={profile.intro_video_url} />
                    Votre navigateur ne peut pas lire cette vidéo.
                  </video>
                </div>
              )}

              <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:p-6'>
                <h3 className='flex items-center gap-2 text-lg font-black'>
                  <Images className='h-5 w-5 text-[#ff8cc8]' />
                  Galerie
                </h3>
                <div className='mt-4'>
                  <UserGallery userId={profile.user_id} />
                </div>
              </div>
            </section>

            <aside className='space-y-4'>
              <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
                <h3 className='flex items-center gap-2 font-black'>
                  <HeartHandshake className='h-4 w-4 text-[#94ffc9]' />
                  Envies de rencontre
                </h3>
                {intentions.length ? (
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {intentions.map(intention => (
                      <Badge key={intention} className='border border-white/10 bg-white/[0.07] text-white'>
                        {intention}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className='mt-3 text-sm leading-6 text-white/55'>Aucune intention renseignée.</p>
                )}
              </div>

              <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
                <h3 className='font-black'>Centres d’intérêt</h3>
                {interests.length ? (
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {interests.map((interest: string) => (
                      <Badge key={interest} variant='outline' className='border-white/15 text-white/80'>
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className='mt-3 text-sm leading-6 text-white/55'>Aucun centre d’intérêt renseigné.</p>
                )}
              </div>

            </aside>
          </div>
        </div>
        <MobileNavigation />
      </LhrV2Shell>
    </MainLayout>
  )
}
