import type { Metadata } from 'next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import { sql } from '@/lib/db'
import { put } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserProfileEditor } from '@/components/UserProfileEditor'
import { PreferencesEditor } from '@/components/PreferencesEditor'
import { UserPhotosManager } from '@/components/UserPhotosManager'
import { ProfileVideoManager } from '@/components/ProfileVideoManager'
import { LhrV2Shell } from '@/components/lhr-v2-shell'
import { MobileNavigation } from '@/components/mobile-navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Camera, CalendarHeart, HeartHandshake, Sparkles, UserRound, Wine } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Profil | Love Hotel Rencontre',
  description: 'Gérez votre profil Love Hotel Rencontre'
}

// Add this server action for handling profile image uploads
async function uploadProfileImage (formData: FormData) {
  'use server'

  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user) {
    redirect('/login')
  }

  const file = formData.get('profileImage') as File

  if (!file || file.size === 0) {
    return { error: 'Aucun fichier sélectionné' }
  }

  try {
    // Upload to Vercel Blob
    const blob = await put(
      `user-photos/${user.id}-${Date.now()}.${file.name.split('.').pop()}`,
      file,
      {
        access: 'public'
      }
    )

    // Update the photo column in the users table
    await sql`
      UPDATE users
      SET avatar = ${blob.url}
      WHERE id = ${user.id}
    `

    revalidatePath('/profile')
    return { success: true, url: blob.url }
  } catch (error) {
    console.error('Error uploading image:', error)
    return { error: "Échec du téléchargement de l'image" }
  }
}

async function updateUserProfile (userData: any) {
  'use server'

  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user) {
    redirect('/login')
  }

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
        display_profile = ${
          typeof userData.display_profile === 'boolean'
            ? userData.display_profile
            : true
        }
      WHERE user_id = ${user.id}
    `
  } else {
    await sql`
      INSERT INTO user_profiles (id, user_id, age, orientation, location, bio, gender, birthday, interests, status, featured, display_profile)
      VALUES (gen_random_uuid(), ${user.id}, ${userData.age || null}, ${
      userData.orientation || null
    }, ${userData.location || null}, ${userData.bio || null}, ${
      userData.gender || null
    }, ${userData.birthday ? userData.birthday : null}, ${JSON.stringify(
      userData.interests || []
    )}, ${userData.status || 'single_male'}, false, ${
      typeof userData.display_profile === 'boolean'
        ? userData.display_profile
        : true
    })
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

// Add server actions for user photos
async function uploadUserPhoto (formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user) redirect('/login')
  const file = formData.get('photo') as File
  if (!file || file.size === 0) return { error: 'Aucun fichier sélectionné' }
  try {
    const blob = await put(
      `user-photos/${user.id}-${Date.now()}.${file.name.split('.').pop()}`,
      file,
      { access: 'public' }
    )
    // Count current photos
    const countRes =
      await sql`SELECT COUNT(*) FROM photos WHERE user_id = ${user.id}`
    if (parseInt(countRes[0].count) >= 10)
      return { error: 'Maximum 10 photos autorisées' }
    // Insert photo
    await sql`
      INSERT INTO photos (user_id, url, is_primary)
      VALUES (${user.id}, ${blob.url}, false)
    `
    revalidatePath('/profile')
    return { success: true, url: blob.url }
  } catch (error) {
    console.error('Error uploading photo:', error)
    return { error: 'Échec du téléchargement de la photo' }
  }
}

async function deleteUserPhoto (photoId: string) {
  'use server'
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user) redirect('/login')
  // Only allow deleting user's own photo
  await sql`DELETE FROM photos WHERE id = ${photoId} AND user_id = ${user.id}`
  revalidatePath('/profile')
  return { success: true }
}

export default async function ProfilePage () {
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

  // Fetch user photos
  const photosResult = await sql`
    SELECT * FROM photos WHERE user_id = ${dbUser.id} ORDER BY created_at ASC
  `
  const userPhotos = photosResult.map((p: any) => ({
    id: p.id,
    url: p.url,
    is_primary: p.is_primary
  }))

  const completionItems = [
    Boolean(userData.avatar),
    Boolean(userData.name),
    Boolean(userData.status),
    Boolean(userData.age),
    Boolean(userData.orientation),
    Boolean(userData.gender),
    Boolean(userData.bio),
    userData.interests.length > 0,
    Boolean(preferences.interested_in_dating || preferences.interested_in_events),
    Boolean(meetingTypes.romantic || meetingTypes.playful || meetingTypes.libertine || meetingTypes.open_curtains),
    userPhotos.length > 0,
    Boolean(profile.intro_video_url)
  ]
  const profileScore = Math.round(
    (completionItems.filter(Boolean).length / completionItems.length) * 100
  )

  return (
    <MainLayout user={dbUser}>
      <LhrV2Shell
        user={dbUser}
        eyebrow='Espace membre'
        title='Profil matching'
        subtitle='Renseignez les champs qui améliorent la compatibilité, les demandes de match et les invitations Love Hotel.'
        action={
          <Button asChild className='bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] text-white'>
            <Link href='/discover'>
              <Sparkles className='mr-2 h-4 w-4' />
              Voir la communauté
            </Link>
          </Button>
        }
      >
        <div className='grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_300px]'>
          <aside className='space-y-4'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <div className='flex items-center gap-3'>
                <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff3b8b]/18'>
                  <UserRound className='h-6 w-6 text-[#ff8cc8]' />
                </div>
                <div>
                  <h2 className='font-black'>{dbUser.name}</h2>
                  <p className='text-xs text-[#94ffc9]'>Profil actif</p>
                </div>
              </div>
              <div className='mt-5'>
                <div className='flex items-end justify-between'>
                  <span className='text-sm text-white/58'>Score profil</span>
                  <span className='text-4xl font-black'>{profileScore}%</span>
                </div>
                <div className='mt-3 h-2 rounded-full bg-white/10'>
                  <div
                    className='h-full rounded-full bg-gradient-to-r from-[#ff3b8b] to-[#94ffc9]'
                    style={{ width: `${profileScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='font-black'>Ce qui aide à matcher</h3>
              <div className='mt-4 flex flex-wrap gap-2'>
                <Badge className='rounded-full bg-white/10 text-white'>Statut clair</Badge>
                <Badge className='rounded-full bg-white/10 text-white'>Photos récentes</Badge>
                <Badge className='rounded-full bg-white/10 text-white'>Intentions</Badge>
                <Badge className='rounded-full bg-white/10 text-white'>Disponibilités</Badge>
                <Badge className='rounded-full bg-white/10 text-white'>Rideaux ouverts</Badge>
              </div>
            </div>
          </aside>

          <section>
            <Tabs defaultValue='profile' className='w-full'>
              <TabsList className='mb-5 grid h-auto grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.04] p-1'>
                <TabsTrigger value='profile' className='rounded-xl data-[state=active]:bg-[#ff4fa3] data-[state=active]:text-white'>
                  Identité
                </TabsTrigger>
                <TabsTrigger value='preferences' className='rounded-xl data-[state=active]:bg-[#ff4fa3] data-[state=active]:text-white'>
                  Matching
                </TabsTrigger>
                <TabsTrigger value='photos' className='rounded-xl data-[state=active]:bg-[#ff4fa3] data-[state=active]:text-white'>
                  Médias
                </TabsTrigger>
              </TabsList>
          <TabsContent value='profile'>
            <div className='space-y-6'>
              <UserProfileEditor
                user={userData}
                onSave={updateUserProfile}
                onUploadImage={uploadProfileImage}
              />
            </div>
          </TabsContent>
          <TabsContent value='preferences'>
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-6'>
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
            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-6'>
              <h3 className='mb-4 flex items-center gap-2 text-lg font-black'>
                <Camera className='h-5 w-5 text-[#ff8cc8]' />
                Mes photos
              </h3>
              {/* UserPhotosManager handles upload/delete UI */}
              <UserPhotosManager photos={userPhotos} maxPhotos={10} />
              <ProfileVideoManager initialUrl={profile.intro_video_url} />
            </div>
          </TabsContent>
        </Tabs>
          </section>

          <aside className='space-y-4'>
            <div className='rounded-2xl border border-[#ff8cc8]/20 bg-[#ff3b8b]/12 p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <Wine className='h-4 w-4 text-[#ff8cc8]' />
                Love Rooms
              </h3>
              <p className='mt-3 text-sm leading-6 text-white/64'>
                Vos préférences aident à proposer une chambre, un apéro jacuzzi ou une bouteille de champagne au bon moment.
              </p>
              <Button asChild variant='outline' className='mt-4 w-full border-white/12 bg-white/[0.04]'>
                <Link href='/love-rooms'>Voir les expériences</Link>
              </Button>
            </div>

            <div className='rounded-2xl border border-[#94ffc9]/20 bg-[#94ffc9]/10 p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <CalendarHeart className='h-4 w-4 text-[#94ffc9]' />
                Événements
              </h3>
              <p className='mt-3 text-sm leading-6 text-white/64'>
                Activez les bons champs pour remonter dans les recommandations d’apéros, soirées et rideaux ouverts.
              </p>
              <Button asChild variant='outline' className='mt-4 w-full border-white/12 bg-white/[0.04]'>
                <Link href='/events'>Voir l’agenda</Link>
              </Button>
            </div>

            <div className='rounded-2xl border border-white/10 bg-white/[0.045] p-5'>
              <h3 className='flex items-center gap-2 font-black'>
                <HeartHandshake className='h-4 w-4 text-[#ffd166]' />
                Règle d’échange
              </h3>
              <p className='mt-3 text-sm leading-6 text-white/64'>
                Les messages restent ouverts uniquement après match accepté. Le profil sert donc à obtenir des demandes qualifiées.
              </p>
            </div>

            <div className='text-center'>
              <Link
                href='/email-preferences'
                className='mb-3 block text-sm text-[#94ffc9] underline hover:text-white'
              >
                Gérer mes préférences email
              </Link>
              <a href='/unsubscribe' className='text-sm text-red-200 underline hover:text-red-100'>
                Se désinscrire / Supprimer mon compte
              </a>
            </div>
          </aside>
        </div>
        <MobileNavigation />
      </LhrV2Shell>
    </MainLayout>
  )
}
