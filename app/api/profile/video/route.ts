import { del, put } from '@vercel/blob'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { validateProfileVideo } from '@/lib/video-upload-validation'

export async function POST (request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user?.id) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('video')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Aucune vidéo sélectionnée' }, { status: 400 })
  }

  const validation = await validateProfileVideo(file)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const previous = await sql`
    SELECT intro_video_url FROM user_profiles WHERE user_id = ${user.id}
  `

  try {
    const blob = await put(
      `profile-videos/${user.id}-${Date.now()}.${validation.video.extension}`,
      file,
      { access: 'public', contentType: validation.video.mimeType }
    )

    await sql`
      UPDATE user_profiles
      SET intro_video_url = ${blob.url}, intro_video_updated_at = NOW()
      WHERE user_id = ${user.id}
    `

    const previousUrl = previous[0]?.intro_video_url
    if (previousUrl && previousUrl !== blob.url) {
      await del(previousUrl).catch(() => undefined)
    }

    return NextResponse.json({ success: true, url: blob.url })
  } catch (error) {
    console.error('Profile video upload failed:', error)
    return NextResponse.json({ error: "Échec de l'enregistrement de la vidéo" }, { status: 500 })
  }
}

export async function DELETE () {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user?.id) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })

  const existing = await sql`
    SELECT intro_video_url FROM user_profiles WHERE user_id = ${user.id}
  `

  await sql`
    UPDATE user_profiles
    SET intro_video_url = NULL, intro_video_updated_at = NOW()
    WHERE user_id = ${user.id}
  `

  if (existing[0]?.intro_video_url) {
    await del(existing[0].intro_video_url).catch(() => undefined)
  }

  return NextResponse.json({ success: true })
}

