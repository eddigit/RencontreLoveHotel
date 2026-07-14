import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { validateImageUploadFile } from '@/lib/upload-validation'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('photo') as File
  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: 'Aucun fichier sélectionné' },
      { status: 400 }
    )
  }

  const validation = await validateImageUploadFile(file)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const blob = await put(
      `event-photos/${user.id}-${Date.now()}.${validation.extension}`,
      file,
      { access: 'public' }
    )
    return NextResponse.json({ success: true, url: blob.url })
  } catch (error) {
    return NextResponse.json(
      { error: "Échec du téléchargement de la photo de l'événement" },
      { status: 500 }
    )
  }
}
