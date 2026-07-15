import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { validateImageFile } from '@/lib/image-upload-validation'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user?.id) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('photo')

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Aucune image sélectionnée.' }, { status: 400 })
  }

  const validation = await validateImageFile(file)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const blob = await put(
      `event-covers/${user.id}/${crypto.randomUUID()}.${validation.image.extension}`,
      file,
      { access: 'public' }
    )

    return NextResponse.json({ success: true, url: blob.url })
  } catch (error) {
    console.error('Erreur upload couverture événement:', error)
    return NextResponse.json(
      { error: "La couverture n'a pas pu être téléversée." },
      { status: 500 }
    )
  }
}
