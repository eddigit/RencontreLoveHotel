import { sql } from '@/lib/db'

const DAY_MS = 24 * 60 * 60 * 1000
const TARGET_DURATION_MS = 30 * DAY_MS

export type JougPilotState = 'disabled' | 'active' | 'expired'
export type JougPilotConfig = { startAt: string | null; endAt: string | null; state: JougPilotState }

export async function getJougPilotConfig(now = new Date()): Promise<JougPilotConfig> {
  try {
    const rows = await sql.query<Array<{ starts_at: Date | string; ends_at: Date | string }>>('SELECT starts_at, ends_at FROM joug_pilot_state WHERE singleton = TRUE LIMIT 1')
    const pilot = rows[0]
    if (!pilot) return { startAt: null, endAt: null, state: 'disabled' }
    const end = new Date(pilot.ends_at)
    if (Number.isNaN(end.getTime())) return { startAt: null, endAt: null, state: 'disabled' }
    return { startAt: new Date(pilot.starts_at).toISOString(), endAt: end.toISOString(), state: now >= end ? 'expired' : 'active' }
  } catch {
    return { startAt: null, endAt: null, state: 'disabled' }
  }
}

export async function isJougPilotActive(now = new Date()) {
  return (await getJougPilotConfig(now)).state === 'active'
}

export const JOUG_PILOT_DURATION_MS = TARGET_DURATION_MS
