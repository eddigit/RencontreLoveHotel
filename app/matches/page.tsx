'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { MobileNavigation } from '@/components/mobile-navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MatchScore } from '@/components/match-score'
import {
  MessageCircle,
  Heart,
  Calendar,
  X,
  UserCheck,
  Clock
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { type UserProfile } from '@/utils/matching-algorithm'
import { type OnboardingData } from '@/components/onboarding-form'
import { useAuth } from '@/contexts/auth-context'
import MainLayout from '@/components/layout/main-layout'
import { useRouter } from 'next/navigation'
import {
  getUserProfile,
  getUserMatches,
  getIncomingMatchRequests,
  getOutgoingMatchRequests, // Added
  removeMatch,
  declineMatchRequest
} from '@/actions/user-actions'

// Helper function to transform raw profile data to UserProfile type
const transformProfileData = (
  profileData: any, // Data from getUserProfile
  matchDetails?: { matchScore?: number | null } // Optional match-specific details
): UserProfile | null => {
  if (!profileData || !profileData.user) {
    return null
  }

  const {
    user,
    photos,
    preferences: dbPreferences,
    meetingTypes: dbMeetingTypes
  } = profileData

  // Define a type for the photo object if not already defined elsewhere
  type Photo = { url: string; is_primary: boolean; [key: string]: any }

  // Construct OnboardingData from dbPreferences and dbMeetingTypes
  const constructedPreferences: OnboardingData = {
    status: dbPreferences?.status || '',
    age: dbPreferences?.age || null, // This is preference age, UserProfile.age is actual age
    orientation: dbPreferences?.orientation || '',
    gender: dbPreferences?.gender || '',
    birthday: dbPreferences?.birthday || '', // This is user's birthday from preferences table

    interestedInRestaurant: dbPreferences?.interested_in_restaurant || false,
    interestedInEvents: dbPreferences?.interested_in_events || false,
    interestedInDating: dbPreferences?.interested_in_dating || false,
    preferCurtainOpen: dbPreferences?.prefer_curtain_open || false,
    interestedInLolib: dbPreferences?.interested_in_lolib || false,
    suggestions: dbPreferences?.suggestions || '',

    meetingTypes: {
      friendly: dbMeetingTypes?.friendly || false,
      romantic: dbMeetingTypes?.romantic || false,
      playful: dbMeetingTypes?.playful || false,
      openCurtains: dbMeetingTypes?.open_curtains || false,
      libertine: dbMeetingTypes?.libertine || false
    },
    openToOtherCouples: dbPreferences?.open_to_other_couples || false,
    specificPreferences: dbPreferences?.specific_preferences || '',

    joinExclusiveEvents: dbPreferences?.join_exclusive_events || false,
    premiumAccess: dbPreferences?.premium_access || false
  }

  return {
    id: user.user_id || user.id, // user.user_id from join, user.id if direct user object
    name: user.name || 'Unknown User',
    age: user.age, // Actual age from user_profiles table
    location: user.location || 'Unknown Location', // Actual location from user_profiles table
    image:
      user.avatar ||
      photos?.find((p: Photo) => p.is_primary)?.url ||
      '/placeholder.svg',
    online: user.online_status || false, // Assuming 'online_status' might exist on user object, else placeholder
    preferences: constructedPreferences,
    matchScore:
      matchDetails?.matchScore !== undefined
        ? matchDetails.matchScore
        : user.match_score || 0, // Use provided score or from user obj
    lastActive: user.last_active || undefined, // Assuming 'last_active' might exist
    featured: user.featured || false // Assuming 'featured' might exist
  }
}

export default function MatchesPage () {
  // Removed unused props
  const [activeTab, setActiveTab] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [matches, setMatches] = useState<UserProfile[]>([])
  const [pendingMatches, setPendingMatches] = useState<UserProfile[]>([]) // These are incoming
  const [outgoingPendingMatches, setOutgoingPendingMatches] = useState<
    UserProfile[]
  >([]) // Added for outgoing
  const { user: currentUser } = useAuth() // Renamed to avoid conflict with user in map
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser && currentUser.id) {
        setIsLoading(true)
        try {
          // Fetch accepted matches
          const acceptedMatchesData = await getUserMatches(currentUser.id)
          const acceptedProfilesPromises = acceptedMatchesData.map(
            async match => {
              const otherUserId =
                match.user_id_1 === currentUser.id
                  ? match.user_id_2
                  : match.user_id_1
              const profileData = await getUserProfile(otherUserId)
              return transformProfileData(profileData, {
                matchScore: match.match_score
              })
            }
          )
          const formattedAcceptedMatches = (
            await Promise.all(acceptedProfilesPromises)
          ).filter(p => p !== null) as UserProfile[]
          setMatches(formattedAcceptedMatches)

          // Fetch pending matches (incoming requests)
          const incomingRequestsData = await getIncomingMatchRequests(
            currentUser.id
          )
          const pendingProfilesPromises = incomingRequestsData.map(
            async request => {
              const requesterId = request.user_id_1 // user_id_1 is the requester
              const profileData = await getUserProfile(requesterId)
              return transformProfileData(profileData, {
                matchScore: request.match_score
              })
            }
          )
          const formattedPendingMatches = (
            await Promise.all(pendingProfilesPromises)
          ).filter(p => p !== null) as UserProfile[]
          setPendingMatches(formattedPendingMatches)

          // Fetch outgoing pending requests
          const outgoingRequestsData = await getOutgoingMatchRequests(
            currentUser.id
          )
          const outgoingProfilesPromises = outgoingRequestsData.map(
            async request => {
              // For outgoing requests, user_id_2 is the recipient
              const recipientId = request.user_id_2
              const profileData = await getUserProfile(recipientId)
              return transformProfileData(profileData, {
                matchScore: request.match_score
              })
            }
          )
          const formattedOutgoingPendingMatches = (
            await Promise.all(outgoingProfilesPromises)
          ).filter(p => p !== null) as UserProfile[]
          setOutgoingPendingMatches(formattedOutgoingPendingMatches)
        } catch (error) {
          console.error('Failed to fetch matches data:', error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
        setMatches([])
        setPendingMatches([])
        setOutgoingPendingMatches([]) // Added
      }
    }

    fetchData()
  }, [currentUser])

  const handleRemoveMatch = async (id: string) => {
    if (!currentUser || !currentUser.id) return
    try {
      const result = await removeMatch(currentUser.id, id)
      if (result.success) {
        setMatches(matches.filter(match => match.id !== id))
      } else {
        alert(result.error || 'Erreur lors de la suppression du match.')
      }
    } catch (err) {
      console.error('Error removing match:', err)
      alert('Erreur technique lors de la suppression du match.')
    }
  }

  const handleAcceptPending = async (profile: UserProfile) => {
    if (!currentUser || !currentUser.id || !profile || !profile.id) return
    try {
      const response = await fetch('/api/accept-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: profile.id,
          receiverId: currentUser.id
        })
      })
      const data = await response.json()
      if (data.success && data.conversationId) {
        setPendingMatches(pendingMatches.filter(p => p.id !== profile.id))
        // Add to matches list. The 'profile' object should now be complete.
        setMatches([...matches, profile])
        router.push(`/messages/${data.conversationId}`)
      } else {
        alert(data.error || "Erreur lors de l'acceptation du match.")
      }
    } catch (err) {
      console.error('Error accepting match:', err)
      alert("Erreur technique lors de l'acceptation du match.")
    }
  }

  const handleRejectPending = async (profileId: string) => {
    if (!currentUser || !currentUser.id) return
    try {
      // In declineMatchRequest, the first argument is the requesterId (profileId)
      // and the second is the receiverId (currentUser.id)
      const result = await declineMatchRequest(profileId, currentUser.id)
      if (result.success) {
        setPendingMatches(pendingMatches.filter(p => p.id !== profileId))
      } else {
        alert(result.error || 'Erreur lors du refus du match.')
      }
    } catch (err) {
      console.error('Error rejecting match:', err)
      alert('Erreur technique lors du refus du match.')
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen flex flex-col pb-16 md:pb-0 bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]'>
        <div className='container py-8 flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <div className='w-16 h-16 border-4 border-[#ff3b8b] border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
            <p className='text-white'>Chargement de vos matchs...</p>
          </div>
        </div>
        <MobileNavigation />
      </div>
    )
  }

  return (
    <MainLayout user={currentUser}>
      <div className='min-h-screen flex flex-col pb-16 md:pb-0 bg-gradient-to-br from-[#1a0d2e] to-[#3d1155]'>
        <div className='container py-4 md:py-6 flex-1'>
          <h1 className='text-2xl md:text-3xl font-bold mb-4 text-white'>
            Vos Matchs
          </h1>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='w-full'
          >
            <TabsList className='grid w-full grid-cols-3 mb-4 md:mb-6 bg-[#2d1155]/50'>
              {' '}
              {/* Changed grid-cols-2 to grid-cols-3 */}
              <TabsTrigger
                value='all'
                className='data-[state=active]:bg-[#ff3b8b] data-[state=active]:text-white'
              >
                Matchs ({matches.length})
              </TabsTrigger>
              <TabsTrigger
                value='pending'
                className='data-[state=active]:bg-[#ff3b8b] data-[state=active]:text-white'
              >
                En attente ({pendingMatches.length}) {/* This is incoming */}
              </TabsTrigger>
              <TabsTrigger
                value='outgoing-pending' /* Added new tab */
                className='data-[state=active]:bg-[#ff3b8b] data-[state=active]:text-white'
              >
                Mes demandes ({outgoingPendingMatches.length})
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode='wait'>
              <TabsContent key={activeTab} value='all' className='space-y-4'>
                {matches.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className='grid grid-cols-2 md:grid-cols-2 gap-4 w-full'
                  >
                    {matches.map((match, index) => (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <MatchCard
                          profile={match}
                          onRemove={() => handleRemoveMatch(match.id)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <EmptyState
                    icon={<Heart className='h-10 w-10 text-[#ff3b8b]/70' />}
                    title='Aucun match pour le moment'
                    description='Explorez la section Découvrir pour trouver des personnes qui vous correspondent'
                    action={
                      <Button
                        asChild
                        className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] hover:from-[#ff3b8b]/90 hover:to-[#ff8cc8]/90 text-white border-0'
                      >
                        <Link href='/discover'>Découvrir des profils</Link>
                      </Button>
                    }
                  />
                )}
              </TabsContent>

              <TabsContent
                key={`${activeTab}-pending`}
                value='pending'
                className='space-y-4'
              >
                {pendingMatches.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className='grid grid-cols-2 md:grid-cols-2 gap-4 w-full'
                  >
                    {pendingMatches.map((match, index) => (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <PendingMatchCard
                          profile={match}
                          onAccept={() => handleAcceptPending(match)}
                          onReject={() => handleRejectPending(match.id)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <EmptyState
                    icon={<Clock className='h-10 w-10 text-[#ff3b8b]/70' />}
                    title='Aucune demande en attente'
                    description='Revenez plus tard pour voir les nouvelles demandes de match'
                  />
                )}
              </TabsContent>

              <TabsContent
                key={`${activeTab}-outgoing-pending`} // Added new TabsContent for outgoing pending
                value='outgoing-pending'
                className='space-y-4'
              >
                {outgoingPendingMatches.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className='grid grid-cols-2 md:grid-cols-2 gap-4 w-full'
                  >
                    {outgoingPendingMatches.map((match, index) => (
                      <motion.div
                        key={match.id} // Assuming match.id is unique for the recipient's profile
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <PendingMatchCard
                          profile={match}
                          onAccept={() => {}}
                          onReject={() => {}}
                          isOutgoing={true}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <EmptyState
                    icon={<Clock className='h-10 w-10 text-[#ff3b8b]/70' />} // Consider a Send icon if available and desired
                    title='Aucune demande envoyée en attente'
                    description="Vos demandes envoyées qui n'ont pas encore été acceptées ou refusées apparaîtront ici."
                  />
                )}
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>

        <MobileNavigation />
      </div>
    </MainLayout>
  )
}

interface MatchCardProps {
  profile: UserProfile
  onRemove: () => void
}

function MatchCard ({ profile, onRemove }: MatchCardProps) {
  return (
    <Card className='overflow-hidden border-0 shadow-lg shadow-purple-900/20 bg-gradient-to-b from-[#2d1155]/90 to-[#1a0d2e]/90'>
      <CardContent className='p-0'>
        <div className='flex flex-col sm:flex-row'>
          <div className='relative w-full sm:w-1/3 aspect-square sm:aspect-auto'>
            <Image
              src={profile.image || '/placeholder.svg'}
              alt={profile.name}
              fill
              className='object-cover'
            />
            <div className='absolute top-2 left-2'>
              <MatchScore
                score={Math.round(profile.matchScore || 0)}
                size='md'
              />
            </div>
            {profile.online && (
              <Badge className='absolute bottom-2 right-2 bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] border-0 flex items-center gap-1.5 text-xs'>
                <span className='h-2 w-2 rounded-full bg-white animate-pulse'></span>
                LIVE
              </Badge>
            )}
          </div>
          <div className='p-4 flex-1 text-white'>
            <div className='flex justify-between items-start'>
              <div>
                <h3 className='font-bold text-lg'>
                  {profile.name}, {profile.age}
                </h3>
                <p className='text-sm text-purple-200/80'>{profile.location}</p>
              </div>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-purple-200/60 hover:text-white hover:bg-purple-900/30'
                onClick={onRemove}
              >
                <X className='h-4 w-4' />
                <span className='sr-only'>Supprimer</span>
              </Button>
            </div>

            <div className='mt-2 space-y-2'>
              <div className='flex items-center text-sm text-purple-200/80'>
                <UserCheck className='h-4 w-4 mr-2 text-[#ff3b8b]' />
                <span>Match depuis {profile.lastActive || '2 jours'}</span>
              </div>

              <div className='flex flex-wrap gap-1 mt-2'>
                {Object.entries(profile.preferences.meetingTypes)
                  .filter(([_, value]) => value)
                  .map(([key]) => (
                    <Badge
                      key={key}
                      variant='outline'
                      className='bg-purple-900/30 text-purple-100 border-purple-800/30 text-xs'
                    >
                      {key === 'friendly' && 'Amical'}
                      {key === 'romantic' && 'Romantique'}
                      {key === 'playful' && 'Ludique'}
                      {key === 'openCurtains' && 'Rideau ouvert'}
                      {key === 'libertine' && 'Libertin'}
                    </Badge>
                  ))}
              </div>
            </div>

            <div className='flex gap-2 mt-4'>
              <Button
                size='sm'
                className='flex-1 bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] hover:from-[#ff3b8b]/90 hover:to-[#ff8cc8]/90 text-white border-0'
                asChild
              >
                <Link href={`/messages/${profile.id}`}>
                  <MessageCircle className='h-4 w-4 mr-1' />
                  Message
                </Link>
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='flex-1 border-purple-800/30 bg-purple-900/20 text-white hover:bg-purple-900/40'
                asChild
              >
                <Link href={`/profile/${profile.name.toLowerCase()}`}>
                  Profil
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PendingMatchCardProps {
  profile: UserProfile
  onAccept: () => void // Will make these optional or conditional based on isOutgoing
  onReject: () => void // Will make these optional or conditional based on isOutgoing
  isOutgoing?: boolean // Added new optional prop
}

function PendingMatchCard ({
  profile,
  onAccept,
  onReject,
  isOutgoing // Added
}: PendingMatchCardProps) {
  console.log(
    'PendingMatchCard rendered with profile:',
    profile,
    'isOutgoing:',
    isOutgoing
  ) // Updated log
  return (
    <Card className='overflow-hidden border-0 shadow-lg shadow-purple-900/20 bg-gradient-to-b from-[#2d1155]/90 to-[#1a0d2e]/90'>
      <CardContent className='p-0'>
        <div className='flex flex-col sm:flex-row'>
          <div className='relative w-full sm:w-1/3 aspect-square sm:aspect-auto'>
            <Image
              src={profile.image || '/placeholder.svg'}
              alt={profile.name}
              fill
              className='object-cover'
            />
            <div className='absolute top-2 left-2'>
              <MatchScore
                score={Math.round(profile.matchScore || 0)}
                size='md'
              />
            </div>
          </div>
          <div className='p-4 flex-1 text-white'>
            <div className='flex justify-between items-start'>
              <div>
                <h3 className='font-bold text-lg'>
                  {profile.name}, {profile.age}
                </h3>
                <p className='text-sm text-purple-200/80'>{profile.location}</p>
              </div>
            </div>

            <div className='mt-2 space-y-2'>
              <div className='flex items-center text-sm text-purple-200/80'>
                <Calendar className='h-4 w-4 mr-2 text-[#ff3b8b]' />
                <span>
                  {isOutgoing
                    ? `Demande envoyée ${profile.lastActive || "aujourd\\'hui"}`
                    : `Demande reçue ${profile.lastActive || "aujourd\\'hui"}`}
                </span>
              </div>

              <div className='flex flex-wrap gap-1 mt-2'>
                {Object.entries(profile.preferences.meetingTypes)
                  .filter(([_, value]) => value)
                  .map(([key]) => (
                    <Badge
                      key={key}
                      variant='outline'
                      className='bg-purple-900/30 text-purple-100 border-purple-800/30 text-xs'
                    >
                      {key === 'friendly' && 'Amical'}
                      {key === 'romantic' && 'Romantique'}
                      {key === 'playful' && 'Ludique'}
                      {key === 'openCurtains' && 'Rideau ouvert'}
                      {key === 'libertine' && 'Libertin'}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Conditional rendering for buttons based on isOutgoing */}
            {!isOutgoing && (
              <div className='flex gap-2 mt-4'>
                <Button
                  size='sm'
                  className='flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90 text-white border-0'
                  onClick={onAccept}
                >
                  <Heart className='h-4 w-4 mr-1' />
                  Accepter
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  className='flex-1 border-purple-800/30 bg-purple-900/20 text-white hover:bg-purple-900/40'
                  onClick={onReject}
                >
                  <X className='h-4 w-4 mr-1' />
                  Refuser
                </Button>
              </div>
            )}

            {isOutgoing && (
              <div className='mt-4 text-sm text-purple-200/80'>
                <p>
                  Cette demande est en attente de réponse de la part de{' '}
                  {profile.name}.
                </p>
                {/* Optionally, add a "Cancel Request" button here in the future */}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

function EmptyState ({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className='flex flex-col items-center justify-center py-12 text-center'
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10, delay: 0.3 }}
        className='h-20 w-20 rounded-full bg-[#2d1155]/70 flex items-center justify-center mb-4'
      >
        {icon}
      </motion.div>
      <h3 className='font-semibold text-xl text-white'>{title}</h3>
      <p className='text-purple-200/80 mt-2 max-w-md'>{description}</p>
      {action && <div className='mt-6'>{action}</div>}
    </motion.div>
  )
}
