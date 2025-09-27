import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Vérifier que l'URL de la base de données est configurée
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!databaseUrl) {
      console.error('Database URL not configured')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    const sql = neon(databaseUrl)
    
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
