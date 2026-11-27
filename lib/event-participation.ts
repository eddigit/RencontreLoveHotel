import { randomUUID } from 'node:crypto'
import { withTransaction } from '@/lib/db'

export type EventSeatResult = 'joined' | 'already_joined' | 'full' | 'missing'

/**
 * Locks one event before taking a fresh participant count. All reservations
 * through this helper serialize on that row, including the last available
 * place under PostgreSQL's READ COMMITTED isolation.
 */
export async function reserveEventSeat(eventId: string, userId: string): Promise<EventSeatResult> {
  return withTransaction(async client => {
    const event = await client.query<{ id: string, max_participants: number | null }>(
      'SELECT id, max_participants FROM events WHERE id = $1 FOR UPDATE', [eventId]
    )
    if (!event.rows[0]) return 'missing'

    const existing = await client.query('SELECT 1 FROM event_participants WHERE event_id = $1 AND user_id = $2', [eventId, userId])
    if (existing.rowCount) return 'already_joined'

    const count = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM event_participants WHERE event_id = $1', [eventId])
    const capacity = event.rows[0].max_participants
    if (capacity !== null && Number(count.rows[0]?.count || 0) >= Number(capacity)) return 'full'

    const inserted = await client.query(
      `INSERT INTO event_participants (id, event_id, user_id, joined_at)
       VALUES ($1::uuid, $2, $3, NOW()) ON CONFLICT (event_id, user_id) DO NOTHING RETURNING id`,
      [randomUUID(), eventId, userId]
    )
    return inserted.rowCount ? 'joined' : 'already_joined'
  })
}
