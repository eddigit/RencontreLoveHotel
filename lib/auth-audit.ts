import { sql } from '@/lib/db'

export interface AuthAuditEvent {
  userId?: string | null
  email?: string | null
  role?: string | null
  provider: string
  success: boolean
}

export async function recordAuthEvent(event: AuthAuditEvent): Promise<void> {
  const email = event.email?.trim().toLowerCase() || null

  try {
    await sql.query(
      `
        INSERT INTO auth_logs (user_id, email, level, event, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        event.userId || null,
        email,
        event.success ? 'info' : 'warn',
        event.success ? 'sign_in_success' : 'sign_in_failure',
        JSON.stringify({
          provider: event.provider,
          role: event.role || null
        })
      ]
    )
  } catch (error) {
    // L'authentification ne doit jamais être bloquée par le journal d'audit.
    console.warn("Impossible d'enregistrer l'événement d'authentification:", error)
  }
}
