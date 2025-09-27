import {
  getUserProfile,
  getMatchStatus,
  sendMatchRequest,
  acceptMatchRequest,
  declineMatchRequest
} from '@/actions/user-actions'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  Users
} from 'lucide-react'
import Image from 'next/image'
import { MobileNavigation } from '@/components/mobile-navigation'
import { Button } from '@/components/ui/button'
import { ProfileMessageForm } from '@/components/profile-message-form'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { MatchRequestButton } from '@/components/match-request-button'
import MainLayout from '@/components/layout/main-layout'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { findOrCreateConversation } from '@/actions/conversation-actions'
import { redirect } from 'next/navigation'
import { UserGallery } from '@/components/UserGallery'

// Add type for the session user
type SessionUser = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
  avatar?: string
  onboardingCompleted?: boolean
}

export default async function ProfilePage ({
  params
}: {
  params: { id: string }
}) {
  // Properly await the params object
  const { id } = await params

  // Validate that id is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!id || !uuidRegex.test(id)) {
    console.error('Invalid user ID format:', id)
    notFound()
  }

  // Fetch user profile by ID
  const userProfileData = await getUserProfile(id)
  if (!userProfileData || !userProfileData.user) {
    notFound()
  }

  const user = userProfileData.user
  // Use user.user_id for the real user's id, user.profile_id for the profile row's id
  console.log(
    '[ProfilePage] params.id:',
    id,
    'user.user_id:',
    user.user_id,
    'user.profile_id:',
    user.profile_id
  )
  const profile = userProfileData.user
  const preferences = userProfileData.preferences
  // Use avatar or fallback
  const avatar = user.avatar || '/placeholder.svg'

  // Format birthday if present
  let formattedBirthday = ''
  if (profile.birthday) {
    try {
      const date = new Date(profile.birthday)
      if (!isNaN(date.getTime())) {
        formattedBirthday = date.toISOString().split('T')[0]
      } else if (
        typeof profile.birthday === 'string' &&
        profile.birthday.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        formattedBirthday = profile.birthday
      }
    } catch {}
  }

  // Get the current session user
  const session = await getServerSession(authOptions)
  const currentUser = session?.user as SessionUser
  let matchStatus: any = null
  let isRequester = false
  if (currentUser?.id && currentUser.id !== user.user_id) {
    matchStatus = await getMatchStatus(
      String(currentUser.id),
      String(user.user_id)
    )
    isRequester = matchStatus && matchStatus.user_id_1 === currentUser.id
  }

  return (
    <MainLayout session={session} user={currentUser}>
      <div className='min-h-screen flex flex-col pb-16 md:pb-0'>
        <div className='relative'>
          <div className='h-40 md:h-60 w-full bg-gradient-to-r from-[#1a0d2e] to-[#3d1155]'></div>
          <div className='absolute top-4 left-4 z-10'>
            <Link href='/discover'>
              <Button
                variant='ghost'
                size='icon'
                className='rounded-full bg-black/20 backdrop-blur-sm text-white'
              >
                <ArrowLeft className='h-5 w-5' />
              </Button>
            </Link>
          </div>
          <div className='container relative'>
            <div className='absolute -top-16 md:-top-20 left-1/2 transform -translate-x-1/2 flex flex-col items-center'>
              <div className='relative'>
                <div className='w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-background overflow-hidden shadow-lg shadow-purple-900/30'>
                  <Image
                    src={avatar}
                    alt={user.name}
                    width={160}
                    height={160}
                    className='object-cover'
                  />
                </div>
              </div>
              <h1 className='mt-2 text-2xl font-bold'>
                {user.name}
                {profile.age ? `, ${profile.age}` : ''}
              </h1>
              <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                <MapPin className='h-3 w-3' />
                <span>{profile.location || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className='container mt-24 md:mt-28 py-6 flex-1'>
          <Tabs defaultValue='about' className='w-full'>
            <TabsList className='mb-6'>
              <TabsTrigger value='about'>À propos</TabsTrigger>
              <TabsTrigger value='galerie'>Galerie</TabsTrigger>
            </TabsList>
            <TabsContent value='about'>
              <Card className='mb-6 border-0 bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm shadow-lg shadow-purple-900/20'>
                <CardContent className='p-6'>
                  <div className='space-y-4'>
                    <div>
                      <h3 className='font-semibold mb-1'>À propos de moi</h3>
                      <p className='text-muted-foreground'>
                        {profile.bio || ''}
                      </p>
                    </div>
                    <div>
                      <h3 className='font-semibold mb-2'>Intérêts</h3>
                      <div className='flex flex-wrap gap-2'>
                        {(Array.isArray(profile.interests)
                          ? profile.interests
                          : []
                        ).map((interest: string) => (
                          <Badge
                            key={interest}
                            variant='secondary'
                            className='bg-[#ff3b8b]/20 text-[#ff8cc8] hover:bg-[#ff3b8b]/30'
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {formattedBirthday && (
                      <div>
                        <h3 className='font-semibold mb-2'>
                          Date de naissance
                        </h3>
                        <div className='text-muted-foreground'>
                          {formattedBirthday}
                        </div>
                      </div>
                    )}
                    {profile.gender && (
                      <div>
                        <h3 className='font-semibold mb-2'>Genre</h3>
                        <div className='text-muted-foreground'>
                          {profile.gender}
                        </div>
                      </div>
                    )}
                    {profile.orientation && (
                      <div>
                        <h3 className='font-semibold mb-2'>Orientation</h3>
                        <div className='text-muted-foreground'>
                          {profile.orientation}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Match logic UI */}
                  {currentUser && currentUser.id !== user.user_id && (
                    <div className='mt-6'>
                      {matchStatus === null && (
                        <MatchRequestButton
                          currentUserId={String(currentUser.id)}
                          profileUserId={String(user.user_id)}
                        />
                      )}
                      {matchStatus &&
                        matchStatus.status === 'pending' &&
                        isRequester && (
                          <Button disabled className='bg-gray-400'>
                            Demande envoyée (en attente)
                          </Button>
                        )}
                      {matchStatus &&
                        matchStatus.status === 'pending' &&
                        !isRequester && (
                          <div className='flex gap-2'>
                            <form
                              action={async () => {
                                'use server'
                                const accepted = await acceptMatchRequest(
                                  matchStatus.user_id_1,
                                  matchStatus.user_id_2
                                )
                                if (accepted?.success) {
                                  const conversationId =
                                    await findOrCreateConversation(
                                      matchStatus.user_id_2,
                                      matchStatus.user_id_1
                                    )
                                  if (conversationId) {
                                    redirect(`/messages/${conversationId}`)
                                  }
                                }
                              }}
                            >
                              <Button type='submit' className='bg-green-500'>
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
                              <Button type='submit' className='bg-red-500'>
                                Refuser
                              </Button>
                            </form>
                          </div>
                        )}
                      {matchStatus && matchStatus.status === 'accepted' && (
                        <ProfileMessageForm recipientId={user.user_id} />
                      )}
                      {matchStatus && matchStatus.status === 'rejected' && (
                        <span className='text-red-500'>Match refusé</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value='galerie'>
              <Card className='mb-6 border-0 bg-gradient-to-br from-[#2d1155]/70 to-[#3d1155]/50 backdrop-blur-sm shadow-lg shadow-purple-900/20'>
                <CardContent className='p-6'>
                  <h3 className='font-semibold mb-4'>Galerie photos</h3>
                  <UserGallery userId={user.user_id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <MobileNavigation />
      </div>
    </MainLayout>
  )
}
