'use server'

import { requireAdmin } from '@/lib/server-auth'
import { sql } from '@/lib/db'
import { getJougPilotConfig, JOUG_PILOT_DURATION_MS, type JougPilotConfig } from '@/lib/joug-pilot'

export type JougPilotAdminStatus = JougPilotConfig & { aggregateClicks: number | null }

async function ensureJougPilotSchema() {
  await sql.query('CREATE TABLE IF NOT EXISTS joug_pilot_state (singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton), starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, CHECK (ends_at > starts_at))')
  await sql.query('CREATE TABLE IF NOT EXISTS joug_pilot_daily_clicks (day DATE PRIMARY KEY, click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0))')
}

export async function getJougPilotAdminStatus(): Promise<JougPilotAdminStatus> {
  await requireAdmin()
  const pilot = await getJougPilotConfig()
  if (pilot.state === 'disabled') return { ...pilot, aggregateClicks: null }
  try {
    const rows = await sql.query<Array<{ aggregate_clicks: string }>>('SELECT COALESCE(SUM(click_count), 0)::text AS aggregate_clicks FROM joug_pilot_daily_clicks')
    return { ...pilot, aggregateClicks: Number(rows[0]?.aggregate_clicks || 0) }
  } catch {
    return { ...pilot, aggregateClicks: null }
  }
}

export async function startJougPilot(): Promise<JougPilotAdminStatus> {
  await requireAdmin()
  await ensureJougPilotSchema()
  const now = new Date()
  const endsAt = new Date(now.getTime() + JOUG_PILOT_DURATION_MS)
  await sql.query('INSERT INTO joug_pilot_state (singleton, starts_at, ends_at) VALUES (TRUE, $1, $2) ON CONFLICT (singleton) DO NOTHING', [now.toISOString(), endsAt.toISOString()])
  return getJougPilotAdminStatus()
}
