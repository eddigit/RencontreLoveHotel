import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { photoId } = await req.json()
  if (!photoId) return NextResponse.json({ error: 'Missing photoId' }, { status: 400 })

  try {
    await sql`DELETE FROM photos WHERE id = ${photoId} AND user_id = ${user.id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Échec de la suppression de la photo" }, { status: 500 })
  }
}
