import type { Metadata } from 'next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import { sql } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserProfileEditor } from '@/components/UserProfileEditor'
import { PreferencesEditor } from '@/components/PreferencesEditor'
import { UserPhotosManager } from '@/components/UserPhotosManager'
import { PrivateAlbumManager } from '@/components/private-album-manager'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Camera, CalendarHeart, HeartHandshake, Sparkles, UserRound, Wine } from 'lucide-react'
import { calculateProfileCompletion } from '@/lib/profile-completion'
import { enforceMemberContent } from '@/lib/content-safety-service'
import { getOwnEmailPreferences, updateOwnEmailPreferences } from '@/actions/email-preference-actions'
import { EmailPreferencesEditor } from '@/components/email-preferences-editor'
import { bdsmRoleOptions, relationshipIntentOptions, seekingProfileTypeOptions } from '@/lib/member-profile-types'
import { PhotoVerificationRequest } from '@/components/photo-verification-request'
import { getOwnPhotoVerificationRequest, withdrawPhotoVerificationRequest } from '@/actions/photo-verification-actions'
import { getOwnPostMeetingWords, getReceivedPostMeetingWords, respondToPostMeetingWord, withdrawPostMeetingWord } from '@/actions/post-meeting-word-actions'
import { PostMeetingWordInbox } from '@/components/post-meeting-word'
import { ensureProfileLikesDislikesSchema, normalizeProfileTags, parseProfileTags } from '@/lib/profile-likes-dislikes'

export const metadata: Metadata = {
  title: 'Profil | Love Hotel Rencontre',
  description: 'Gérez votre profil Love Hotel Rencontre'
}

async function updateUserProfile (userData: any) {
  'use server'

  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user) {
    redirect('/login')
  }
  await ensureProfileLikesDislikesSchema()
  const likes = normalizeProfileTags(userData.likes)
  const dislikes = normalizeProfileTags(userData.dislikes)

  await enforceMemberContent({
    actorUserId: String(user.id),
    surface: 'profile',
    content: [userData.name, userData.location, userData.bio, ...likes, ...dislikes]
      .filter(Boolean)
      .join('\n')
  })

  const normalizeSelection = (value: unknown, allowed: readonly { value: string }[]) => {
    if (!Array.isArray(value)) return null
    const allowedValues = new Set(allowed.map(option => option.value))
    return Array.from(new Set(value.map(String).filter(item => allowedValues.has(item))))
  }
  const seekingProfileTypes = normalizeSelection(userData.seekingProfileTypes, seekingProfileTypeOptions)
  const relationshipIntents = normalizeSelection(userData.relationshipIntents, relationshipIntentOptions)
  const bdsmRoles = normalizeSelection(userData.bdsmRoles, bdsmRoleOptions)
  const bdsmRolesPublic = typeof userData.bdsmRolesPublic === 'boolean' ? userData.bdsmRolesPublic : null

  // Update user table
  await sql`
    UPDATE users
    SET name = ${userData.name}
    WHERE id = ${user.id}
  `

  // Update or insert user_profile
  const existingProfile = await sql`
    SELECT * FROM user_profiles WHERE user_id = ${user.id}
  `

  if (existingProfile.length > 0) {
    await sql`
      UPDATE user_profiles
      SET
        status = ${userData.status || null},
        age = ${userData.age || null},
        location = ${userData.location || null},
        orientation = ${userData.orientation || null},
        bio = ${userData.bio || null},
        gender = ${userData.gender || null},
        birthday = ${userData.birthday ? userData.birthday : null},
        interests = ${JSON.stringify(userData.interests || [])},
        likes = ${JSON.stringify(likes)},
        dislikes = ${JSON.stringify(dislikes)},
        seeking_profile_types = COALESCE(${seekingProfileTypes}::text[], seeking_profile_types),
        relationship_intents = COALESCE(${relationshipIntents}::text[], relationship_intents),
        bdsm_roles = COALESCE(${bdsmRoles}::text[], bdsm_roles),
        bdsm_roles_public = COALESCE(${bdsmRolesPublic}::boolean, bdsm_roles_public),
        display_profile = ${
          typeof userData.display_profile === 'boolean'
            ? userData.display_profile
            : true
        }
      WHERE user_id = ${user.id}
    `
  } else {
    await sql`
      INSERT INTO user_profiles (id, user_id, age, orientation, location, bio, gender, birthday, interests, likes, dislikes, status, featured, display_profile, seeking_profile_types, relationship_intents, bdsm_roles, bdsm_roles_public)
      VALUES (gen_random_uuid(), ${user.id}, ${userData.age || null}, ${
      userData.orientation || null
    }, ${userData.location || null}, ${userData.bio || null}, ${
      userData.gender || null
    }, ${userData.birthday ? userData.birthday : null}, ${JSON.stringify(
      userData.interests || []
    )}, ${JSON.stringify(likes)}, ${JSON.stringify(dislikes)}, ${userData.status || 'single_male'}, false, ${
      typeof userData.display_profile === 'boolean'
        ? userData.display_profile
        : true
      }, ${seekingProfileTypes ?? []}, ${relationshipIntents ?? []}, ${bdsmRoles ?? []}, ${bdsmRolesPublic ?? false})
    `
  }
}

async function updateUserPreferences (preferencesData: any) {
  'use server'

  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user) {
    redirect('/login')
  }

  await enforceMemberContent({
    actorUserId: String(user.id),
    surface: 'profile',
    content: [
      preferencesData.preferences?.suggestions,
      preferencesData.meetingTypes?.specific_preferences
    ].filter(Boolean).join('\n')
  })

  // Update or insert user_preferences
  const existingPreferences = await sql`
    SELECT * FROM user_preferences WHERE user_id = ${user.id}
  `

  if (existingPreferences.length > 0) {
    await sql`
      UPDATE user_preferences
      SET
        interested_in_restaurant = ${preferencesData.preferences.interested_in_restaurant},
        interested_in_events = ${preferencesData.preferences.interested_in_events},
        interested_in_dating = ${preferencesData.preferences.interested_in_dating},
        prefer_curtain_open = ${preferencesData.preferences.prefer_curtain_open},
        interested_in_lolib = ${preferencesData.preferences.interested_in_lolib},
        suggestions = ${preferencesData.preferences.suggestions}
      WHERE user_id = ${user.id}
    `
  } else {
    await sql`
      INSERT INTO user_preferences (
        id, user_id, interested_in_restaurant, interested_in_events, interested_in_dating, prefer_curtain_open, interested_in_lolib, suggestions
      ) VALUES (
        gen_random_uuid(), ${user.id}, ${preferencesData.preferences.interested_in_restaurant}, ${preferencesData.preferences.interested_in_events}, ${preferencesData.preferences.interested_in_dating}, ${preferencesData.preferences.prefer_curtain_open}, ${preferencesData.preferences.interested_in_lolib}, ${preferencesData.preferences.suggestions}
      )
    `
  }

  // Update or insert user_meeting_types
  const existingMeetingTypes = await sql`
    SELECT * FROM user_meeting_types WHERE user_id = ${user.id}
  `

  if (existingMeetingTypes.length > 0) {
    await sql`
      UPDATE user_meeting_types
      SET
        friendly = ${preferencesData.meetingTypes.friendly},
        romantic = ${preferencesData.meetingTypes.romantic},
        playful = ${preferencesData.meetingTypes.playful},
        open_curtains = ${preferencesData.meetingTypes.open_curtains},
        libertine = ${preferencesData.meetingTypes.libertine},
        open_to_other_couples = ${preferencesData.meetingTypes.open_to_other_couples},
        specific_preferences = ${preferencesData.meetingTypes.specific_preferences}
      WHERE user_id = ${user.id}
    `
  } else {
    await sql`
      INSERT INTO user_meeting_types (
        id, user_id, friendly, romantic, playful, open_curtains, libertine, open_to_other_couples, specific_preferences
      ) VALUES (
        gen_random_uuid(), ${user.id}, ${preferencesData.meetingTypes.friendly}, ${preferencesData.meetingTypes.romantic}, ${preferencesData.meetingTypes.playful}, ${preferencesData.meetingTypes.open_curtains}, ${preferencesData.meetingTypes.libertine}, ${preferencesData.meetingTypes.open_to_other_couples}, ${preferencesData.meetingTypes.specific_preferences}
      )
    `
  }

  // Update or insert user_additional_options
  const existingAdditionalOptions = await sql`
    SELECT * FROM user_additional_options WHERE user_id = ${user.id}
  `

  if (existingAdditionalOptions.length > 0) {
    await sql`
      UPDATE user_additional_options
      SET
        join_exclusive_events = ${preferencesData.additionalOptions.join_exclusive_events},
        premium_access = ${preferencesData.additionalOptions.premium_access}
      WHERE user_id = ${user.id}
    `
  } else {
    await sql`
      INSERT INTO user_additional_options (
        id, user_id, join_exclusive_events, premium_access
      ) VALUES (
        gen_random_uuid(), ${user.id}, ${preferencesData.additionalOptions.join_exclusive_events}, ${preferencesData.additionalOptions.premium_access}
      )
    `
  }
}

export default async function ProfilePage ({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const requestedTab = (await searchParams)?.tab
  const activeTab = requestedTab === 'preferences' || requestedTab === 'photos' || requestedTab === 'emails'
    ? requestedTab
    : 'profile'
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user // Renamed to avoid conflict
  if (!sessionUser) {
    redirect('/login')
  }

  // Fetch the latest user data directly from the database
  const dbUserResult = await sql`
    SELECT id, name, email, avatar, role
    FROM users
    WHERE id = ${sessionUser.id}
  `
  const dbUser = dbUserResult.length > 0 ? dbUserResult[0] : null

  if (!dbUser) {
    // This case should ideally not happen if the user has a valid session
    console.error('User from session not found in database for profile page.')
    redirect('/login') // Or an error page
    return null // Return null to stop execution if redirecting
  }

  // Get user profile data from user_profiles table
  const profiles = await sql`
    SELECT up.*
    FROM user_profiles up
    WHERE up.user_id = ${dbUser.id} -- Use dbUser.id for consistency
  `

  const profile = profiles.length > 0 ? profiles[0] : {}

  let formattedBirthday = ''
  if (profile.birthday) {
    try {
      // Assuming profile.birthday might be a Date object or an ISO string like YYYY-MM-DDTHH:mm:ss.sssZ
      const date = new Date(profile.birthday)
      if (!isNaN(date.getTime())) {
        // Check if date is valid
        formattedBirthday = date.toISOString().split('T')[0]
      } else if (
        typeof profile.birthday === 'string' &&
        profile.birthday.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        // If it's already a YYYY-MM-DD string from the DB (less common for DATE type, but possible)
        formattedBirthday = profile.birthday
      }
    } catch (error) {
      console.error('Error formatting birthday for display:', error)
      // Keep formattedBirthday as "" or handle error appropriately
    }
  }

  // Helper to ensure all fields are present
  function normalizePreferences (obj: any) {
    return {
      interested_in_restaurant: obj?.interested_in_restaurant ?? false,
      interested_in_events: obj?.interested_in_events ?? false,
      interested_in_dating: obj?.interested_in_dating ?? false,
      prefer_curtain_open: obj?.prefer_curtain_open ?? false,
      interested_in_lolib: obj?.interested_in_lolib ?? false,
      suggestions: obj?.suggestions ?? ''
    }
  }
  function normalizeMeetingTypes (obj: any) {
    return {
      friendly: obj?.friendly ?? false,
      romantic: obj?.romantic ?? false,
      playful: obj?.playful ?? false,
      open_curtains: obj?.open_curtains ?? false,
      libertine: obj?.libertine ?? false,
      open_to_other_couples: obj?.open_to_other_couples ?? false,
      specific_preferences: obj?.specific_preferences ?? ''
    }
  }
  function normalizeAdditionalOptions (obj: any) {
    return {
      join_exclusive_events: obj?.join_exclusive_events ?? false,
      premium_access: obj?.premium_access ?? false
    }
  }

  const userData = {
    id: dbUser.id, // Use id from dbUser
    name: dbUser.name, // Use name from dbUser
    email: dbUser.email, // Use email from dbUser
    avatar: dbUser.avatar, // CRITICAL: Use avatar from dbUser
    role: dbUser.role, // <-- Add role to userData
    bio: profile.bio,
    status: profile.status,
    age: profile.age,
    location: profile.location,
    orientation: profile.orientation,
    gender: profile.gender,
    birthday: formattedBirthday, // Use the formatted birthday string
    interests:
      typeof profile.interests === 'string'
        ? JSON.parse(profile.interests)
        : profile.interests || [],
    likes: parseProfileTags(profile.likes),
    dislikes: parseProfileTags(profile.dislikes),
    seekingProfileTypes: Array.isArray(profile.seeking_profile_types) ? profile.seeking_profile_types : [],
    relationshipIntents: Array.isArray(profile.relationship_intents) ? profile.relationship_intents : [],
    bdsmRoles: Array.isArray(profile.bdsm_roles) ? profile.bdsm_roles : [],
    bdsmRolesPublic: profile.bdsm_roles_public === true,
    display_profile:
      typeof profile.display_profile === 'boolean'
        ? profile.display_profile
        : true // propagate display_profile
  }

  // Fetch user preferences
  const preferencesResult = await sql`
    SELECT * FROM user_preferences WHERE user_id = ${dbUser.id}
  `
  const preferences = normalizePreferences(
    preferencesResult.length > 0 ? preferencesResult[0] : {}
  )

  // Fetch user meeting types
  const meetingTypesResult = await sql`
    SELECT * FROM user_meeting_types WHERE user_id = ${dbUser.id}
  `
  const meetingTypes = normalizeMeetingTypes(
    meetingTypesResult.length > 0 ? meetingTypesResult[0] : {}
  )

  // Fetch user additional options
  const additionalOptionsResult = await sql`
    SELECT * FROM user_additional_options WHERE user_id = ${dbUser.id}
  `
  const additionalOptions = normalizeAdditionalOptions(
    additionalOptionsResult.length > 0 ? additionalOptionsResult[0] : {}
  )

  const emailPreferences = await getOwnEmailPreferences().catch(() => null)
  const photoVerificationRequest = await getOwnPhotoVerificationRequest().catch(() => null)
  const [ownPostMeetingWords, receivedPostMeetingWords] = await Promise.all([getOwnPostMeetingWords().catch(() => []), getReceivedPostMeetingWords().catch(() => [])])
  const photoVerificationIdentityKind = profile.status || profile.gender
    ? (String(profile.status || profile.gender).toLowerCase().includes('couple') ? 'couple' : 'solo')
    : null

  // Fetch user photos
  const photosResult = await sql`
    SELECT * FROM photos WHERE user_id = ${dbUser.id} ORDER BY created_at ASC
  `
  const userPhotos = photosResult.map((p: any) => ({
    id: p.id,
    url: p.url,
    is_primary: p.is_primary
  }))

  const profileCompletion = calculateProfileCompletion({
    name: userData.name,
    avatar: userData.avatar,
    age: userData.age,
    location: userData.location,
    status: userData.status,
    orientation: userData.orientation,
    gender: userData.gender,
    bio: userData.bio,
    interests: userData.interests,
    photoCount: userPhotos.length,
    hasDatingPreference: Boolean(preferences.interested_in_dating || preferences.interested_in_events),
    hasMeetingIntent: Boolean(meetingTypes.romantic || meetingTypes.playful || meetingTypes.libertine || meetingTypes.open_curtains)
  })
  const profileScore = profileCompletion.score

  return (
    <MainLayout user={dbUser}>
      <LhrV2Shell
        user={dbUser}
        eyebrow='Espace membre'
        title='Profil matching'
        subtitle='Renseignez les champs qui améliorent la compatibilité, les demandes de match et les invitations Love Hotel.'
        action={
          <Button asChild className='bg-graphite text-graphite-ink hover:bg-graphite-hover'>
            <Link href='/discover'>
              <Sparkles className='mr-2 h-4 w-4' />
              Voir la communauté
            </Link>
          </Button>
        }
      >
        <div className='-m-3 min-w-0 bg-[#04070b] p-3 text-[#ecebe7] sm:-m-4 sm:p-4 lg:-m-5 lg:p-5'>
        <div className='grid min-w-0 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_300px]'>
          <aside className='space-y-4'>
            <div className='rounded-2xl border border-[#111821] bg-[#0a0f15] p-5'>
              <div className='flex items-center gap-3'>
                <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-[#04070b]'>
                  <UserRound className='h-6 w-6 text-[#d6bc87]' />
                </div>
                <div>
                  <h2 className='font-black'>{dbUser.name}</h2>
                  <p className='text-xs text-[#d6bc87]'>Profil actif</p>
                </div>
              </div>
              <div className='mt-5'>
                <div className='flex items-end justify-between'>
                  <span className='text-sm text-[#c9c7c2]'>Score profil</span>
                  <span className='text-4xl font-black'>{profileScore}%</span>
                </div>
                <div className='mt-3 h-2 rounded-full bg-[#111821]'>
                  <div
                    className='h-full rounded-full bg-[#d6bc87]'
                    style={{ width: `${profileScore}%` }}
                  />
                </div>
                {profileCompletion.nextActions.length > 0 && (
                  <p className='mt-3 text-xs leading-5 text-[#c9c7c2]'>
                    Prochaine étape : {profileCompletion.nextActions[0]}
                  </p>
                )}
              </div>
            </div>

            <div className='rounded-2xl border border-[#111821] bg-[#0a0f15] p-5'>
              <h3 className='font-black'>Ce qui aide à matcher</h3>
              <div className='mt-4 flex flex-wrap gap-2'>
                <Badge className='rounded-full bg-[#282b31] text-[#fff8e8]'>Statut clair</Badge>
                <Badge className='rounded-full bg-[#282b31] text-[#fff8e8]'>Photos récentes</Badge>
                <Badge className='rounded-full bg-[#282b31] text-[#fff8e8]'>Intentions</Badge>
                <Badge className='rounded-full bg-[#282b31] text-[#fff8e8]'>Disponibilités</Badge>
                <Badge className='rounded-full bg-[#282b31] text-[#fff8e8]'>Rideaux ouverts</Badge>
              </div>
            </div>
          </aside>

          <section className='min-w-0'>
            <Tabs
              key={activeTab}
              defaultValue={activeTab}
              className='w-full'
            >
              <TabsList className='mb-5 grid h-auto w-full grid-cols-2 rounded-2xl border border-[#111821] bg-[#0a0f15] p-1 sm:grid-cols-4'>
                <TabsTrigger value='profile' className='min-w-0 rounded-xl px-2 text-xs text-[#c9c7c2] data-[state=active]:bg-graphite data-[state=active]:text-graphite-ink sm:text-sm'>
                  Profil
                </TabsTrigger>
                <TabsTrigger value='preferences' className='min-w-0 rounded-xl px-2 text-xs text-[#c9c7c2] data-[state=active]:bg-graphite data-[state=active]:text-graphite-ink sm:text-sm'>
                  Matching
                </TabsTrigger>
                <TabsTrigger value='photos' className='min-w-0 rounded-xl px-2 text-xs text-[#c9c7c2] data-[state=active]:bg-graphite data-[state=active]:text-graphite-ink sm:text-sm'>
                  Médias
                </TabsTrigger>
                <TabsTrigger value='emails' className='min-w-0 rounded-xl px-2 text-xs text-[#c9c7c2] data-[state=active]:bg-graphite data-[state=active]:text-graphite-ink sm:text-sm'>
                  Notifications
                </TabsTrigger>
              </TabsList>
          <TabsContent value='profile'>
            <div className='space-y-6'>
              <section className='rounded-2xl border border-[#d6bc87]/25 bg-graphite p-4'>
                <h3 className='font-black'>Un profil plus rassurant</h3>
                <p className='mt-1 text-sm text-[#c9c7c2]'>Ajoutez une vérification privée, sans publication de votre preuve.</p>
                <a href='#photo-verification' className='mt-3 inline-flex rounded-xl bg-graphite px-4 py-2 text-sm font-bold text-graphite-ink hover:bg-graphite-hover'>Faire vérifier mon profil</a>
              </section>
              <div id='photo-verification' className='scroll-mt-6'>
                <PhotoVerificationRequest
                  request={photoVerificationRequest}
                  identityKind={photoVerificationIdentityKind}
                  pseudonym={dbUser.name || 'Membre'}
                  onWithdraw={withdrawPhotoVerificationRequest}
                />
              </div>
              <Link href='/discover#visites' className='inline-flex rounded-lg px-3 py-2 font-semibold text-[#d6bc87] hover:underline'>Qui a visité mon profil ?</Link>
              <PostMeetingWordInbox received={receivedPostMeetingWords} authored={ownPostMeetingWords} onRespond={respondToPostMeetingWord} onWithdraw={withdrawPostMeetingWord} />
              <UserProfileEditor
                user={userData}
                onSave={updateUserProfile}
              />
            </div>
          </TabsContent>
          <TabsContent value='preferences'>
            <div className='rounded-2xl border border-[#3b3b38] bg-[#1a1c21] p-4 sm:p-6'>
              <h3 className='text-lg font-black'>Préférences de rencontre</h3>
              {/* PreferencesEditor will handle the form for preferences and meeting types */}
              <PreferencesEditor
                preferences={preferences}
                meetingTypes={meetingTypes}
                additionalOptions={additionalOptions}
                onSave={updateUserPreferences}
              />
            </div>
          </TabsContent>
          <TabsContent value='photos'>
            <div className='min-w-0 rounded-2xl border border-[#3b3b38] bg-[#1a1c21] p-4 sm:p-6'>
              <PrivateAlbumManager />
              {userPhotos.length > 0 && (
                <section className='mt-6'>
                  <h3 className='mb-4 flex items-center gap-2 text-lg font-black'>
                    <Camera className='h-5 w-5 text-[#e3bf80]' /> Photos ajoutées précédemment
                  </h3>
                  <UserPhotosManager userId={String(dbUser.id)} photos={userPhotos} maxPhotos={10} allowUpload={false} />
                </section>
              )}
            </div>
          </TabsContent>
          <TabsContent value='emails'>
            <div className='min-w-0 rounded-2xl border border-[#3b3b38] bg-[#1a1c21] p-4 sm:p-6'>
              <h3 className='text-lg font-black'>Préférences e-mail</h3>
              {emailPreferences ? <EmailPreferencesEditor
                preferences={emailPreferences}
                onSave={updateOwnEmailPreferences}
              /> : <p role="alert">Impossible de charger vos préférences e-mail. Actualisez la page pour réessayer.</p>}
            </div>
          </TabsContent>
        </Tabs>
          </section>

          <aside className='space-y-4'>
            <div className='rounded-2xl border border-[#6c5735] bg-[#292928] p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <Wine className='h-4 w-4 text-[#e3bf80]' />
                Love Rooms
              </h3>
              <p className='mt-3 text-sm leading-6 text-[#d7cfbf]'>
                Vos préférences aident à proposer une chambre, un apéro jacuzzi ou une bouteille de champagne au bon moment.
              </p>
              <Button asChild variant='outline' className='mt-4 w-full border-[#6c5735] bg-[#121317] text-[#fff8e8]'>
                <Link href='/love-rooms'>Voir les expériences</Link>
              </Button>
            </div>

            <div className='rounded-2xl border border-[#3b3b38] bg-[#1a1c21] p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <CalendarHeart className='h-4 w-4 text-[#e3bf80]' />
                Événements
              </h3>
              <p className='mt-3 text-sm leading-6 text-[#d7cfbf]'>
                Activez les bons champs pour remonter dans les recommandations d’apéros, soirées et rideaux ouverts.
              </p>
              <Button asChild variant='outline' className='mt-4 w-full border-[#3b3b38] bg-[#121317] text-[#fff8e8]'>
                <Link href='/events'>Voir l’agenda</Link>
              </Button>
            </div>

            <div className='rounded-2xl border border-[#3b3b38] bg-[#292928] p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <HeartHandshake className='h-4 w-4 text-[#e3bf80]' />
                Règle d’échange
              </h3>
              <p className='mt-3 text-sm leading-6 text-[#d7cfbf]'>
                Les messages restent ouverts uniquement après match accepté. Le profil sert donc à obtenir des demandes qualifiées.
              </p>
            </div>

            <div className='text-center'>
              <a href='/unsubscribe' className='text-sm text-[#f1a6a0] underline hover:text-[#ffd0cb]'>
                Se désinscrire / Supprimer mon compte
              </a>
            </div>
          </aside>
        </div>
        </div>
      </LhrV2Shell>
    </MainLayout>
  )
}
