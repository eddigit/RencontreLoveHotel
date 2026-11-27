import { sql } from '@/lib/db'

let schemaPromise: Promise<void> | undefined

/** Allows the receipt actions to span an additive rolling database upgrade. */
export function ensureMessageDeliveryReceiptSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const columns = await sql.query<Array<{ present: boolean }>>(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'delivered_at'
        ) AS present`,
        []
      )
      if (!columns[0]?.present) {
        await sql.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ', [])
      }
    })().catch(error => {
      schemaPromise = undefined
      throw error
    })
  }
  return schemaPromise
}
