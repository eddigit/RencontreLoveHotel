import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sql } from '@/lib/db'
import { isJougPilotActive } from '@/lib/joug-pilot'

export async function POST() {
  if (!(await isJougPilotActive())) return new NextResponse(null, { status: 204 })

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse(null, { status: 401 })

  // Deliberately aggregate-only: no user id, referrer, IP, profile, or event row is stored.
  try {
    await sql.query(`INSERT INTO joug_pilot_daily_clicks (day, click_count) VALUES ((NOW() AT TIME ZONE 'Europe/Paris')::date, 1) ON CONFLICT (day) DO UPDATE SET click_count = joug_pilot_daily_clicks.click_count + 1`)
  } catch {
    // Analytics must never interfere with voluntary navigation.
  }

  return new NextResponse(null, { status: 204 })
}
