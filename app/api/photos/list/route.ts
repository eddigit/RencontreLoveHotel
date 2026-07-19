import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Exécuter la requête avec gestion d'erreur
    const photos = await sql`SELECT id, url, is_primary FROM photos WHERE user_id = ${userId} ORDER BY created_at ASC`
    
    return NextResponse.json({ photos })
  } catch (error) {
    console.error('Error in photos/list API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
